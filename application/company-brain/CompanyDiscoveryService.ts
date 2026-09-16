import type { CompanyBrainSnapshot, DiscoveryResult } from '../../domain/company/company-brain'

export class CompanyDiscoveryService {
  discover(snapshot: CompanyBrainSnapshot): DiscoveryResult {
    const connected = snapshot.connectors.filter((connector) => connector.status === 'CONNECTED')
    const missingData = snapshot.discovery.missingData.filter(Boolean)
    const repetitiveTasks = snapshot.discovery.repetitiveTasks.filter(Boolean)

    return {
      discoveredSystems: connected.map((connector) => connector.name),
      discoveredEntities: snapshot.discovery.discoveredEntities,
      missingData,
      repetitiveTasks,
      confidence: Math.min(0.99, Math.max(0.1, connected.length / Math.max(1, snapshot.connectors.length) + 0.55)),
      completedAt: new Date().toISOString(),
    }
  }
}
