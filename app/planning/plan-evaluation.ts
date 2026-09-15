/**
 * AI Company OS — Plan Evaluation
 *
 * The AI is allowed to think, compare alternatives and recommend a plan.
 * This evaluator makes the reasoning visible before execution.
 *
 * Scores are advisory. They NEVER grant authority. The Policy Engine remains
 * the technical authority boundary and owner approval is still required when
 * a plan crosses a protected boundary.
 */

export const PLAN_EVALUATION_VERSION = '1.0';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type PlanRecommendation = 'APPROVE' | 'APPROVE_WITH_RESTRICTIONS' | 'REVIEW' | 'REJECT';

export interface PlanEvaluationInput {
  planId: string;
  title: string;
  companyId: string;
  estimatedCost: number;
  expectedReturn: number;
  estimatedDays: number;
  probabilityOfSuccess: number;
  dependencies: number;
  failureModes: number;
  reversibility: 'LOW' | 'MEDIUM' | 'HIGH';
  risks: {
    financial: RiskLevel;
    operational: RiskLevel;
    legal: RiskLevel;
    security: RiskLevel;
    privacy: RiskLevel;
    reputation: RiskLevel;
    ethical: RiskLevel;
  };
  compatibleWithGoals: boolean;
  alternativeAvailable: boolean;
}

export interface PlanEvaluation {
  planId: string;
  version: string;
  successScore: number;
  overallRisk: RiskLevel;
  recommendation: PlanRecommendation;
  roiMultiple: number;
  expectedNetValue: number;
  factors: {
    feasibility: number;
    financial: number;
    operational: number;
    security: number;
    reversibility: number;
    strategicAlignment: number;
  };
  warnings: string[];
  alternativesRecommended: boolean;
  requiresHumanReview: boolean;
}

const riskWeight: Record<RiskLevel, number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  CRITICAL: 3,
};

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function highestRisk(risks: PlanEvaluationInput['risks']): RiskLevel {
  const score = Math.max(...Object.values(risks).map((risk) => riskWeight[risk]));
  return score === 3 ? 'CRITICAL' : score === 2 ? 'HIGH' : score === 1 ? 'MEDIUM' : 'LOW';
}

export function evaluatePlan(input: PlanEvaluationInput): PlanEvaluation {
  const expectedNetValue = input.expectedReturn - input.estimatedCost;
  const roiMultiple = input.estimatedCost > 0 ? input.expectedReturn / input.estimatedCost : 0;
  const overallRisk = highestRisk(input.risks);

  const feasibility = clamp(
    input.probabilityOfSuccess - input.dependencies * 3 - input.failureModes * 2,
  );
  const financial = clamp(50 + Math.min(50, roiMultiple * 20) - riskWeight[input.risks.financial] * 18);
  const operational = clamp(85 - riskWeight[input.risks.operational] * 20 - input.dependencies * 4);
  const security = clamp(100 - riskWeight[input.risks.security] * 30);
  const reversibility = input.reversibility === 'HIGH' ? 90 : input.reversibility === 'MEDIUM' ? 65 : 30;
  const strategicAlignment = input.compatibleWithGoals ? 95 : 20;

  const successScore = Math.round(
    feasibility * 0.25 +
      financial * 0.15 +
      operational * 0.15 +
      security * 0.15 +
      reversibility * 0.1 +
      strategicAlignment * 0.2,
  );

  const warnings: string[] = [];
  if (!input.compatibleWithGoals) warnings.push('Plan is not aligned with current company goals.');
  if (input.risks.legal === 'HIGH' || input.risks.legal === 'CRITICAL') warnings.push('Legal review recommended.');
  if (input.risks.security === 'HIGH' || input.risks.security === 'CRITICAL') warnings.push('Security review required.');
  if (input.risks.privacy === 'HIGH' || input.risks.privacy === 'CRITICAL') warnings.push('Privacy review required.');
  if (input.risks.reputation === 'HIGH' || input.risks.reputation === 'CRITICAL') warnings.push('Reputation impact requires review.');
  if (input.reversibility === 'LOW') warnings.push('Failure may be difficult or expensive to reverse.');
  if (input.failureModes >= 5) warnings.push('Plan has multiple identified failure modes.');
  if (input.estimatedDays > 30) warnings.push('Execution horizon is longer than 30 days.');

  const requiresHumanReview =
    overallRisk === 'CRITICAL' ||
    input.risks.legal === 'HIGH' ||
    input.risks.legal === 'CRITICAL' ||
    input.risks.security === 'CRITICAL' ||
    !input.compatibleWithGoals;

  let recommendation: PlanRecommendation = 'APPROVE';
  if (overallRisk === 'CRITICAL' || successScore < 35) recommendation = 'REJECT';
  else if (requiresHumanReview || overallRisk === 'HIGH' || successScore < 60) recommendation = 'REVIEW';
  else if (overallRisk === 'MEDIUM' || warnings.length > 0) recommendation = 'APPROVE_WITH_RESTRICTIONS';

  return {
    planId: input.planId,
    version: PLAN_EVALUATION_VERSION,
    successScore,
    overallRisk,
    recommendation,
    roiMultiple: Number(roiMultiple.toFixed(2)),
    expectedNetValue,
    factors: {
      feasibility: Math.round(feasibility),
      financial: Math.round(financial),
      operational: Math.round(operational),
      security: Math.round(security),
      reversibility,
      strategicAlignment,
    },
    warnings,
    alternativesRecommended: input.alternativeAvailable || overallRisk === 'HIGH' || overallRisk === 'CRITICAL',
    requiresHumanReview,
  };
}
