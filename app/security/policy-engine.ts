/**
 * AI Company OS — Policy Engine
 *
 * Constitutional rule:
 * AUTONOMY DOES NOT MEAN AUTHORITY.
 *
 * The engine answers two different questions:
 * 1. Is this action already authorized?
 * 2. If it is not authorized, is it forbidden or should it be analyzed?
 *
 * An action that has no explicit authorization is NOT automatically discarded.
 * It must not execute, but it may be evaluated as a proposal when there is no
 * hard rule or security boundary being violated.
 *
 * This module is a frontend/domain contract. Production enforcement MUST run
 * on a trusted server/API. Client state must never be the security boundary.
 */

import type { CriticalAction } from './owner-authorization';
import { requiresOwnerAuthorization } from './owner-authorization';

export const POLICY_ENGINE_VERSION = '1.1';

export type AuthorityLevel = 0 | 1 | 2 | 3 | 4 | 5;
export type PolicyDecision = 'ALLOW' | 'REVIEW_REQUIRED' | 'APPROVAL_REQUIRED' | 'BLOCK';
export type ProposalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'DEFERRED' | 'EXPIRED';
export type PolicyEffect = 'ALLOW' | 'DENY';

export type PolicyAction = CriticalAction | string;

export interface PolicyRule {
  id: string;
  action: PolicyAction;
  companyId: string;
  agentId?: string;
  authorityLevel: AuthorityLevel;
  enabled: boolean;
  effect?: PolicyEffect;
  conditions?: Record<string, unknown>;
  limits?: {
    maxAmount?: number;
    currency?: string;
    maxRisk?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };
  expiresAt?: string;
  createdBy: string;
  version: string;
}

export interface PolicyCheckInput {
  companyId: string;
  agentId: string;
  action: PolicyAction;
  authorityLevel: AuthorityLevel;
  amount?: number;
  currency?: string;
  risk?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  context?: Record<string, unknown>;
}

export interface PolicyDecisionResult {
  decision: PolicyDecision;
  reason: string;
  policyEngineVersion: string;
  matchedRuleId?: string;
  requiresOwnerAuthorization: boolean;
  canCreateProposal: boolean;
  executionAllowed: boolean;
  analysisRequired: boolean;
}

export interface AuthorizationProposal {
  id: string;
  companyId: string;
  requestedBy: string;
  action: PolicyAction;
  reason: string;
  authorityLevel: AuthorityLevel;
  risk?: PolicyCheckInput['risk'];
  amount?: number;
  currency?: string;
  status: ProposalStatus;
  createdAt: string;
  expiresAt: string;
  policyEngineVersion: string;
  analysisRequired: boolean;
}

const CRITICAL_ACTIONS = new Set<CriticalAction>([
  'TRANSFER_FUNDS',
  'CHANGE_BANK_ACCOUNT',
  'PAYMENT_ABOVE_LIMIT',
  'HIRE_OR_TERMINATE',
  'CHANGE_PERMISSIONS',
  'DELETE_DATA',
  'DELETE_COMPANY',
  'PRODUCTION_DEPLOY',
  'CHANGE_SECURITY_POLICY',
  'LEGAL_COMMUNICATION',
  'SIGN_CONTRACT',
  'CHANGE_CREDENTIALS',
  'CREATE_ADMIN',
  'EMERGENCY_STOP',
]);

function isCriticalAction(action: PolicyAction): action is CriticalAction {
  return CRITICAL_ACTIONS.has(action as CriticalAction);
}

function isExpired(expiresAt?: string, now = Date.now()): boolean {
  return Boolean(expiresAt && Date.parse(expiresAt) <= now);
}

function matchesRule(rule: PolicyRule, input: PolicyCheckInput, now: number): boolean {
  if (!rule.enabled || rule.companyId !== input.companyId) return false;
  if (rule.action !== input.action) return false;
  if (rule.agentId && rule.agentId !== input.agentId) return false;
  if (isExpired(rule.expiresAt, now)) return false;

  if (rule.limits?.maxAmount !== undefined) {
    if (input.amount === undefined || input.amount > rule.limits.maxAmount) return false;
  }

  if (rule.limits?.currency && input.currency !== rule.limits.currency) return false;

  const riskOrder = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 } as const;
  if (rule.limits?.maxRisk && input.risk) {
    if (riskOrder[input.risk] > riskOrder[rule.limits.maxRisk]) return false;
  }

  return true;
}

/**
 * Evaluate an action using a safe-but-intelligent distinction:
 *
 * ALLOW             = explicitly permitted and executable.
 * REVIEW_REQUIRED   = not explicitly permitted, but not known to violate a
 *                      hard rule. The action must not execute; analyze it and
 *                      present a proposal to the owner when appropriate.
 * APPROVAL_REQUIRED = critical operation; owner authorization is mandatory.
 * BLOCK             = an explicit deny rule matched. Do not execute or treat
 *                      the proposal as an implicit permission.
 */
export function evaluatePolicy(
  input: PolicyCheckInput,
  rules: PolicyRule[],
  now = Date.now(),
): PolicyDecisionResult {
  const matchingRules = rules.filter((rule) => matchesRule(rule, input, now));
  const denyRule = matchingRules.find((rule) => rule.effect === 'DENY');

  if (denyRule) {
    return {
      decision: 'BLOCK',
      reason: `Explicit deny rule ${denyRule.id} prohibits this action in the current context.`,
      policyEngineVersion: POLICY_ENGINE_VERSION,
      matchedRuleId: denyRule.id,
      requiresOwnerAuthorization: false,
      canCreateProposal: false,
      executionAllowed: false,
      analysisRequired: false,
    };
  }

  if (isCriticalAction(input.action) && requiresOwnerAuthorization(input.action)) {
    return {
      decision: 'APPROVAL_REQUIRED',
      reason: 'Critical action requires explicit owner authorization after risk and plan evaluation.',
      policyEngineVersion: POLICY_ENGINE_VERSION,
      requiresOwnerAuthorization: true,
      canCreateProposal: true,
      executionAllowed: false,
      analysisRequired: true,
    };
  }

  const allowRule = matchingRules.find((rule) => rule.effect !== 'DENY');

  if (allowRule) {
    return {
      decision: 'ALLOW',
      reason: 'Explicit policy permits this action in the current context.',
      policyEngineVersion: POLICY_ENGINE_VERSION,
      matchedRuleId: allowRule.id,
      requiresOwnerAuthorization: false,
      canCreateProposal: false,
      executionAllowed: true,
      analysisRequired: false,
    };
  }

  return {
    decision: 'REVIEW_REQUIRED',
    reason: 'No explicit policy permits this action. Execution is blocked pending analysis; if beneficial and compatible with the company environment, a proposal may be sent to the Central de Comando.',
    policyEngineVersion: POLICY_ENGINE_VERSION,
    requiresOwnerAuthorization: false,
    canCreateProposal: true,
    executionAllowed: false,
    analysisRequired: true,
  };
}

/**
 * A proposal is a request for analysis and an owner decision, never an
 * authorization. The proposal should be enriched by plan/risk evaluation
 * before the owner sees the final recommendation.
 */
export function createAuthorizationProposal(
  input: PolicyCheckInput,
  reason: string,
  requestedBy: string,
  now = Date.now(),
): AuthorizationProposal {
  const createdAt = new Date(now).toISOString();

  return {
    id: `PROP-${now}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    companyId: input.companyId,
    requestedBy,
    action: input.action,
    reason,
    authorityLevel: input.authorityLevel,
    risk: input.risk,
    amount: input.amount,
    currency: input.currency,
    status: 'PENDING',
    createdAt,
    expiresAt: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
    policyEngineVersion: POLICY_ENGINE_VERSION,
    analysisRequired: true,
  };
}

export const POLICY_CONSTITUTION = [
  'DENY_BY_DEFAULT_FOR_EXECUTION',
  'UNAUTHORIZED_DOES_NOT_MEAN_FORBIDDEN',
  'UNAUTHORIZED_ACTIONS_REQUIRE_ANALYSIS_BEFORE_EXECUTION',
  'AUTONOMY_DOES_NOT_MEAN_AUTHORITY',
  'AGENTS_CANNOT_GRANT_AUTHORITY_TO_THEMSELVES',
  'CRITICAL_ACTIONS_REQUIRE_EXPLICIT_OWNER_AUTHORIZATION',
  'EXPLICIT_DENY_RULES_CANNOT_BE_OVERRIDDEN_BY_PROPOSALS',
  'PROPOSALS_ARE_NOT_AUTHORIZATIONS',
  'MISSING_OR_INVALID_POLICY_MUST_NOT_EXECUTE',
  'POLICY_CHANGES_REQUIRE_AUTHORIZATION',
  'EVERY_EXECUTED_ACTION_MUST_BE_AUDITED',
] as const;
