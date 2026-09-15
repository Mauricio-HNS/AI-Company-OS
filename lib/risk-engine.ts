export type RiskInputs = {
  impact: number
  reversibility: number
  blastRadius: number
}

export type RiskAssessment = RiskInputs & {
  score: number
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  requiresApproval: boolean
}

function clamp(value: number) { return Math.max(0, Math.min(1, value)) }

export function calculateRisk(inputs: RiskInputs): RiskAssessment {
  const impact = clamp(inputs.impact)
  const reversibility = clamp(inputs.reversibility)
  const blastRadius = clamp(inputs.blastRadius)
  const score = impact * (1 - reversibility) * blastRadius
  const level = score >= 0.75 ? 'CRITICAL' : score >= 0.5 ? 'HIGH' : score >= 0.25 ? 'MEDIUM' : 'LOW'
  return { impact, reversibility, blastRadius, score, level, requiresApproval: level === 'HIGH' || level === 'CRITICAL' }
}
