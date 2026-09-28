import { Request, Response } from 'express'
import { sendWorkflowToMake } from '../services/workflowOrchestrationService'
import { sendToMakeWebhook } from '../services/workflowMakeService'
import { optionalString, requiredString, sanitizePayload } from '../services/workflowValidationService'
import { query, sql } from '../db'
import { getRequestAgencyId } from '../auth'
import { recordWorkflowEvent } from '../services/eventService'

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
      // WEBSITE AI WORKFLOW uses `scenario` to choose its email route.
      // Keep it inside the webhook body as well as the delivery log label.
      payload: { ...payload, scenario: 'interview_pipeline' },
      // Prefer the shared WEBSITE AI WORKFLOW webhook when it is configured.
      // The dedicated HR webhook remains a backwards-compatible fallback.
      url:
        process.env.MAKE_WEBHOOK_URL?.trim() ||
        process.env.MAKE_WEBHOOK_URL_INTERVIEW_PIPELINE?.trim(),
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

export const scheduleInterview = async (req: Request, res: Response) => {
  try {
    const agencyId = await getRequestAgencyId(req)
    const scheduledAt = requiredString(req.body.scheduledAt, 'scheduledAt', 80)
    if (Number.isNaN(Date.parse(scheduledAt))) return res.status(400).json({ error: 'scheduledAt must be a valid date' })
    const applicationId = optionalString(req.body.applicationId, 200)
    const placementId = optionalString(req.body.placementId, 80)
    const result = await query(sql`
      INSERT INTO public.interviews (agency_id, application_id, placement_id, scheduled_at, duration_minutes, mode, meeting_url, notes)
      VALUES (${agencyId}, ${applicationId || null}, ${placementId || null}::uuid, ${scheduledAt}::timestamptz, ${Number(req.body.durationMinutes) || 30}, ${optionalString(req.body.mode, 20) || 'video'}, ${optionalString(req.body.meetingUrl, 1000) || null}, ${optionalString(req.body.notes, 4000) || ''})
      RETURNING id, scheduled_at, application_id, placement_id
    `)
    const interview = result.rows[0]
    // The staff alert is sent after Make returns the Google Meet link, not here.
    // This prevents an incomplete alert with only internal database identifiers.
    void recordWorkflowEvent({ eventType: 'interview.schedule_saved', entityType: 'interview', entityId: String(interview.id), actor: 'user:recruiter', payload: { applicationId, placementId, scheduledAt: interview.scheduled_at } })
    res.status(201).json({ interview })
  } catch (error) { console.error('Error scheduling interview:', error); res.status(500).json({ error: 'Failed to schedule interview' }) }
}

// Make creates the Google Meet URL after the initial schedule record exists.
// Store that returned URL on the same interview instead of creating a duplicate.
export const saveInterviewMeetingLink = async (req: Request, res: Response) => {
  try {
    const agencyId = await getRequestAgencyId(req)
    const interviewId = requiredString(req.params.interviewId, 'interviewId', 100)
    const meetingUrl = requiredString(req.body.meetingUrl, 'meetingUrl', 1000)
    const candidateName = optionalString(req.body.candidateName, 200)
    const candidateEmail = optionalString(req.body.candidateEmail, 300)
    const scheduledDate = optionalString(req.body.scheduledDate, 30)
    const scheduledTime = optionalString(req.body.scheduledTime, 30)
    const interviewMode = optionalString(req.body.interviewMode, 40) || 'video'
    const result = await query(sql`
      UPDATE public.interviews
      SET meeting_url = ${meetingUrl}
      WHERE id = ${interviewId} AND agency_id = ${agencyId}
      RETURNING id, scheduled_at, application_id, meeting_url
    `)
    if (!result.rows[0]) return res.status(404).json({ error: 'Interview was not found' })
    const interview = result.rows[0]
    const alert = await sendToMakeWebhook({
      scenario: 'INTERVIEW_SCHEDULED_ALERT',
      payload: {
        event_type: 'interview.scheduled',
        interview_id: interview.id,
        application_id: interview.application_id || '',
        candidate_name: candidateName || 'Applicant',
        candidate_email: candidateEmail || '',
        scheduled_at: interview.scheduled_at,
        scheduled_date: scheduledDate || '',
        scheduled_time: scheduledTime || '',
        interview_mode: interviewMode,
        meeting_url: meetingUrl,
      },
    })
    void recordWorkflowEvent({
      eventType: 'interview.meeting_created',
      entityType: 'interview',
      entityId: String(interview.id),
      actor: 'make:interview_pipeline',
      payload: { applicationId: interview.application_id, scheduledAt: interview.scheduled_at, meetingUrl, staffAlertSent: alert.ok },
      status: alert.ok ? 'completed' : 'failed',
    })
    res.status(200).json({ interview, staffAlertSent: alert.ok })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save Google Meet link'
    res.status(/required/i.test(message) ? 400 : 500).json({ error: message })
  }
}
