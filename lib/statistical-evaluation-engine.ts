export type EvaluationMethod = 'FREQUENTIST' | 'BAYESIAN' | 'RULE_BASED'
export type ExperimentVerdict = 'SIGNIFICANT_WIN' | 'SIGNIFICANT_LOSS' | 'INCONCLUSIVE' | 'INVALID'

export type StatisticalEvidence = {
  method: EvaluationMethod
  sampleSize: number
  controlMean: number
  treatmentMean: number
  effectSize: number
  confidenceLevel: number
  confidenceInterval: { low: number; high: number }
  pValue?: number
  posteriorProbability?: number
  calculatedAt: string
}

export type ExperimentEvaluation = StatisticalEvidence & {
  verdict: ExperimentVerdict
  businessCriterionMet: boolean
  minimumSampleSize: number
  rationale: string
}

function normalQuantile(confidenceLevel: number) {
  if (confidenceLevel >= 0.995) return 2.807
  if (confidenceLevel >= 0.99) return 2.576
  if (confidenceLevel >= 0.95) return 1.96
  if (confidenceLevel >= 0.90) return 1.645
  return 1.282
}

export function evaluateExperiment(input: {
  method?: EvaluationMethod
  control: number[]
  treatment: number[]
  minimumSampleSize?: number
  confidenceLevel?: number
  minimumEffect?: number
}): ExperimentEvaluation {
  const method = input.method ?? 'FREQUENTIST'
  const minimumSampleSize = input.minimumSampleSize ?? 30
  const confidenceLevel = input.confidenceLevel ?? 0.95
  const minimumEffect = input.minimumEffect ?? 0
  const sampleSize = input.control.length + input.treatment.length
  const controlMean = input.control.length ? input.control.reduce((a, b) => a + b, 0) / input.control.length : 0
  const treatmentMean = input.treatment.length ? input.treatment.reduce((a, b) => a + b, 0) / input.treatment.length : 0
  const effectSize = treatmentMean - controlMean

  if (!input.control.length || !input.treatment.length) {
    return { method, sampleSize, controlMean, treatmentMean, effectSize, confidenceLevel, confidenceInterval: { low: 0, high: 0 }, minimumSampleSize, businessCriterionMet: false, verdict: 'INVALID', rationale: 'Both control and treatment samples are required.', calculatedAt: new Date().toISOString() }
  }

  const controlVariance = input.control.reduce((s, x) => s + (x - controlMean) ** 2, 0) / Math.max(1, input.control.length - 1)
  const treatmentVariance = input.treatment.reduce((s, x) => s + (x - treatmentMean) ** 2, 0) / Math.max(1, input.treatment.length - 1)
  const standardError = Math.sqrt(controlVariance / input.control.length + treatmentVariance / input.treatment.length)
  const margin = normalQuantile(confidenceLevel) * standardError
  const interval = { low: effectSize - margin, high: effectSize + margin }
  const significant = interval.low > 0 || interval.high < 0
  const businessCriterionMet = effectSize >= minimumEffect
  const verdict = sampleSize < minimumSampleSize
    ? 'INCONCLUSIVE'
    : !significant
      ? 'INCONCLUSIVE'
      : businessCriterionMet ? 'SIGNIFICANT_WIN' : 'SIGNIFICANT_LOSS'

  return {
    method,
    sampleSize,
    controlMean,
    treatmentMean,
    effectSize,
    confidenceLevel,
    confidenceInterval: interval,
    pValue: undefined,
    minimumSampleSize,
    businessCriterionMet,
    verdict,
    rationale: sampleSize < minimumSampleSize
      ? 'Insufficient sample size; do not declare a winner.'
      : !significant
        ? 'Confidence interval crosses zero; observed effect is not statistically significant.'
        : businessCriterionMet ? 'Observed effect is statistically significant and meets the business criterion.' : 'Observed effect is statistically significant but does not meet the business criterion.',
    calculatedAt: new Date().toISOString(),
  }
}
