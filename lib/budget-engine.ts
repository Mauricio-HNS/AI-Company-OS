export type BudgetReservation = {
  id: string
  budget: string
  amount: number
  reservedAt: string
  expiresAt: string
  status: 'RESERVED' | 'RELEASED' | 'CONSUMED' | 'EXPIRED'
}

export function reserveBudget(budget: string, amount: number, ttlMs = 15 * 60 * 1000): BudgetReservation {
  const now = Date.now()
  return { id: `BR-${now}`, budget, amount: Math.max(0, amount), reservedAt: new Date(now).toISOString(), expiresAt: new Date(now + ttlMs).toISOString(), status: 'RESERVED' }
}

export function isReservationExpired(reservation: BudgetReservation, now = Date.now()) {
  return reservation.status === 'RESERVED' && new Date(reservation.expiresAt).getTime() <= now
}

export function expireReservation(reservation: BudgetReservation, now = Date.now()): BudgetReservation {
  return isReservationExpired(reservation, now) ? { ...reservation, status: 'EXPIRED' } : reservation
}

export function releaseReservation(reservation: BudgetReservation): BudgetReservation {
  return reservation.status === 'RESERVED' ? { ...reservation, status: 'RELEASED' } : reservation
}

export function consumeReservation(reservation: BudgetReservation): BudgetReservation {
  return reservation.status === 'RESERVED' && !isReservationExpired(reservation) ? { ...reservation, status: 'CONSUMED' } : expireReservation(reservation)
}

export function sweepExpiredReservations(reservations: BudgetReservation[], now = Date.now()) {
  return reservations.map(reservation => expireReservation(reservation, now))
}
