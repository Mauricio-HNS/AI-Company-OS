import type { Action } from '../core/domain-model';
import type { ExecutionReceipt } from './action-gate';
import type { RuntimeContextState } from './runtime-context';

export function attachActionToRuntime(
  state: RuntimeContextState,
  action: Action,
  executionReceipt?: ExecutionReceipt,
): RuntimeContextState {
  return {
    ...state,
    phase: 'ACTION',
    action,
    executionReceipt,
    updatedAt: new Date().toISOString(),
  };
}

export const RUNTIME_ACTION_RULES = {
  ACTION_REQUIRES_POLICY: 'An action must carry the policy decision that authorized or rejected it.',
  EXECUTION_REQUIRES_RECEIPT: 'A successfully authorized side effect must produce an execution receipt.',
  RECEIPT_IS_NOT_AUTHORITY: 'A receipt records a passed execution gate; it does not create authority by itself.',
} as const;
