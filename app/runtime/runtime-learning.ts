import type { MemoryRecord, Outcome } from '../core/domain-model';
import type { RuntimeContextState } from './runtime-context';

export interface LearningSignal {
  outcomeId: string;
  success: boolean;
  confidence: number;
  lessons: string[];
  recommendedReplan: boolean;
}

export function deriveLearningSignal(outcome: Outcome): LearningSignal {
  const lessons = outcome.lessons ?? [];
  const varianceCount = Object.keys(outcome.variance ?? {}).length;

  return {
    outcomeId: outcome.id,
    success: outcome.success,
    confidence: outcome.success ? Math.max(0.5, 1 - varianceCount * 0.05) : 0.9,
    lessons,
    recommendedReplan: !outcome.success || lessons.length > 0,
  };
}

export function attachLearningToRuntime(
  state: RuntimeContextState,
  outcome: Outcome,
): RuntimeContextState {
  return {
    ...state,
    phase: 'LEARNING',
    outcome,
    updatedAt: new Date().toISOString(),
  };
}

export function outcomeToMemory(
  outcome: Outcome,
  scope: MemoryRecord['scope'],
  scopeId: string,
  provenance: string[] = [outcome.id],
): MemoryRecord | undefined {
  const lessons = outcome.lessons?.filter(Boolean) ?? [];
  if (!lessons.length) return undefined;

  return {
    id: `MEM-${outcome.id}`,
    scope,
    scopeId,
    content: lessons.join(' '),
    provenance,
    confidence: deriveLearningSignal(outcome).confidence,
    validated: false,
    createdAt: outcome.observedAt,
  };
}

export const RUNTIME_LEARNING_RULES = {
  LEARNING_REQUIRES_OUTCOME: 'Learning must be derived from observed outcomes.',
  UNVALIDATED_MEMORY_IS_NOT_TRUTH: 'New lessons remain unvalidated until corroborated or reviewed.',
  FAILURE_CAN_TRIGGER_REPLAN: 'Failed outcomes may recommend replanning but never grant new authority.',
  LEARNING_CANNOT_CHANGE_POLICY: 'Learning cannot mutate security or authorization policy by itself.',
} as const;
