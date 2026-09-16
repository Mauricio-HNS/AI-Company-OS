import type { BusinessEntityKind, DataSourceKind } from './company-model';

export type DiscoveryStatus = 'DISCOVERING' | 'READY' | 'PARTIAL' | 'BLOCKED';

export interface DiscoveredSource {
  id: string;
  name: string;
  kind: DataSourceKind;
  location: string;
  readable: boolean;
  writable: boolean;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  requiresAuthorization: boolean;
}

export interface DiscoveredEntity {
  kind: BusinessEntityKind;
  sourceId: string;
  sourceName: string;
  evidence: string[];
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface DiscoveryResult {
  companyId: string;
  status: DiscoveryStatus;
  discoveredAt: string;
  sources: DiscoveredSource[];
  entities: DiscoveredEntity[];
  missingData: string[];
  repetitiveWork: string[];
  suggestedConnectors: string[];
}

export interface ConnectorProposal {
  id: string;
  companyId: string;
  sourceId: string;
  sourceKind: DataSourceKind;
  capabilities: string[];
  requestedPermissions: string[];
  dataClasses: BusinessEntityKind[];
  localProcessingPlan: string[];
  cloudPayloadPlan: string[];
  risks: string[];
  status: 'PROPOSED' | 'VALIDATED' | 'AUTHORIZED' | 'REJECTED';
}
