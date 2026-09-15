import type { Request } from '../core/domain-model';
import type { RuntimeContextState } from './runtime-context';

export function attachRequestToRuntime(
  state: RuntimeContextState,
  request: Request,
): RuntimeContextState {
  return {
    ...state,
    phase: 'REQUEST',
    request,
    updatedAt: request.createdAt,
  };
}

export const RUNTIME_REQUEST_RULES = {
  REQUEST_IS_INPUT_NOT_AUTHORITY: 'A request enters the runtime as operational input and never grants execution authority.',
  REQUEST_MUST_RETAIN_CONTEXT: 'The runtime preserves the request identity and current status for traceability.',
} as const;
