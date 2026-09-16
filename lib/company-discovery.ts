import type { CompanyLedgerSnapshot, BusinessEntityKind } from '@/domain/company/company-model';
import type { DiscoveryResult, DiscoveredSource, DiscoveredEntity } from '@/domain/company/company-discovery';

export interface CompanyDiscoveryService {
  inspect(companyId: string, sources: DiscoveredSource[], entities: DiscoveredEntity[], missingData?: string[]): DiscoveryResult;
}

export function createCompanyDiscoveryService(): CompanyDiscoveryService {
  return {
    inspect(companyId, sources, entities, missingData = []) {
      const suggestedConnectors = sources
        .filter(source => source.readable && source.requiresAuthorization)
        .map(source => source.id);

      return {
        companyId,
        status: sources.length === 0 ? 'BLOCKED' : missingData.length > 0 ? 'PARTIAL' : 'READY',
        discoveredAt: new Date().toISOString(),
        sources,
        entities,
        missingData,
        repetitiveWork: [],
        suggestedConnectors,
      };
    },
  };
}

export function buildLedgerSnapshot(
  companyId: string,
  facts: Array<{ entityKind: BusinessEntityKind; occurredAt?: string }>,
): CompanyLedgerSnapshot {
  const entityCounts: Partial<Record<BusinessEntityKind, number>> = {};
  let lastObservedAt: string | undefined;

  for (const fact of facts) {
    entityCounts[fact.entityKind] = (entityCounts[fact.entityKind] ?? 0) + 1;
    if (fact.occurredAt && (!lastObservedAt || fact.occurredAt > lastObservedAt)) {
      lastObservedAt = fact.occurredAt;
    }
  }

  return {
    companyId,
    generatedAt: new Date().toISOString(),
    factCount: facts.length,
    entityCounts,
    sourceCount: new Set(facts.map(fact => fact.entityKind)).size,
    lastObservedAt,
  };
}
