// Statistical helpers for computing chart metrics from raw data

export function median(arr) {
  if (!arr.length) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export function mean(arr) {
  if (!arr.length) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

export function percentile(arr, p) {
  if (!arr.length) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const idx = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, idx)]
}

export function stdev(arr) {
  if (arr.length < 2) return 0
  const m = mean(arr)
  return Math.sqrt(arr.reduce((sum, v) => sum + (v - m) ** 2, 0) / (arr.length - 1))
}

// Compute latency stats for each provider from raw rows
// Filters by selected providers, optional category, and warmup
export function computeLatencyStats(data, selectedProviders, category, { includeWarmup = false } = {}) {
  const filtered = data.filter(r => {
    if (!selectedProviders.includes(r.provider)) return false
    if (category && category !== 'all' && r.category !== category) return false
    if (!r.ttfa_ms || r.ttfa_ms <= 0) return false
    if (!includeWarmup && r.is_warmup) return false
    return true
  })

  // Group by provider
  const byProvider = {}
  for (const row of filtered) {
    if (!byProvider[row.provider]) byProvider[row.provider] = []
    byProvider[row.provider].push(row.ttfa_ms)
  }

  // Compute stats per provider
  return Object.entries(byProvider).map(([provider, values]) => ({
    provider,
    median: median(values),
    mean: mean(values),
    p95: percentile(values, 95),
    stdev: stdev(values),
    n: values.length,
  }))
}

// Compute warmup penalty per provider
export function computeWarmupPenalty(data, selectedProviders, category) {
  const steadyState = computeLatencyStats(data, selectedProviders, category, { includeWarmup: false })

  // Filter to warmup-only rows
  const warmupFiltered = data.filter(r => {
    if (!selectedProviders.includes(r.provider)) return false
    if (category && category !== 'all' && r.category !== category) return false
    if (!r.ttfa_ms || r.ttfa_ms <= 0) return false
    // Handle both boolean and string values from Supabase
    const isWarmup = r.is_warmup === true || r.is_warmup === 'true'
    if (!isWarmup) return false
    return true
  })

  const warmupByProvider = {}
  for (const row of warmupFiltered) {
    if (!warmupByProvider[row.provider]) warmupByProvider[row.provider] = []
    warmupByProvider[row.provider].push(row.ttfa_ms)
  }

  return steadyState.map(s => {
    const warmupValues = warmupByProvider[s.provider] || []
    const warmupMean = warmupValues.length > 0 ? mean(warmupValues) : s.mean
    const penalty = Math.max(0, warmupMean - s.mean)
    return {
      provider: s.provider,
      steadyState: s.mean,
      coldStart: warmupMean,
      penalty,
      penaltyPct: s.mean > 0 ? (penalty / s.mean * 100) : 0,
      warmupN: warmupValues.length,
    }
  })
}

// Compute box plot stats for each provider
export function computeBoxPlotStats(data, selectedProviders, category) {
  const filtered = data.filter(r => {
    if (!selectedProviders.includes(r.provider)) return false
    if (category && category !== 'all' && r.category !== category) return false
    if (!r.ttfa_ms || r.ttfa_ms <= 0) return false
    const isWarmup = r.is_warmup === true || r.is_warmup === 'true'
    if (isWarmup) return false
    return true
  })

  const byProvider = {}
  for (const row of filtered) {
    if (!byProvider[row.provider]) byProvider[row.provider] = []
    byProvider[row.provider].push(row.ttfa_ms)
  }

  return Object.entries(byProvider).map(([provider, values]) => {
    const sorted = [...values].sort((a, b) => a - b)
    const p5 = percentile(values, 5)
    const p25 = percentile(values, 25)
    const p50 = median(values)
    const p75 = percentile(values, 75)
    const p95 = percentile(values, 95)
    const iqr = p75 - p25
    const lowerFence = p25 - 1.5 * iqr
    const upperFence = p75 + 1.5 * iqr
    const outliers = sorted.filter(v => v < lowerFence || v > upperFence)

    return {
      provider,
      p5,
      p25,
      p50,
      p75,
      p95,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean: mean(values),
      stdev: stdev(values),
      outliers,
      n: values.length,
    }
  })
}

// Get unique categories from latency data
export function getLatencyCategories(data) {
  return [...new Set(data.map(r => r.category))].sort()
}

// ── Accuracy / WER helpers ──────────────────────────────────

// Compute WER, PER, and Critical PER per provider
export function computeAccuracyStats(data, selectedProviders, category) {
  const filtered = data.filter(r => {
    if (!selectedProviders.includes(r.provider)) return false
    if (category && category !== 'all') {
      // category can be a top-level category or a subcategory
      if (r.category !== category && r.subcategory !== category) return false
    }
    return true
  })

  const byProvider = {}
  for (const row of filtered) {
    if (!byProvider[row.provider]) byProvider[row.provider] = []
    byProvider[row.provider].push(row)
  }

  return Object.entries(byProvider).map(([provider, rows]) => {
    const accuracies = rows
      .filter(r => r.word_accuracy != null)
      .map(r => r.word_accuracy)
    const wer = accuracies.length > 0
      ? (1 - mean(accuracies)) * 100
      : 0

    const total = rows.length
    const per = total > 0
      ? (rows.filter(r => r.match === false).length / total) * 100
      : 0
    const criticalPer = total > 0
      ? (rows.filter(r => r.severity === 'critical').length / total) * 100
      : 0

    return { provider, wer, per, criticalPer, n: total }
  })
}

// Get unique top-level categories from wer_results
export function getWerCategories(data) {
  return [...new Set(data.map(r => r.category).filter(Boolean))].sort()
}

// Get unique subcategories for a given top-level category
export function getWerSubcategories(data, category) {
  return [...new Set(
    data
      .filter(r => r.category === category)
      .map(r => r.subcategory)
      .filter(Boolean)
  )].sort()
}
