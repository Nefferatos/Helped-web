import { createWorkflowMatchRecordsStore } from '../store/workflowStore'
import { MatchCriteria } from '../types/workflow'
import { runSemanticMatchingAgent } from '../agents/matchingAgent'

export const runMatchingWorkflow = async (criteria: MatchCriteria) => {
  const result = await runSemanticMatchingAgent(criteria)
  const topMatches = result.matches.slice(0, 3)

  const storedMatches = await createWorkflowMatchRecordsStore(
    topMatches.map((match) => ({
      leadId: criteria.leadId ?? null,
      inquiryId: criteria.inquiryId ?? null,
      employerId: criteria.employerId ?? null,
      maidId: match.maidId,
      maidReferenceCode: match.maidReferenceCode,
      maidName: match.maidName,
      score: match.score,
      reasons: match.reasons,
    }))
  )

  return {
    screening: result.screening,
    vectorSearch: result.vectorSearch,
    aiUsed: result.aiUsed,
    fallbackUsed: result.fallbackUsed,
    matches: storedMatches,
  }
}
