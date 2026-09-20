import type { AgentId, CompanyId, TenantId, UserId } from '../identity'
import type { ApprovalState, Permission, RiskLevel } from '../governance'
import type { ExecutionContext } from '../execution'
import type { EvidenceProvenance } from '../evidence'
import type { CorrelationContext } from '../observability'

export type OSContext = {
  identity: {
    tenantId: TenantId
    companyId: CompanyId
    userId?: UserId
    agentId?: AgentId
  }
  execution?: ExecutionContext
  governance?: {
    permissions: Permission[]
    riskLevel?: RiskLevel
    approvalState?: ApprovalState
  }
  correlation?: CorrelationContext
  provenance?: EvidenceProvenance
}

export type OSContextInput = OSContext

export function createOSContext(input: OSContextInput): OSContext {
  if (!input.identity.tenantId.trim()) throw new Error('tenantId is required')
  if (!input.identity.companyId.trim()) throw new Error('companyId is required')
  return input
}
