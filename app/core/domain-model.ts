/**
 * AI Company OS — Core Domain Model v1.0
 *
 * The OS is modeled as a business operating system, not an agent-centric
 * chatbot. Requests create decisions; decisions create plans; plans create
 * tasks; tasks produce actions; actions produce outcomes; outcomes feed
 * evaluation and learning.
 */

import type { AuthorityLevel, PolicyAction, PolicyDecision } from '../security/policy-engine';

export type EntityId = string;
export type ISODate = string;
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type Priority = 'P0' | 'P1' | 'P2' | 'P3' | 'P4';
export type WorkStatus = 'BACKLOG' | 'PLANNING' | 'EXECUTING' | 'OBSERVING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export type RequestCategory =
  | 'EMERGENCY'
  | 'CRITICAL'
  | 'SYSTEM_CHANGE'
  | 'SUPPORT'
  | 'SECURITY'
  | 'FINANCE'
  | 'CUSTOMER'
  | 'SALES'
  | 'MARKETING'
  | 'OPERATIONS'
  | 'PRODUCT'
  | 'DATA_AI'
  | 'ADMIN'
  | 'LEGAL_COMPLIANCE';

export type EnvironmentType =
  | 'PRODUCTION'
  | 'STAGING'
  | 'DEVELOPMENT'
  | 'FINANCIAL'
  | 'SECURITY'
  | 'CUSTOMER'
  | 'INTERNAL'
  | 'EXTERNAL';

export interface EnvironmentRef {
  id: EntityId;
  companyId: EntityId;
  type: EnvironmentType;
  name: string;
  ownerDomain: string;
  securityLevel: AuthorityLevel;
  active: boolean;
}

export interface CompanyContext {
  companyId: EntityId;
  environmentId: EntityId;
  domainId: EntityId;
  clientId?: EntityId;
  correlationId: EntityId;
}

export interface Request {
  id: EntityId;
  context: CompanyContext;
  category: RequestCategory;
  priority: Priority;
  title: string;
  description: string;
  requestedBy: EntityId;
  responsibleDomain: string;
  assignedAgentId?: EntityId;
  impact: RiskLevel;
  risk: RiskLevel;
  slaDueAt?: ISODate;
  status: 'RECEIVED' | 'TRIAGING' | 'ANALYZING' | 'PLANNED' | 'EXECUTING' | 'WAITING_APPROVAL' | 'COMPLETED' | 'REJECTED';
  createdAt: ISODate;
}

export interface Decision {
  id: EntityId;
  context: CompanyContext;
  requestId?: EntityId;
  missionId?: EntityId;
  taskId?: EntityId;
  actorId: EntityId;
  question: string;
  alternatives: string[];
  selectedAlternative?: string;
  rationale?: string;
  confidence?: number;
  evidenceRefs: EntityId[];
  policyDecision?: PolicyDecision;
  createdAt: ISODate;
}

export interface Plan {
  id: EntityId;
  context: CompanyContext;
  decisionId?: EntityId;
  objectiveId?: EntityId;
  missionId?: EntityId;
  title: string;
  steps: EntityId[];
  dependencies: EntityId[];
  estimatedCost?: number;
  currency?: string;
  expectedReturn?: number;
  expectedDurationMinutes?: number;
  risk: RiskLevel;
  reversibility: 'HIGH' | 'MEDIUM' | 'LOW' | 'IRREVERSIBLE';
  status: 'DRAFT' | 'EVALUATING' | 'READY' | 'APPROVAL_REQUIRED' | 'EXECUTING' | 'COMPLETED' | 'FAILED';
  createdAt: ISODate;
}

export interface Task {
  id: EntityId;
  context: CompanyContext;
  planId: EntityId;
  title: string;
  responsibleAgentId?: EntityId;
  dependencies: EntityId[];
  priority: Priority;
  status: WorkStatus;
  createdAt: ISODate;
}

export interface Action {
  id: EntityId;
  context: CompanyContext;
  taskId: EntityId;
  action: PolicyAction;
  actorId: EntityId;
  parametersHash: string;
  authorityLevel: AuthorityLevel;
  risk: RiskLevel;
  policyDecision?: PolicyDecision;
  idempotencyKey: string;
  correlationId: EntityId;
  status: 'PENDING_POLICY' | 'BLOCKED' | 'WAITING_APPROVAL' | 'AUTHORIZED' | 'EXECUTING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
  createdAt: ISODate;
}

export interface Outcome {
  id: EntityId;
  context: CompanyContext;
  actionId: EntityId;
  success: boolean;
  metrics: Record<string, number>;
  observedAt: ISODate;
  expected?: Record<string, number>;
  variance?: Record<string, number>;
  lessons?: string[];
}

export interface Proposal {
  id: EntityId;
  context: CompanyContext;
  sourceRequestId?: EntityId;
  sourceDecisionId?: EntityId;
  sourceActionId?: EntityId;
  title: string;
  reason: string;
  recommendation: 'PROPOSE' | 'NEEDS_MORE_DATA' | 'OWNER_REVIEW' | 'HARD_BLOCK';
  risk: RiskLevel;
  expectedBenefit?: string;
  createdAt: ISODate;
}

export interface RuntimeEvent<TPayload = Record<string, unknown>> {
  id: EntityId;
  type: string;
  context: CompanyContext;
  sequence: number;
  source: 'SERVER' | 'AGENT' | 'USER' | 'INTEGRATION' | 'SYSTEM';
  correlationId: EntityId;
  causationId?: EntityId;
  idempotencyKey?: string;
  occurredAt: ISODate;
  payload: TPayload;
}

export interface AuditRecord {
  id: EntityId;
  eventId: EntityId;
  context: CompanyContext;
  actorId: EntityId;
  action: string;
  decision?: PolicyDecision;
  outcome?: 'SUCCESS' | 'FAILURE' | 'BLOCKED' | 'PENDING';
  immutable: boolean;
  recordedAt: ISODate;
}

export interface MemoryRecord {
  id: EntityId;
  scope: 'SYSTEM' | 'COMPANY' | 'DOMAIN' | 'AGENT' | 'TASK' | 'DECISION';
  scopeId: EntityId;
  content: string;
  provenance: EntityId[];
  confidence: number;
  validated: boolean;
  expiresAt?: ISODate;
  createdAt: ISODate;
}

export interface KnowledgeRecord {
  id: EntityId;
  companyId: EntityId;
  source: string;
  contentRef: string;
  provenance: EntityId[];
  trust: 'LOW' | 'MEDIUM' | 'HIGH';
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface AgentIdentity {
  id: EntityId;
  companyId: EntityId;
  role: string;
  authorityLevel: AuthorityLevel;
  allowedTools: string[];
  deniedTools: string[];
  dataScopes: string[];
  financialLimit?: { amount: number; currency: string };
  maxRisk: RiskLevel;
  active: boolean;
  modelVersion?: string;
  policyVersion?: string;
}

export const CORE_DOMAIN_RULES = [
  'REQUESTS_ARE_NOT_TASKS',
  'TASKS_ARE_NOT_ACTIONS',
  'ACTIONS_REQUIRE_POLICY_EVALUATION',
  'DECISIONS_MUST_RECORD_RATIONALE_AND_EVIDENCE',
  'OUTCOMES_ARE_MEASURED_SEPARATELY_FROM_EXECUTION',
  'URGENCY_NEVER_GRANTS_AUTHORITY',
  'AGENTS_ARE_ACTORS_NOT_AUTHORITY_SOURCES',
  'KNOWLEDGE_MEMORY_AND_AUDIT_ARE_DISTINCT',
  'EVERY_SIDE_EFFECT_HAS_IDEMPOTENCY_AND_CORRELATION_CONTEXT',
  'EVERY_MATERIAL_ACTION_IS_AUDITABLE',
] as const;
