/**
 * AI Company OS — Opportunity Evaluation
 *
 * REVIEW_REQUIRED means "do not execute yet", not "discard the idea".
 * This evaluator decides whether an unauthorized idea is worth proposing.
 * It never grants authority and never overrides a hard policy block.
 */

import type { PolicyDecision } from '../security/policy-engine';
import type { RiskLevel } from '../core/domain-model';

export type OpportunityRecommendation = 'PROPOSE' | 'NEEDS_MORE_DATA' | 'OWNER_REVIEW' | 'HARD_BLOCK';

export interface OpportunityEvaluationInput {
  policyDecision: PolicyDecision;
  businessBenefit: number;
  strategicAlignment: number;
  operationalImpact: number;
  financialImpact: number;
  reversibility: number;
  evidenceConfidence: number;
  conflicts: string[];
  dependencies: string[];
  risks: {
    financial: RiskLevel;
    operational: RiskLevel;
    legal: RiskLevel;
    security: RiskLevel;
    privacy: RiskLevel;
    reputation: RiskLevel;
  };
}

export interface OpportunityEvaluationResult {
  recommendation: OpportunityRecommendation;
  score: number;
  rationale: string[];
  blockingFactors: string[];
  missingData: string[];
  requiresOwnerApproval: boolean;
  executionAllowed: false;
}

const riskWeight: Record<RiskLevel, number> = {
  LOW: 0,
  MEDIUM: 10,
  HIGH: 25,
  CRITICAL: 50,
};

export function evaluateOpportunity(input: OpportunityEvaluationInput): OpportunityEvaluationResult {
  const blockingFactors = [...input.conflicts];
  const missingData: string[] = [];
  const rationale: string[] = [];

  if (input.policyDecision === 'BLOCK') {
    return {
      recommendation: 'HARD_BLOCK',
      score: 0,
      rationale: ['The Policy Engine identified an explicit deny or hard security boundary.'],
      blockingFactors,
      missingData,
      requiresOwnerApproval: false,
      executionAllowed: false,
    };
  }

  if (input.evidenceConfidence < 50) missingData.push('Insufficient evidence confidence.');
  if (input.dependencies.length > 0) rationale.push(`${input.dependencies.length} dependency/dependencies require validation.`);
  if (input.reversibility < 50) rationale.push('The opportunity has limited reversibility.');

  const totalRisk = Object.values(input.risks).reduce((sum, risk) => sum + riskWeight[risk], 0);
  const benefit =
    input.businessBenefit * 0.25 +
    input.strategicAlignment * 0.2 +
    input.operationalImpact * 0.1 +
    input.financialImpact * 0.15 +
    input.reversibility * 0.15 +
    input.evidenceConfidence * 0.15;

  const score = Math.max(0, Math.min(100, Math.round(benefit - totalRisk / 2)));

  if (input.policyDecision === 'APPROVAL_REQUIRED') {
    return {
      recommendation: 'OWNER_REVIEW',
      score,
      rationale: ['The action is critical and requires explicit owner authorization.', ...rationale],
      blockingFactors,
      missingData,
      requiresOwnerApproval: true,
      executionAllowed: false,
    };
  }

  if (missingData.length > 0) {
    return {
      recommendation: 'NEEDS_MORE_DATA',
      score,
      rationale,
      blockingFactors,
      missingData,
      requiresOwnerApproval: false,
      executionAllowed: false,
    };
  }

  if (score >= 70 && blockingFactors.length === 0) {
    return {
      recommendation: 'PROPOSE',
      score,
      rationale: ['Expected business value is positive and no hard conflict was identified.', ...rationale],
      blockingFactors,
      missingData,
      requiresOwnerApproval: false,
      executionAllowed: false,
    };
  }

  return {
    recommendation: 'OWNER_REVIEW',
    score,
    rationale: ['The opportunity may be valuable, but its risk, impact or uncertainty requires owner review.', ...rationale],
    blockingFactors,
    missingData,
    requiresOwnerApproval: true,
    executionAllowed: false,
  };
}
