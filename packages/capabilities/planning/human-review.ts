export type HumanReviewStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'EDITED'
  | 'INTERVENED'
  | 'ANALYSIS_REQUESTED'
  | 'DELETED'
  | 'BLOCKED'

export type ReviewOption = {
  id: string
  title: string
  summary: string
  details: string[]
  expectedImpact?: string
  risks: string[]
  cost?: string
  dependencies: string[]
  confidence?: number
}

export type HumanReview = {
  id: string
  companyId: string
  agentId: string
  problem: string
  context: string[]
  options: ReviewOption[]
  recommendedOptionId?: string
  status: HumanReviewStatus
  createdAt: string
  decidedAt?: string
  decisionNote?: string
}

export type ReviewBlock = {
  id: string
  companyId: string
  agentId?: string
  scope: 'IDEA' | 'PLAN' | 'AGENT'
  fingerprint: string
  reason: string
  createdAt: string
  active: boolean
}

export function createHumanReview(input: Omit<HumanReview, 'status'>): HumanReview {
  if (!input.companyId.trim()) throw new Error('companyId is required')
  if (!input.agentId.trim()) throw new Error('agentId is required')
  if (!input.problem.trim()) throw new Error('problem is required')
  if (input.options.length === 0) throw new Error('at least one review option is required')
  if (input.recommendedOptionId && !input.options.some(option => option.id === input.recommendedOptionId)) {
    throw new Error('recommendedOptionId must reference an existing option')
  }

  return { ...input, status: 'PENDING' }
}

export function acceptReview(
  review: HumanReview,
  optionId: string,
  note?: string,
): HumanReview {
  assertOption(review, optionId)
  return { ...review, status: 'ACCEPTED', recommendedOptionId: optionId, decidedAt: new Date().toISOString(), decisionNote: note }
}

export function editReview(
  review: HumanReview,
  optionId: string,
  note: string,
): HumanReview {
  assertOption(review, optionId)
  return { ...review, status: 'EDITED', recommendedOptionId: optionId, decidedAt: new Date().toISOString(), decisionNote: note }
}

export function interveneInReview(review: HumanReview, note: string): HumanReview {
  if (!note.trim()) throw new Error('intervention note is required')
  return { ...review, status: 'INTERVENED', decidedAt: new Date().toISOString(), decisionNote: note }
}

export function requestMoreAnalysis(review: HumanReview, note?: string): HumanReview {
  return { ...review, status: 'ANALYSIS_REQUESTED', decidedAt: new Date().toISOString(), decisionNote: note }
}

export function deleteReview(review: HumanReview, note?: string): HumanReview {
  return { ...review, status: 'DELETED', decidedAt: new Date().toISOString(), decisionNote: note }
}

export function blockReviewTarget(review: HumanReview, block: ReviewBlock): HumanReview {
  if (!block.active) throw new Error('block must be active')
  return { ...review, status: 'BLOCKED', decidedAt: new Date().toISOString(), decisionNote: block.reason }
}

function assertOption(review: HumanReview, optionId: string): void {
  if (!review.options.some(option => option.id === optionId)) {
    throw new Error(`Unknown review option: ${optionId}`)
  }
}
