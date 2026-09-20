export type ConnectorLifecycle =
  | 'DISCOVER'
  | 'DESCRIBE_SOURCE'
  | 'PROPOSE'
  | 'GENERATE'
  | 'VALIDATE'
  | 'SANDBOX_TEST'
  | 'MINIMIZATION_REVIEW'
  | 'AUTHORIZE'
  | 'ACTIVATE'
  | 'OBSERVE'

export type ConnectorStatus = 'PROPOSED' | 'VALIDATED' | 'AUTHORIZED' | 'ACTIVE' | 'REJECTED'

export type ConnectorCapability = {
  name: string
  mode: 'READ' | 'WRITE'
}

export type ConnectorDefinition = {
  id: string
  sourceId: string
  capabilities: ConnectorCapability[]
  requestedPermissions: string[]
  status: ConnectorStatus
}

export function canActivateConnector(connector: ConnectorDefinition): boolean {
  return connector.status === 'AUTHORIZED'
}

export function advanceConnector(
  connector: ConnectorDefinition,
  status: ConnectorStatus,
): ConnectorDefinition {
  return { ...connector, status }
}
