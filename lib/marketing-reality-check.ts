export type RealityLevel = 'HIGH' | 'MODERATE' | 'LOW' | 'VERY_LOW'
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW'

export type MarketingRealityInput = {
  requestedGrowthPercent: number
  horizonDays: number
  currentMonthlySales?: number
  currentConversionRate?: number
  monthlyTraffic?: number
  averageOrderValue?: number
  historicalBestGrowthPercent?: number
  hasHistoricalCampaignData?: boolean
  storeReadiness?: number
  audienceReadiness?: number
  offerReadiness?: number
  operationalReadiness?: number
}

export type MarketingRealityCheck = {
  level: RealityLevel
  confidence: ConfidenceLevel
  requestedGrowthPercent: number
  recommendedTargetPercent: number
  aspirational: boolean
  blockers: string[]
  evidence: string[]
  actions: string[]
  rationale: string
}

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value))

export function evaluateMarketingReality(input: MarketingRealityInput): MarketingRealityCheck {
  const requested = Math.max(0, input.requestedGrowthPercent)
  const horizon = Math.max(1, input.horizonDays)
  const evidenceCount = [
    input.currentMonthlySales,
    input.currentConversionRate,
    input.monthlyTraffic,
    input.averageOrderValue,
    input.historicalBestGrowthPercent,
  ].filter(value => typeof value === 'number').length

  const confidence: ConfidenceLevel = evidenceCount >= 4 ? 'HIGH' : evidenceCount >= 2 ? 'MEDIUM' : 'LOW'
  const blockers: string[] = []
  const evidence: string[] = []

  if (typeof input.currentConversionRate === 'number') {
    evidence.push(`Conversão atual: ${input.currentConversionRate}%`)
    if (input.currentConversionRate < 1) blockers.push('Taxa de conversão abaixo de 1%')
  }
  if (typeof input.monthlyTraffic === 'number') evidence.push(`Tráfego mensal: ${input.monthlyTraffic.toLocaleString()}`)
  if (typeof input.currentMonthlySales === 'number') evidence.push(`Vendas mensais atuais: €${input.currentMonthlySales.toLocaleString()}`)
  if (typeof input.historicalBestGrowthPercent === 'number') {
    evidence.push(`Melhor crescimento histórico: ${input.historicalBestGrowthPercent}%`)
    if (requested > input.historicalBestGrowthPercent * 2 && requested >= 100) blockers.push('Meta muito acima do melhor crescimento histórico observado')
  }
  if (input.hasHistoricalCampaignData === false) blockers.push('Poucos dados históricos de campanhas')
  if (typeof input.storeReadiness === 'number' && input.storeReadiness < 60) blockers.push('Estrutura da loja precisa de melhorias')
  if (typeof input.audienceReadiness === 'number' && input.audienceReadiness < 60) blockers.push('Audiência atual ainda não está suficientemente preparada')
  if (typeof input.offerReadiness === 'number' && input.offerReadiness < 60) blockers.push('Oferta precisa de validação ou melhoria')
  if (typeof input.operationalReadiness === 'number' && input.operationalReadiness < 60) blockers.push('Operação pode não suportar um aumento rápido de demanda')

  if (horizon <= 30 && requested >= 100) blockers.push('Crescimento superior a 100% em até 30 dias exige evidências e capacidade operacional excepcionais')
  if (requested >= 200) blockers.push('Meta de +200% deve ser tratada como objetivo aspiracional, não como resultado garantido')

  const readiness = [input.storeReadiness, input.audienceReadiness, input.offerReadiness, input.operationalReadiness].filter((v): v is number => typeof v === 'number')
  const averageReadiness = readiness.length ? readiness.reduce((a, b) => a + b, 0) / readiness.length : 70
  let pressure = requested >= 200 ? 45 : requested >= 100 ? 30 : requested >= 50 ? 15 : 0
  if (horizon <= 30) pressure += 15
  if (typeof input.currentConversionRate === 'number' && input.currentConversionRate < 1) pressure += 20
  if (typeof input.historicalBestGrowthPercent === 'number' && requested > input.historicalBestGrowthPercent * 2) pressure += 15

  const viability = clamp(averageReadiness - pressure)
  const level: RealityLevel = viability >= 75 ? 'HIGH' : viability >= 55 ? 'MODERATE' : viability >= 30 ? 'LOW' : 'VERY_LOW'
  const recommendedTargetPercent = level === 'HIGH' ? Math.min(requested, 100) : level === 'MODERATE' ? Math.min(requested, 60) : level === 'LOW' ? Math.min(requested, 40) : Math.min(requested, 25)

  const actions = [
    ...(blockers.some(b => b.includes('conversão')) ? ['Corrigir os principais pontos de conversão antes de aumentar agressivamente o tráfego'] : []),
    ...(blockers.some(b => b.includes('tráfego')) ? ['Construir aquisição e distribuição antes de escalar'] : []),
    ...(blockers.some(b => b.includes('Oferta')) ? ['Revisar e testar a oferta comercial'] : []),
    ...(blockers.some(b => b.includes('Operação')) ? ['Validar capacidade de atendimento, estoque e entrega'] : []),
    'Executar testes controlados antes de escalar investimento',
    'Recalibrar a meta com base nos resultados reais',
  ]

  return {
    level,
    confidence,
    requestedGrowthPercent: requested,
    recommendedTargetPercent,
    aspirational: requested > recommendedTargetPercent,
    blockers,
    evidence,
    actions: [...new Set(actions)],
    rationale: requested > recommendedTargetPercent
      ? `A meta solicitada de +${requested}% em ${horizon} dias não deve ser tratada como resultado garantido nas condições atuais. O agente pode trabalhar para maximizar o crescimento, mas precisa primeiro atacar os bloqueadores identificados.`
      : `A meta solicitada de +${requested}% pode ser usada como objetivo operacional inicial, sujeita à validação contínua pelos resultados reais.`,
  }
}
