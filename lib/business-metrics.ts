export type BusinessMetrics = {
  leads: number
  qualified: number
  opportunities: number
  conversions: number
  revenue: number
  expenses: number
  profit: number
  conversionRate: number
  conversionDelta: number
  cac: number
  ltv: number
  mrr: number
  roi: number
  updatedAt: string
  history: Array<{ revenue: number; conversionRate: number }>
}

function rate(conversions: number, opportunities: number) {
  return opportunities > 0 ? Number(((conversions / opportunities) * 100).toFixed(1)) : 0
}

export function initializeBusinessMetrics(revenueSeed: number): BusinessMetrics {
  const revenue = Math.max(0, revenueSeed)
  const leads = 184
  const qualified = 96
  const opportunities = 42
  const conversions = 14
  const conversionRate = rate(conversions, opportunities)
  const expenses = Math.round(revenue * 0.33)
  return {
    leads, qualified, opportunities, conversions, revenue, expenses,
    profit: revenue - expenses,
    conversionRate,
    conversionDelta: 0.8,
    cac: Math.round(revenue / Math.max(1, conversions)),
    ltv: Math.round((revenue / Math.max(1, conversions)) * 3.2),
    mrr: Math.round(revenue * 0.72),
    roi: expenses ? Number((((revenue - expenses) / expenses) * 100).toFixed(1)) : 0,
    updatedAt: new Date().toISOString(),
    history: Array.from({ length: 8 }, (_, i) => ({
      revenue: Math.round(revenue * (0.82 + i * 0.026)),
      conversionRate: Number((conversionRate - 1.4 + i * 0.2).toFixed(1)),
    })),
  }
}

export function advanceBusinessMetrics(current: BusinessMetrics, tick: number): { metrics: BusinessMetrics; event: string } {
  let { leads, qualified, opportunities, conversions, revenue, expenses } = current
  const events: string[] = []

  if (tick % 2 === 0) { leads += 1; events.push('New qualified lead detected') }
  if (tick % 3 === 0) { qualified += 1; events.push('Lead qualified by Growth Agent') }
  if (tick % 4 === 0) { opportunities += 1; events.push('Sales opportunity created') }
  if (tick % 7 === 0) { conversions += 1; events.push('Opportunity converted') }
  if (tick % 5 === 0) { revenue += 320; expenses += 120; events.push('Commercial result recorded') }

  const conversionRate = rate(conversions, opportunities)
  const previousRate = current.conversionRate
  const profit = revenue - expenses
  const metrics: BusinessMetrics = {
    ...current,
    leads, qualified, opportunities, conversions, revenue, expenses, profit,
    conversionRate,
    conversionDelta: Number((conversionRate - previousRate).toFixed(1)),
    cac: Math.round(expenses / Math.max(1, conversions)),
    ltv: Math.round((revenue / Math.max(1, conversions)) * 3.2),
    mrr: Math.round(revenue * 0.72),
    roi: expenses ? Number(((profit / expenses) * 100).toFixed(1)) : 0,
    updatedAt: new Date().toISOString(),
    history: [...current.history.slice(-7), { revenue, conversionRate }],
  }

  return { metrics, event: events[0] || 'Runtime heartbeat' }
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value)
}
