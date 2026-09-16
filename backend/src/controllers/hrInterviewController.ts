import { Request, Response } from 'express'
import { sendWorkflowToMake } from '../services/workflowOrchestrationService'
import { optionalString, requiredString, sanitizePayload } from '../services/workflowValidationService'

type ChatRole = 'assistant' | 'user'

interface ChatMessage {
  role: ChatRole
  content: string
}

const interviewStages = [
  'introduction',
  'experience',
  'skills',
  'scenarios',
  'conclusion',
] as const

const stageQuestions: Record<(typeof interviewStages)[number], string[]> = {
  introduction: [
    "Hello! I'm your AI HR interviewer. Could you please tell me your full name and what position you're applying for?",
    "Thank you! Can you tell me a bit about yourself - where you're from and what motivates you to work as a domestic worker?",
  ],
  experience: [
    'How many years have you worked as a domestic worker, and which countries have you worked in?',
    'Can you describe your most recent employment? What were your main duties?',
    'What was the most challenging situation you faced in your previous job?',
  ],
  skills: [
    'How would you rate your childcare experience, and can you give an example?',
    'Have you cared for elderly persons before? What tasks were you responsible for?',
    'What cuisines can you cook, and can you follow dietary restrictions?',
    'How would you handle a medical emergency?',
  ],
  scenarios: [
    'A toddler is having a tantrum while the baby is crying. How would you handle this?',
    'If your employer asked you to do something against your beliefs, how would you respond?',
    'You notice the elderly person seems confused one morning. What steps would you take?',
  ],
  conclusion: [
    'Do you have any questions for me about the role or the agency?',
    "That concludes our interview. I'll now evaluate your responses.",
  ],
}

const allQuestions = interviewStages.flatMap((stage) =>
  stageQuestions[stage].map((question) => ({ stage, question }))
)

const evaluateResponse = (response: string, stage: string) => {
  const lower = response.toLowerCase()
  const length = response.trim().length
  let score = 50
  const notes: string[] = []

  if (length > 100) {
    score += 15
    notes.push('Detailed response')
  } else if (length > 50) {
    score += 10
    notes.push('Adequate response length')
  } else if (length < 20) {
    score -= 15
    notes.push('Very brief response')
  }

  if (stage === 'experience') {
    if (lower.includes('year')) {
      score += 10
      notes.push('Mentioned years of experience')
    }
    if (lower.includes('singapore') || lower.includes('hong kong')) {
      score += 10
      notes.push('International experience')
    }
  }

  if (stage === 'skills') {
    if (lower.includes('child') || lower.includes('baby')) {
      score += 10
      notes.push('Childcare experience')
    }
    if (lower.includes('elderly')) {
      score += 10
      notes.push('Elderly care experience')
    }
    if (lower.includes('cook')) {
      score += 10
      notes.push('Cooking skills')
    }
  }

  if (stage === 'scenarios') {
    if (lower.includes('calm') || lower.includes('patient')) {
      score += 10
      notes.push('Demonstrated patience')
    }
    if (lower.includes('safety') || lower.includes('safe')) {
      score += 10
      notes.push('Safety-conscious')
    }
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    notes: notes.join('; '),
  }
}

const buildResult = (scores: Array<{ score: number; notes: string }>) => {
  if (scores.length === 0) {
    return {
      overallScore: 0,
      recommendation: 'fail',
      summary: 'No responses evaluated.',
      strengths: [],
      weaknesses: ['No responses provided'],
    }
  }

  const overallScore = Math.round(scores.reduce((sum, item) => sum + item.score, 0) / scores.length)
  const recommendation = overallScore >= 70 ? 'pass' : overallScore >= 50 ? 'borderline' : 'fail'
  const strengths = scores
    .flatMap((item) => item.notes.split('; ').filter(Boolean))
    .filter((value, index, list) => list.indexOf(value) === index)
    .slice(0, 5)
  const weaknesses = overallScore < 50 ? ['Overall score below threshold'] : []

  return {
    overallScore,
    recommendation,
    summary: `Scored ${overallScore}/100 across ${scores.length} responses. ${
      recommendation === 'pass'
        ? 'Demonstrates sufficient experience.'
        : recommendation === 'borderline'
        ? 'Shows potential but needs training.'
        : 'Insufficient experience.'
    }`,
    strengths,
    weaknesses,
  }
}

const getMessages = (value: unknown): ChatMessage[] => {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is ChatMessage => {
      const candidate = item as Partial<ChatMessage>
      return (
        candidate &&
        (candidate.role === 'assistant' || candidate.role === 'user') &&
        typeof candidate.content === 'string'
      )
    })
    .slice(-30)
}

const parseMakeResponse = (body: string) => {
  if (!body.trim()) return {}
  try {
    const parsed = JSON.parse(body) as Record<string, unknown>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export const hrInterviewChat = async (req: Request, res: Response) => {
  try {
    const messages = getMessages(req.body.messages)
    const candidateMessages = messages.filter(
      (message) =>
        message.role === 'user' &&
        !/ready to start the interview/i.test(message.content)
    )
    const lastAnswer = candidateMessages.at(-1)?.content ?? ''
    const answeredCount = candidateMessages.length
    const currentQuestion = allQuestions[Math.max(0, answeredCount - 1)]
    const fallbackStage = optionalString(req.body.currentStage) || 'introduction'
    const evaluation = lastAnswer
      ? evaluateResponse(lastAnswer, currentQuestion?.stage ?? fallbackStage)
      : { score: 0, notes: '' }

    const scores = candidateMessages.map((message, index) =>
      evaluateResponse(message.content, allQuestions[index]?.stage ?? 'introduction')
    )
    const next = allQuestions[answeredCount]

    if (!next) {
      res.status(200).json({
        evaluation,
        nextQuestion: null,
        stage: 'conclusion',
        isComplete: true,
        result: buildResult(scores),
      })
      return
    }

    res.status(200).json({
      evaluation,
      nextQuestion: next.question,
      stage: next.stage,
      isComplete: false,
      result: null,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to run HR interview'
    res.status(500).json({ error: message })
  }
}

export const hrInterviewSession = async (req: Request, res: Response) => {
  try {
    const applicationId = requiredString(req.body.applicationId, 'applicationId', 200)
    const rating = typeof req.body.rating === 'number' ? req.body.rating : null
    const recommendation = optionalString(req.body.recommendation, 50) || 'pending'
    const summary = optionalString(req.body.summary, 4000)

    res.status(200).json({
      workflow: 'interview_pipeline',
      intent: 'hr_interview',
      fallbackUsed: false,
      data: {
        applicationId,
        stage: recommendation,
        rating,
        recommendation,
        summary,
        makeTriggered: false,
        makeDelivery: null,
        updatedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save interview session'
    res.status(/required/i.test(message) ? 400 : 500).json({ error: message })
  }
}

export const hrInterviewEmail = async (req: Request, res: Response) => {
  try {
    const payload = {
      ...sanitizePayload(req.body),
      to: requiredString(req.body.to, 'to', 300),
      candidateName: requiredString(req.body.candidateName, 'candidateName', 200),
      position: requiredString(req.body.position, 'position', 300),
      type: requiredString(req.body.type, 'type', 80),
      source: optionalString(req.body.source, 80) || 'ai_hr_interviewer',
      requestedAt: new Date().toISOString(),
    }

    const result = await sendWorkflowToMake({
      scenario: 'interview_pipeline',
      payload,
    })

    const responseData = parseMakeResponse(result.delivery.responseBody)

    res.status(result.ok ? 200 : 502).json({
      ok: result.ok,
      makeTriggered: result.ok,
      makeDelivery: result.delivery,
      meetLink:
        responseData.meetLink ||
        responseData.googleMeetLink ||
        responseData.hangoutLink ||
        req.body.meetLink ||
        null,
      eventId: responseData.eventId || responseData.id || null,
      eventUrl: responseData.eventUrl || responseData.htmlLink || null,
      error: result.ok ? null : result.delivery.error || 'Make.com failed',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send interview email'
    res.status(/required/i.test(message) ? 400 : 500).json({ error: message })
  }
}
