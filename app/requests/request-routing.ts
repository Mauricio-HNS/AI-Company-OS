/**
 * AI Company OS — Request Triage & Routing
 *
 * Urgency determines handling priority, never authority.
 */

import type { Request, RequestCategory, Priority, RiskLevel } from '../core/domain-model';

export interface RequestTriageResult {
  category: RequestCategory;
  priority: Priority;
  risk: RiskLevel;
  responsibleDomain: string;
  recommendedEnvironment: string;
  rationale: string[];
}

const domainByCategory: Record<RequestCategory, string> = {
  EMERGENCY: 'INCIDENT_RESPONSE',
  CRITICAL: 'OPERATIONS',
  SYSTEM_CHANGE: 'ENGINEERING',
  SUPPORT: 'SUPPORT',
  SECURITY: 'SECURITY',
  FINANCE: 'FINANCE',
  CUSTOMER: 'CUSTOMER_SUCCESS',
  SALES: 'SALES',
  MARKETING: 'MARKETING',
  OPERATIONS: 'OPERATIONS',
  PRODUCT: 'PRODUCT',
  DATA_AI: 'INTELLIGENCE',
  ADMIN: 'ADMINISTRATION',
  LEGAL_COMPLIANCE: 'LEGAL_COMPLIANCE',
};

const environmentByCategory: Record<RequestCategory, string> = {
  EMERGENCY: 'PRODUCTION',
  CRITICAL: 'PRODUCTION',
  SYSTEM_CHANGE: 'STAGING',
  SUPPORT: 'CUSTOMER',
  SECURITY: 'SECURITY',
  FINANCE: 'FINANCIAL',
  CUSTOMER: 'CUSTOMER',
  SALES: 'EXTERNAL',
  MARKETING: 'EXTERNAL',
  OPERATIONS: 'INTERNAL',
  PRODUCT: 'DEVELOPMENT',
  DATA_AI: 'INTERNAL',
  ADMIN: 'INTERNAL',
  LEGAL_COMPLIANCE: 'INTERNAL',
};

export function triageRequest(input: Pick<Request, 'category' | 'priority' | 'risk' | 'impact'>): RequestTriageResult {
  const rationale = [
    `Category routes to ${domainByCategory[input.category]}.`,
    `Recommended environment is ${environmentByCategory[input.category]}.`,
    `Priority ${input.priority} changes handling urgency but does not grant additional authority.`,
  ];

  if (input.impact === 'CRITICAL' || input.priority === 'P0') {
    rationale.push('Critical impact requires immediate analysis and appropriate escalation.');
  }

  return {
    category: input.category,
    priority: input.priority,
    risk: input.risk,
    responsibleDomain: domainByCategory[input.category],
    recommendedEnvironment: environmentByCategory[input.category],
    rationale,
  };
}

export const REQUEST_CONSTITUTION = [
  'REQUESTS_ARE_CLASSIFIED_BEFORE_ROUTING',
  'EVERY_REQUEST_HAS_A_RESPONSIBLE_DOMAIN',
  'EVERY_REQUEST_HAS_AN_ENVIRONMENT_CONTEXT',
  'URGENCY_DOES_NOT_OVERRIDE_AUTHORITY',
  'P0_AND_P1_REQUIRE_FAST_HANDLING_NOT_AUTOMATIC_EXECUTION',
] as const;
