/**
 * AI Company OS — Policy Engine
 *
 * Constitutional rule:
 * AUTONOMY DOES NOT MEAN AUTHORITY.
 *
 * The engine answers one question: "Is this action authorized right now?"
 * AI agents may decide what should be done, but they cannot decide what they
 * are authorized to do. Missing, ambiguous, expired, or invalid policy data
 * fails closed.
 *
 * This module is a frontend/domain contract. Production enforcement MUST run
 * on a trusted server/API. Client state must never be the security boundary.
 */

import type { CriticalAction } from './owner-authorization';
import { requiresOwnerAuthorization } from './owner-authorization';

export const POLICY_ENGINE_VERSION = '1.0';

export type AuthorityLevel = 0 | 1 | 2 | 3 | 4 | 5;
export type PolicyDecision = 'ALLOW' | 'APPROVAL_REQUIRED' | 'BLOCK';
export type ProposalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'DEFERRED' | 'EXPIRED';

export type PolicyAction = CriticalAction | string;

export interface PolicyRule {
  id: string;
  action: PolicyAction;
  companyId: string;
  agentId?: string;
  authorityLevel: AuthorityLevel;
  enabled: boolean;
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
  if (rule.authorityLevel < input.authorityLevel) return false;
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
 * Evaluate an action using deny-by-default semantics.
 *
 * Important: an agent may never create a rule or bypass this check. A critical
 * action is never executable merely because a proposal exists.
 */
export function evaluatePolicy(
  input: PolicyCheckInput,
  rules: PolicyRule[],
  now = Date.now(),
): PolicyDecisionResult {
  if (isCriticalAction(input.action) && requiresOwnerAuthorization(input.action)) {
    return {
      decision: 'APPROVAL_REQUIRED',
      reason: 'Critical action requires explicit owner authorization.',
      policyEngineVersion: POLICY_ENGINE_VERSION,
      requiresOwnerAuthorization: true,
      canCreateProposal: true,
    };
  }

  const matchedRule = rules.find((rule) => matchesRule(rule, input, now));

  if (!matchedRule) {
    return {
      decision: 'BLOCK',
      reason: 'No explicit policy permits this action in the current context.',
      policyEngineVersion: POLICY_ENGINE_VERSION,
      requiresOwnerAuthorization: false,
      canCreateProposal: true,
    };
  }

  return {
    decision: 'ALLOW',
    reason: 'Explicit policy permits this action in the current context.',
    policyEngineVersion: POLICY_ENGINE_VERSION,
    matchedRuleId: matchedRule.id,
    requiresOwnerAuthorization: false,
    canCreateProposal: false,
  };
}

/**
 * A blocked action can become a proposal for the owner, but never becomes an
 * authorization by itself. The proposal is a request for a decision, not a
 * permission record.
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
  };
}

export const POLICY_CONSTITUTION = [
  'DENY_BY_DEFAULT',
  'AUTONOMY_DOES_NOT_MEAN_AUTHORITY',
  'AGENTS_CANNOT_GRANT_AUTHORITY_TO_THEMSELVES',
  'CRITICAL_ACTIONS_REQUIRE_EXPLICIT_OWNER_AUTHORIZATION',
  'PROPOSALS_ARE_NOT_AUTHORIZATIONS',
  'MISSING_OR_INVALID_POLICY_MUST_FAIL_CLOSED',
  'POLICY_CHANGES_REQUIRE_AUTHORIZATION',
  'EVERY_EXECUTED_ACTION_MUST_BE_AUDITED',
] as const;
