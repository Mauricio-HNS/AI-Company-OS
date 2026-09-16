export type BusinessEntityKind =
  | 'COMPANY'
  | 'CUSTOMER'
  | 'SUPPLIER'
  | 'PRODUCT'
  | 'SERVICE'
  | 'SALE'
  | 'PURCHASE'
  | 'ORDER'
  | 'INVENTORY'
  | 'EXPENSE'
  | 'REVENUE'
  | 'PAYMENT'
  | 'INVOICE'
  | 'EMPLOYEE'
  | 'ASSET'
  | 'LOCATION'
  | 'APPOINTMENT'
  | 'DOCUMENT'
  | 'INTERACTION'
  | 'EVENT'
  | 'TASK'
  | 'OTHER';

export type BusinessFactType =
  | 'MASTER_DATA'
  | 'TRANSACTION'
  | 'STATE'
  | 'MEASUREMENT'
  | 'EVENT'
  | 'DOCUMENT_REFERENCE';

export type DataSourceKind =
  | 'API'
  | 'DATABASE'
  | 'FILE'
  | 'APPLICATION'
  | 'DEVICE'
  | 'MANUAL'
  | 'OTHER';

export type ConfidenceLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface BusinessFact {
  id: string;
  companyId: string;
  type: BusinessFactType;
  entityKind: BusinessEntityKind;
  entityId?: string;
  occurredAt?: string;
  source: {
    connectorId: string;
    kind: DataSourceKind;
    name: string;
  };
  evidence: {
    localReference?: string;
    fields: string[];
    hash?: string;
  };
  confidence: ConfidenceLevel;
  payload: Record<string, unknown>;
}

export interface CompanyLedgerSnapshot {
  companyId: string;
  generatedAt: string;
  factCount: number;
  entityCounts: Partial<Record<BusinessEntityKind, number>>;
  sourceCount: number;
  lastObservedAt?: string;
}
