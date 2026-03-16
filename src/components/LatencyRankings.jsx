import { useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList, CartesianGrid } from 'recharts'
import { PROVIDER_CONFIG, getChartLabel } from '../lib/providers'
import { computeLatencyStats, computeWarmupPenalty, getLatencyCategories } from '../lib/stats'

const METRICS = [
  { id: 'median', label: 'Median', tooltip: 'The middle value. Half of responses are faster, half slower.' },
  { id: 'mean', label: 'Mean', tooltip: 'The average across all responses.' },
  { id: 'p95', label: 'p95', tooltip: '95th percentile. Only 5% of responses are slower than this.' },
]

// Custom X-axis tick: model line 1, vendor line 2, subtitle line 3
function CustomXTick({ x, y, payload }) {
  const config = PROVIDER_CONFIG[payload.value]
  if (!config) return null

  return (
    <g transform={`translate(${x},${y + 8})`}>
      <text textAnchor="middle" fill="var(--text-body)" fontSize={11} fontWeight={500}>
        {config.label}
      </text>
      <text textAnchor="middle" fill="var(--text-muted)" fontSize={10} dy={14}>
        {config.vendor}
      </text>
      {config.subtitle && (
        <text textAnchor="middle" fill="var(--text-disabled)" fontSize={9} dy={26}>
          {config.subtitle}
        </text>
      )}
    </g>
  )
}

// Custom overlay that draws translucent penalty extensions on top of bars
function WarmupOverlay({ formattedGraphicalItems, data, yAxisMap }) {
  if (!formattedGraphicalItems?.length) return null
  const bars = formattedGraphicalItems[0]?.props?.data || []
  const yAxis = Object.values(yAxisMap || {})[0]
  if (!yAxis) return null

  return (
    <g>
      {bars.map((bar, i) => {
        const entry = data[i]
        if (!entry || entry.warmupPenalty <= 0) return null

        const penaltyHeight = (entry.warmupPenalty / (yAxis.domain?.[1] || 1)) * (yAxis.height || 0)
        const barX = bar.x
        const barWidth = bar.width
        const barTopY = bar.y // top of the steady-state bar

        return (
          <g key={entry.provider}>
            {/* Translucent extension */}
            <rect
              x={barX}
              y={barTopY - penaltyHeight}
              width={barWidth}
              height={penaltyHeight}
              rx={4}
              ry={4}
              fill={PROVIDER_CONFIG[entry.provider]?.color || '#666'}
              fillOpacity={0.25}
            />
            {/* Penalty label */}
            <text
              x={barX + barWidth / 2}
              y={barTopY - penaltyHeight - 5}
              textAnchor="middle"
              fill="#fec84b"
              fontSize={10}
              fontWeight={500}
            >
              +{Math.round(entry.warmupPenalty)}ms
            </text>
          </g>
        )
      })}
    </g>
  )
}

export default function LatencyRankings({ data, selectedProviders }) {
  const [metric, setMetric] = useState('mean')
  const [category, setCategory] = useState('all')
  const [showWarmup, setShowWarmup] = useState(false)

  const categories = useMemo(() => getLatencyCategories(data), [data])

  const stats = useMemo(
    () => computeLatencyStats(data, selectedProviders, category),
    [data, selectedProviders, category]
  )

  const warmupPenalties = useMemo(
    () => showWarmup ? computeWarmupPenalty(data, selectedProviders, category) : [],
    [data, selectedProviders, category, showWarmup]
  )

  // Merge warmup data into stats
  const chartData = useMemo(() => {
    const penaltyMap = {}
    for (const p of warmupPenalties) {
      penaltyMap[p.provider] = p
    }
    return stats.map(s => ({
      ...s,
      // Use tiny non-zero value so Recharts renders the bar (and its label)
      warmupPenalty: Math.max(0.001, penaltyMap[s.provider]?.penalty || 0),
      warmupPenaltyRaw: Math.max(0, penaltyMap[s.provider]?.penalty || 0),
      coldStart: penaltyMap[s.provider]?.coldStart || 0,
    }))
  }, [stats, warmupPenalties])

  // Sort by selected metric ascending (fastest first)
  const sorted = useMemo(() => {
    return [...chartData].sort((a, b) => {
      const aDisplay = Math.round(a[metric])
      const bDisplay = Math.round(b[metric])
      if (aDisplay === bDisplay) {
        if (a.provider === 'deepgram-aura2') return -1
        if (b.provider === 'deepgram-aura2') return 1
        return 0
      }
      return a[metric] - b[metric]
    })
  }, [chartData, metric])

  // Y-axis max: round up to next 200ms increment, with headroom for data labels
  const maxMetric = Math.max(...sorted.map(s => s[metric]), 0)
  const maxWithPenalty = Math.max(...sorted.map(s => s[metric] + (s.warmupPenaltyRaw || 0)), 0)
  const rawMax = showWarmup ? maxWithPenalty : maxMetric
  // Add ~10% headroom so data labels + gray cursor overlay don't overlap
  const maxValue = Math.ceil((rawMax * 1.1) / 200) * 200

  return (
    <div className="p-6 rounded-lg" style={{ background: 'var(--bg-dark)' }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Latency Rankings
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Time to First Audio (TTFA) — how long until the listener hears the first sound after text is sent.
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-6 mt-3 mb-3">
        {/* Metric toggle */}
        <div className="flex items-center gap-1 p-0.5 rounded-md" style={{ background: 'var(--bg-medium)' }}>
          {METRICS.map(m => (
            <button
              key={m.id}
              onClick={() => setMetric(m.id)}
              title={m.tooltip}
              className="px-3 py-1 text-xs font-medium rounded transition-colors duration-150"
              style={{
                background: metric === m.id ? 'var(--bg-lighter)' : 'transparent',
                color: metric === m.id ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Category filter */}
        <div className="select-wrap">
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="px-3 py-1.5 text-xs rounded border-none outline-none"
            style={{
              background: 'var(--bg-medium)',
              color: 'var(--text-body)',
            }}
          >
            <option value="all">All content types</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Warmup penalty toggle */}
        <label className="flex items-center gap-2 text-xs cursor-pointer" title="How much slower the first request is before the connection is warmed up." style={{ color: 'var(--text-muted)' }}>
          <input
            type="checkbox"
            checked={showWarmup}
            onChange={e => setShowWarmup(e.target.checked)}
            className="accent-current"
            style={{ accentColor: 'var(--dg-green)' }}
          />
          Show cold start penalty
        </label>
      </div>

      {/* Chart */}
      {sorted.length > 0 ? (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={sorted}
            margin={{ top: 25, right: 25, left: 15, bottom: 5 }}
            barCategoryGap="20%"
          >
            <CartesianGrid horizontal={true} vertical={false} stroke="var(--bg-medium)" strokeWidth={0.5} />
            <XAxis
              dataKey="provider"
              tick={<CustomXTick />}
              axisLine={{ stroke: 'var(--bg-medium)' }}
              tickLine={false}
              interval={0}
              height={showWarmup ? 85 : 70}
              label={
                showWarmup
                  ? ({ viewBox }) => {
                      const cx = viewBox.x + viewBox.width / 2
                      const by = viewBox.y + viewBox.height - 5
                      const gap = 8
                      const ss = 'Steady state'
                      const csp = 'Cold start penalty'
                      const boxSize = 8
                      const ssWidth = ss.length * 5.5 + boxSize + 4
                      const totalWidth = ssWidth + gap + csp.length * 5.5 + boxSize + 4
                      const startX = cx - totalWidth / 2
                      return (
                        <g>
                          <rect x={startX} y={by - boxSize / 2 - 1} width={boxSize} height={boxSize} rx={2} fill="var(--text-muted)" />
                          <text x={startX + boxSize + 4} y={by} fill="var(--text-muted)" fontSize={10} dominantBaseline="central">
                            {ss}
                          </text>
                          <rect x={startX + ssWidth + gap} y={by - boxSize / 2 - 1} width={boxSize} height={boxSize} rx={2} fill="var(--text-muted)" fillOpacity={0.25} />
                          <text x={startX + ssWidth + gap + boxSize + 4} y={by} fill="var(--text-muted)" fontSize={10} dominantBaseline="central">
                            {csp}
                          </text>
                        </g>
                      )
                    }
                  : undefined
              }
            />
            <YAxis
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              axisLine={{ stroke: 'var(--bg-medium)' }}
              tickLine={false}
              tickFormatter={v => `${Math.round(v)}ms`}
              domain={[0, maxValue]}
              ticks={Array.from({ length: maxValue / 200 + 1 }, (_, i) => i * 200)}
              label={{
                value: 'TTFA (ms)',
                angle: -90,
                position: 'insideLeft',
                offset: -5,
                style: { fill: 'var(--text-muted)', fontSize: 11 },
              }}
            />
            <Tooltip content={<CustomTooltip showWarmup={showWarmup} />} cursor={{ fill: 'var(--bg-lighter)', opacity: 0.3 }} />

            {showWarmup ? (
              <>
                {/* Steady state bar (base of stack) */}
                <Bar dataKey={metric} stackId="stack" animationDuration={300}>
                  {sorted.map(entry => (
                    <Cell
                      key={entry.provider}
                      fill={PROVIDER_CONFIG[entry.provider]?.color || '#666'}
                    />
                  ))}
                </Bar>

                {/* Penalty extension (stacked on top, translucent) */}
                <Bar dataKey="warmupPenalty" stackId="stack" radius={[4, 4, 0, 0]} animationDuration={300}>
                  <LabelList
                    content={({ x, y, width, index }) => {
                      const entry = sorted[index]
                      if (!entry) return null
                      const total = Math.round(entry[metric] + (entry.warmupPenaltyRaw || 0))
                      const penalty = Math.round(entry.warmupPenaltyRaw || 0)
                      return (
                        <g>
                          <text x={x + width / 2} y={y - 18} textAnchor="middle" fill="var(--text-body)" fontSize={11} fontWeight={500}>
                            {total}ms
                          </text>
                          <text x={x + width / 2} y={y - 5} textAnchor="middle" fill="#fec84b" fontSize={10} fontWeight={500}>
                            +{penalty}ms
                          </text>
                        </g>
                      )
                    }}
                  />
                  {sorted.map(entry => (
                    <Cell
                      key={entry.provider}
                      fill={PROVIDER_CONFIG[entry.provider]?.color || '#666'}
                      fillOpacity={0.25}
                    />
                  ))}
                </Bar>
              </>
            ) : (
              /* Single bar with label on top */
              <Bar dataKey={metric} radius={[4, 4, 0, 0]} animationDuration={300}>
                <LabelList
                  dataKey={metric}
                  position="top"
                  formatter={v => `${Math.round(v)}ms`}
                  style={{ fill: 'var(--text-body)', fontSize: 11, fontWeight: 500 }}
                />
                {sorted.map(entry => (
                  <Cell
                    key={entry.provider}
                    fill={PROVIDER_CONFIG[entry.provider]?.color || '#666'}
                  />
                ))}
              </Bar>
            )}
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-96 flex items-center justify-center" style={{ color: 'var(--text-disabled)' }}>
          No data for selected models
        </div>
      )}

      {/* Takeaway */}
      {sorted.length >= 2 && (
        <Takeaway stats={sorted} metric={metric} category={category} showWarmup={showWarmup} />
      )}
    </div>
  )
}

function CustomTooltip({ active, payload, showWarmup }) {
  if (!active || !payload?.length) return null
  const data = payload[0].payload
  const config = PROVIDER_CONFIG[data.provider]

  return (
    <div
      className="px-3 py-2 rounded text-xs shadow-lg"
      style={{ background: 'var(--bg-medium-dark)', border: '1px solid var(--bg-medium)' }}
    >
      <div className="font-medium mb-1.5" style={{ color: config?.color || 'var(--text-primary)' }}>
        {config?.vendor} {getChartLabel(data.provider)}
      </div>
      <div className="space-y-0.5" style={{ color: 'var(--text-body)' }}>
        <div>Median: <span className="font-medium">{Math.round(data.median)}ms</span></div>
        <div>Mean: <span className="font-medium">{Math.round(data.mean)}ms</span></div>
        <div>p95: <span className="font-medium">{Math.round(data.p95)}ms</span></div>
        <div>Stdev: <span className="font-medium">{Math.round(data.stdev)}ms</span></div>
        {showWarmup && data.warmupPenalty > 0 && (
          <div style={{ color: 'var(--color-warning)' }}>
            Cold start penalty: <span className="font-medium">+{Math.round(data.warmupPenalty)}ms</span>
          </div>
        )}
        <div style={{ color: 'var(--text-muted)' }}>n = {data.n}</div>
      </div>
    </div>
  )
}

function Takeaway({ stats, metric, category, showWarmup }) {
  const dg = stats.find(s => s.provider === 'deepgram-aura2')
  if (!dg) return null

  const others = stats.filter(s => s.provider !== 'deepgram-aura2')
  if (!others.length) return null

  const dgVal = dg[metric]
  const closest = others.reduce((a, b) => (a[metric] < b[metric] ? a : b))
  const closestVal = closest[metric]
  const closestConfig = PROVIDER_CONFIG[closest.provider]
  const gap = ((closestVal - dgVal) / dgVal * 100).toFixed(0)

  const metricLabel = metric === 'p95' ? 'p95 TTFA' : `${metric} TTFA`
  const categoryLabel = category === 'all' ? '' : ` on ${category} content`

  let text
  if (dgVal <= closestVal) {
    if (gap < 5) {
      text = `Deepgram Aura-2 edges out ${closestConfig?.vendor} ${getChartLabel(closest.provider)} — ${Math.round(dgVal)}ms vs ${Math.round(closestVal)}ms ${metricLabel}${categoryLabel}.`
    } else {
      text = `Deepgram Aura-2 leads at ${Math.round(dgVal)}ms ${metricLabel}${categoryLabel} — ${gap}% faster than ${closestConfig?.vendor} ${getChartLabel(closest.provider)} (${Math.round(closestVal)}ms).`
    }
  } else {
    const behindPct = ((dgVal - closestVal) / closestVal * 100)
    if (behindPct <= 15) {
      text = `Deepgram Aura-2 is neck and neck with ${closestConfig?.vendor} ${getChartLabel(closest.provider)} — ${Math.round(dgVal)}ms vs ${Math.round(closestVal)}ms ${metricLabel}${categoryLabel}.`
    } else {
      text = `Deepgram Aura-2 is within ${behindPct.toFixed(0)}% of ${closestConfig?.vendor} ${getChartLabel(closest.provider)}${categoryLabel} at ${Math.round(dgVal)}ms vs ${Math.round(closestVal)}ms ${metricLabel}.`
    }
  }

  if (showWarmup && dg.warmupPenalty >= 0) {
    const worstPenalty = others.reduce((a, b) => (a.warmupPenalty > b.warmupPenalty ? a : b))
    if (worstPenalty.warmupPenalty > dg.warmupPenalty * 2 && worstPenalty.warmupPenalty > 10) {
      const wpConfig = PROVIDER_CONFIG[worstPenalty.provider]
      text += ` ${wpConfig?.vendor} ${getChartLabel(worstPenalty.provider)} has a ${Math.round(worstPenalty.warmupPenalty)}ms cold start penalty vs Deepgram's ${Math.round(dg.warmupPenalty)}ms.`
    }
  }

  return (
    <div
      className="mt-2 px-4 py-3 rounded text-sm"
      style={{ background: 'var(--bg-medium-dark)', borderLeft: '3px solid var(--dg-green)', color: 'var(--text-secondary)' }}
    >
      {text}
    </div>
  )
}
