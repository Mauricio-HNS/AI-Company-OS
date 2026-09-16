export type BusinessFactType =
  | 'SALE'
  | 'PURCHASE'
  | 'STOCK'
  | 'EXPENSE'
  | 'CUSTOMER'
  | 'SUPPLIER'
  | 'PRODUCT'
  | 'MARKETING'
  | 'OPERATIONS'

export type MemoryLifecycle = 'ACTIVE' | 'SUPERSEDED' | 'CONTESTED'

export type BusinessFact = {
  id: string
  type: BusinessFactType
  entityId: string
  occurredAt: string
  source: string
  evidence?: string
  confidence: number
  payload: Record<string, string | number | boolean | null>
}

export type ConnectorCapability =
  | 'API'
  | 'CSV'
  | 'EXCEL'
  | 'DOCUMENTS'
  | 'DATABASE'
  | 'WEBHOOK'
  | 'EMAIL'
  | 'WHATSAPP'
  | 'ERP'
  | 'CRM'
  | 'POS'
  | 'ECOMMERCE'
  | 'GOOGLE'
  | 'META'

export type CompanyConnector = {
  id: string
  name: string
  capability: ConnectorCapability
  status: 'CONNECTED' | 'AVAILABLE' | 'BLOCKED'
  lastSync?: string
  permissions: string[]
}

export type DiscoveryResult = {
  discoveredSystems: string[]
  discoveredEntities: string[]
  missingData: string[]
  repetitiveTasks: string[]
  confidence: number
  completedAt: string
}

export type InventorySignal = {
  productId: string
  stock: number
  dailyVelocity: number
  supplierLeadTimeDays: number
  safetyStock: number
  reorderPoint: number
  recommendedPurchase: number
}

export type SupplierIntelligence = {
  supplierId: string
  historicalPrice: number
  leadTimeDays: number
  freight: number
  reliability: number
  paymentTerms: string
}

export type AIDecision = {
  id: string
  title: string
  reason: string
  evidence: string[]
  impact: string
  cost: number
  risk: number
  requiredApproval: boolean
  action: string
  status: 'PROPOSED' | 'APPROVED' | 'EXECUTING' | 'COMPLETED' | 'REJECTED'
}

export type AutomationOpportunity = {
  id: string
  task: string
  frequency: string
  estimatedMinutes: number
  risk: number
  suggestedAutomation: string
}

export type CompanyMemoryEntry = {
  id: string
  statement: string
  evidence: string[]
  lifecycle: MemoryLifecycle
  createdAt: string
}

export type CompanyBrainSnapshot = {
  discovery: DiscoveryResult
  connectors: CompanyConnector[]
  inventorySignals: InventorySignal[]
  supplierIntelligence: SupplierIntelligence[]
  decisions: AIDecision[]
  automations: AutomationOpportunity[]
  memory: CompanyMemoryEntry[]
}

export const initialCompanyBrain: CompanyBrainSnapshot = {
  discovery: {
    discoveredSystems: ['Company OS runtime'],
    discoveredEntities: ['Products', 'Sales', 'Customers', 'Suppliers', 'Finance'],
    missingData: ['Supplier lead times', 'Purchase invoices', 'Stock source'],
    repetitiveTasks: ['Weekly financial reporting', 'Reorder checks', 'Supplier price comparison'],
    confidence: 0.82,
    completedAt: new Date().toISOString(),
  },
  connectors: [
    { id: 'runtime', name: 'AI Company OS Runtime', capability: 'API', status: 'CONNECTED', permissions: ['read', 'runtime'] },
    { id: 'erp', name: 'ERP / gestão', capability: 'ERP', status: 'AVAILABLE', permissions: [] },
    { id: 'pos', name: 'PDV / caixa', capability: 'POS', status: 'AVAILABLE', permissions: [] },
    { id: 'files', name: 'Excel / CSV / documentos', capability: 'EXCEL', status: 'AVAILABLE', permissions: [] },
  ],
  inventorySignals: [{ productId: 'coffee-premium', stock: 68, dailyVelocity: 11, supplierLeadTimeDays: 5, safetyStock: 30, reorderPoint: 85, recommendedPurchase: 120 }],
  supplierIntelligence: [{ supplierId: 'supplier-b', historicalPrice: 8.4, leadTimeDays: 5, freight: 120, reliability: 0.94, paymentTerms: '30 days' }],
  decisions: [{
    id: 'purchase-120',
    title: 'Comprar 120 unidades de Café Premium',
    reason: 'Estoque, velocidade de venda, prazo do fornecedor e histórico de compras indicam risco de ruptura.',
    evidence: ['Estoque atual: 68', 'Velocidade: 11/dia', 'Prazo: 5 dias', 'Ponto de reposição: 85'],
    impact: 'Evita ruptura sem imobilizar estoque excessivo.',
    cost: 1800,
    risk: 0.18,
    requiredApproval: true,
    action: 'Reservar compra com o fornecedor selecionado',
    status: 'PROPOSED',
  }],
  automations: [
    { id: 'reorder-check', task: 'Verificar produtos próximos do ponto de reposição', frequency: 'Diário', estimatedMinutes: 35, risk: 0.08, suggestedAutomation: 'Executar automaticamente e abrir decisão quando houver risco.' },
    { id: 'supplier-compare', task: 'Comparar preços e prazos de fornecedores', frequency: 'Semanal', estimatedMinutes: 50, risk: 0.12, suggestedAutomation: 'Atualizar histórico e recomendar fornecedor.' },
  ],
  memory: [{ id: 'memory-001', statement: 'O negócio deve evitar ruptura sem carregar estoque excessivo.', evidence: ['Histórico de compras', 'Sinais de estoque'], lifecycle: 'ACTIVE', createdAt: new Date().toISOString() }],
}
