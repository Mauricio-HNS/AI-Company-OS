import { applyReplan, approveRuntimeBrainDecision, enqueueApprovedBrainDecision, initializeRuntime, recordTaskResult, rejectRuntimeBrainDecision, startNextReadyTask, type RuntimeState } from '../../lib/company-runtime'
import type { AgentProfile, CompanyObjective } from '../../lib/operating-engine'

export type RuntimeOptions = { deadline?: string; budget?: number; constraints?: string[] }

/** Application boundary for company runtime use-cases. UI must not call runtime engines directly. */
export const CompanyRuntimeService = {
  initialize(objective: CompanyObjective, agents: AgentProfile[], options?: RuntimeOptions): RuntimeState {
    return initializeRuntime(objective, agents, options)
  },
  startNextTask(state: RuntimeState): RuntimeState {
    return startNextReadyTask(state)
  },
  recordTaskResult(state: RuntimeState, taskId: string, success: boolean, actual: string, score: number): RuntimeState {
    return recordTaskResult(state, taskId, success, actual, score)
  },
  replan(state: RuntimeState, agents: AgentProfile[]): RuntimeState {
    return applyReplan(state, agents)
  },
  approveDecision(state: RuntimeState, decisionId: string, preconditionsSatisfied = true): RuntimeState {
    return approveRuntimeBrainDecision(state, decisionId, preconditionsSatisfied)
  },
  rejectDecision(state: RuntimeState, decisionId: string): RuntimeState {
    return rejectRuntimeBrainDecision(state, decisionId)
  },
  enqueueApprovedDecision(state: RuntimeState, decisionId: string): RuntimeState {
    return enqueueApprovedBrainDecision(state, decisionId)
  },
}
