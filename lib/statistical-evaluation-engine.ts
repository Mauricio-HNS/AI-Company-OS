export type EvaluationMethod = 'FREQUENTIST' | 'BAYESIAN' | 'RULE_BASED'
export type ExperimentVerdict = 'SIGNIFICANT_WIN' | 'SIGNIFICANT_LOSS' | 'INCONCLUSIVE' | 'INVALID'
export type StatisticalEvidence = { method: EvaluationMethod; sampleSize: number; controlMean: number; treatmentMean: number; effectSize: number; confidenceLevel: number; confidenceInterval: { low: number; high: number }; pValue?: number; posteriorProbability?: number; calculatedAt: string }
export type ExperimentEvaluation = StatisticalEvidence & { verdict: ExperimentVerdict; businessCriterionMet: boolean; minimumSampleSize: number; rationale: string }

function normalQuantile(confidenceLevel: number) { if (confidenceLevel >= 0.995) return 2.807; if (confidenceLevel >= 0.99) return 2.576; if (confidenceLevel >= 0.95) return 1.96; if (confidenceLevel >= 0.9) return 1.645; return 1.282 }
function normalCdf(z: number) { return 0.5 * (1 + Math.erf(z / Math.SQRT2)) }

export function evaluateExperiment(input: { method?: EvaluationMethod; control: number[]; treatment: number[]; minimumSampleSize?: number; confidenceLevel?: number; minimumEffect?: number }): ExperimentEvaluation {
  const method = input.method ?? 'FREQUENTIST'
  const minimumSampleSize = input.minimumSampleSize ?? 30
  const confidenceLevel = input.confidenceLevel ?? 0.95
  const minimumEffect = input.minimumEffect ?? 0
  const sampleSize = input.control.length + input.treatment.length
  const controlMean = input.control.length ? input.control.reduce((a, b) => a + b, 0) / input.control.length : 0
  const treatmentMean = input.treatment.length ? input.treatment.reduce((a, b) => a + b, 0) / input.treatment.length : 0
  const effectSize = treatmentMean - controlMean
  if (!input.control.length || !input.treatment.length) return { method, sampleSize, controlMean, treatmentMean, effectSize, confidenceLevel, confidenceInterval: { low: 0, high: 0 }, minimumSampleSize, businessCriterionMet: false, verdict: 'INVALID', rationale: 'Both control and treatment samples are required.', calculatedAt: new Date().toISOString() }
  const controlVariance = input.control.reduce((s, x) => s + (x - controlMean) ** 2, 0) / Math.max(1, input.control.length - 1)
  const treatmentVariance = input.treatment.reduce((s, x) => s + (x - treatmentMean) ** 2, 0) / Math.max(1, input.treatment.length - 1)
  const standardError = Math.sqrt(controlVariance / input.control.length + treatmentVariance / input.treatment.length)
  const margin = normalQuantile(confidenceLevel) * standardError
  const interval = { low: effectSize - margin, high: effectSize + margin }
  const z = standardError === 0 ? (effectSize === 0 ? 0 : Number.POSITIVE_INFINITY * Math.sign(effectSize)) : effectSize / standardError
  const pValue = Number.isFinite(z) ? 2 * (1 - normalCdf(Math.abs(z))) : 0
  const significantWin = pValue < (1 - confidenceLevel) && interval.low > 0
  const significantLoss = pValue < (1 - confidenceLevel) && interval.high < 0
  const businessCriterionMet = effectSize >= minimumEffect
  const verdict = sampleSize < minimumSampleSize ? 'INCONCLUSIVE' : significantWin ? (businessCriterionMet ? 'SIGNIFICANT_WIN' : 'SIGNIFICANT_LOSS') : significantLoss ? 'SIGNIFICANT_LOSS' : 'INCONCLUSIVE'
  return { method, sampleSize, controlMean, treatmentMean, effectSize, confidenceLevel, confidenceInterval: interval, pValue, minimumSampleSize, businessCriterionMet, verdict, rationale: sampleSize < minimumSampleSize ? 'Insufficient sample size; do not declare a winner.' : significantWin ? 'Statistically significant positive effect and business criterion met.' : significantLoss ? 'Statistically significant negative effect.' : 'Evidence is inconclusive; extend the experiment.', calculatedAt: new Date().toISOString() }
}
