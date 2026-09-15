import type { ExecutionReceipt } from './action-gate';

export type ExecutionLedgerStatus = 'RESERVED' | 'STARTED' | 'SUCCEEDED' | 'FAILED';

export interface ExecutionLedgerEntry {
  idempotencyKey: string;
  actionId: string;
  parametersHash: string;
  correlationId: string;
  status: ExecutionLedgerStatus;
  recordedAt: string;
}

export type ExecutionReservation =
  | { accepted: true; entry: ExecutionLedgerEntry }
  | { accepted: false; reason: string; entry?: ExecutionLedgerEntry };

/**
 * Domain-level replay guard.
 * Production MUST replace this in-memory implementation with a durable,
 * atomic store keyed by company + idempotency key.
 */
export class ExecutionLedger {
  private readonly entries = new Map<string, ExecutionLedgerEntry>();

  reserve(receipt: ExecutionReceipt, now = Date.now()): ExecutionReservation {
    const key = `${receipt.companyId}:${receipt.idempotencyKey}`;
    const existing = this.entries.get(key);

    if (existing) {
      if (
        existing.actionId !== receipt.actionId ||
        existing.parametersHash !== receipt.parametersHash
      ) {
        return { accepted: false, reason: 'Idempotency key is already bound to a different action or parameters.', entry: existing };
      }
      return { accepted: false, reason: 'Execution has already been reserved or consumed for this idempotency key.', entry: existing };
    }

    const entry: ExecutionLedgerEntry = {
      idempotencyKey: receipt.idempotencyKey,
      actionId: receipt.actionId,
      parametersHash: receipt.parametersHash,
      correlationId: receipt.correlationId,
      status: 'RESERVED',
      recordedAt: new Date(now).toISOString(),
    };

    this.entries.set(key, entry);
    return { accepted: true, entry };
  }

  markStarted(receipt: ExecutionReceipt, now = Date.now()): ExecutionLedgerEntry {
    return this.update(receipt, 'STARTED', now);
  }

  markSucceeded(receipt: ExecutionReceipt, now = Date.now()): ExecutionLedgerEntry {
    return this.update(receipt, 'SUCCEEDED', now);
  }

  markFailed(receipt: ExecutionReceipt, now = Date.now()): ExecutionLedgerEntry {
    return this.update(receipt, 'FAILED', now);
  }

  get(companyId: string, idempotencyKey: string): ExecutionLedgerEntry | undefined {
    return this.entries.get(`${companyId}:${idempotencyKey}`);
  }

  private update(
    receipt: ExecutionReceipt,
    status: ExecutionLedgerStatus,
    now: number,
  ): ExecutionLedgerEntry {
    const key = `${receipt.companyId}:${receipt.idempotencyKey}`;
    const current = this.entries.get(key);
    if (!current) throw new Error('Execution receipt was not reserved.');
    if (current.actionId !== receipt.actionId || current.parametersHash !== receipt.parametersHash) {
      throw new Error('Execution ledger identity does not match the receipt.');
    }

    const next = { ...current, status, recordedAt: new Date(now).toISOString() };
    this.entries.set(key, next);
    return next;
  }
}

export const EXECUTION_LEDGER_RULES = {
  IDEMPOTENCY_IS_COMPANY_SCOPED: 'An idempotency key is unique within the company execution scope.',
  KEY_BINDS_TO_EXACT_ACTION: 'A key cannot be reused for another action or parameter set.',
  RESERVE_BEFORE_SIDE_EFFECT: 'The execution key must be reserved before an external side effect begins.',
  REPLAY_IS_DENIED: 'A previously reserved or consumed key cannot silently execute again.',
  PRODUCTION_REQUIRES_ATOMIC_DURABILITY: 'Production requires a durable atomic store, not process memory.',
} as const;
