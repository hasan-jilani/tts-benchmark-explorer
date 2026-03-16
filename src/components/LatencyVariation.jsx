import { useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts'
import { PROVIDER_CONFIG, getChartLabel } from '../lib/providers'
import { computeBoxPlotStats, getLatencyCategories } from '../lib/stats'

// Custom X-axis tick (same as Chart 1)
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

// Custom bar shape that renders a box plot
function BoxPlotShape({ x, y, width, height, payload }) {
  if (!payload) return null
  const color = PROVIDER_CONFIG[payload.provider]?.color || '#666'
  const barWidth = Math.min(width * 0.7, 50)
  const cx = x + width / 2

  // y and height represent the p25-p75 range (set via dataKey tricks)
  // We need to compute pixel positions from the raw stats
  // The bar's y = top of bar (p75 pixel), height = box height
  const boxTop = y
  const boxBottom = y + height
  const boxLeft = cx - barWidth / 2
  const boxRight = cx + barWidth / 2

  // Whisker positions — we store pixel values in the data
  const whiskerTop = payload._p95y
  const whiskerBottom = payload._p5y
  const medianY = payload._p50y
  const capWidth = barWidth * 0.4

  return (
    <g>
      {/* Whisker line: p5 to p95 */}
      <line x1={cx} y1={whiskerTop} x2={cx} y2={whiskerBottom}
        stroke={color} strokeWidth={1.5} />

      {/* Whisker caps */}
      <line x1={cx - capWidth} y1={whiskerTop} x2={cx + capWidth} y2={whiskerTop}
        stroke={color} strokeWidth={1.5} />
      <line x1={cx - capWidth} y1={whiskerBottom} x2={cx + capWidth} y2={whiskerBottom}
        stroke={color} strokeWidth={1.5} />

      {/* Box: p25 to p75 */}
      <rect x={boxLeft} y={boxTop} width={barWidth} height={Math.max(height, 1)}
        fill={color} fillOpacity={0.25} stroke={color} strokeWidth={1.5} rx={3} />

      {/* Median line */}
      <line x1={boxLeft} y1={medianY} x2={boxRight} y2={medianY}
        stroke={color} strokeWidth={2.5} />

      {/* Outlier dots (within chart range) */}
      {(payload._outlierYs || []).map((oy, j) => (
        <circle key={j} cx={cx} cy={oy} r={2.5} fill={color} fillOpacity={0.5} />
      ))}
    </g>
  )
}

// Custom tooltip (same style as Chart 1)
function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const data = payload[0]?.payload
  if (!data) return null
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
        <div>p5: <span className="font-medium">{Math.round(data.p5)}ms</span></div>
        <div>p25: <span className="font-medium">{Math.round(data.p25)}ms</span></div>
        <div>Median: <span className="font-medium">{Math.round(data.p50)}ms</span></div>
        <div>p75: <span className="font-medium">{Math.round(data.p75)}ms</span></div>
        <div>p95: <span className="font-medium">{Math.round(data.p95)}ms</span></div>
        <div>Stdev: <span className="font-medium">{Math.round(data.stdev)}ms</span></div>
        <div style={{ color: 'var(--text-muted)' }}>n = {data.n}</div>
      </div>
    </div>
  )
}

export default function LatencyVariation({ data, selectedProviders }) {
  const [category, setCategory] = useState('all')

  const categories = useMemo(() => getLatencyCategories(data), [data])

  const stats = useMemo(
    () => computeBoxPlotStats(data, selectedProviders, category),
    [data, selectedProviders, category]
  )

  // Sort by median ascending
  const sorted = useMemo(() => {
    return [...stats].sort((a, b) => a.p50 - b.p50)
  }, [stats])

  // Y-axis: cap at highest p95 + headroom, 200ms increments
  const highestP95 = Math.max(...sorted.map(s => s.p95), 0)
  const maxValue = Math.ceil((highestP95 * 1.15) / 200) * 200

  // Count outliers above the cap
  const outlierCount = sorted.reduce((sum, s) =>
    sum + s.outliers.filter(v => v > maxValue).length, 0
  )

  // Prepare chart data — Recharts needs a single dataKey for the bar height
  // We use p75 as the bar top position and (p75 - p25) as height via a "range" trick:
  // dataKey = "boxHeight" (p75 - p25), with a y-offset base of p25
  // But Recharts Bar doesn't support base offset natively.
  // Instead: use a stacked approach — invisible bar from 0 to p25, then visible bar p25 to p75
  const chartData = useMemo(() => {
    return sorted.map(s => ({
      ...s,
      boxBase: s.p25,           // invisible spacer from 0 to p25
      boxHeight: s.p75 - s.p25, // visible box from p25 to p75
    }))
  }, [sorted])

  return (
    <div className="p-6 rounded-lg" style={{ background: 'var(--bg-dark)' }}>
      {/* Header */}
      <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
        Latency Variation
      </h2>
      <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
        Distribution of TTFA values — how consistent each model's response time is.
      </p>

      {/* Controls */}
      <div className="flex items-center gap-6 mt-3 mb-3">
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
      </div>

      {/* Chart */}
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={chartData}
            margin={{ top: 25, right: 25, left: 15, bottom: 15 }}
            barCategoryGap="20%"
          >
            <CartesianGrid horizontal={true} vertical={false} stroke="var(--bg-medium)" strokeWidth={0.5} />
            <XAxis
              dataKey="provider"
              tick={<CustomXTick />}
              axisLine={{ stroke: 'var(--bg-medium)' }}
              tickLine={false}
              interval={0}
              height={85}
              label={
                outlierCount > 0
                  ? ({ viewBox }) => {
                      const cx = viewBox.x + viewBox.width / 2
                      const by = viewBox.y + viewBox.height - 5
                      return (
                        <text x={cx} y={by} textAnchor="middle">
                          <tspan x={cx} dy={0} fill="var(--text-muted)" fontSize={11}>
                            Ranked by P50 latency
                          </tspan>
                          <tspan x={cx} dy={16} fill="var(--text-disabled)" fontSize={10}>
                            {outlierCount} statistical outlier{outlierCount !== 1 ? 's' : ''} above {maxValue >= 1000 ? `${(maxValue / 1000).toFixed(1)}s` : `${maxValue}ms`} not shown
                          </tspan>
                        </text>
                      )
                    }
                  : {
                      value: 'Ranked by P50 latency',
                      position: 'insideBottom',
                      offset: 5,
                      style: { fill: 'var(--text-muted)', fontSize: 11 },
                    }
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
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-lighter)', opacity: 0.3 }} />

            {/* Box plot — use p75 as dataKey so the bar top = p75 */}
            <Bar
              dataKey="p75"
              isAnimationActive={false}
              shape={(props) => {
                const { x, y, width, height, payload, background } = props
                if (!payload) return null
                const color = PROVIDER_CONFIG[payload.provider]?.color || '#666'
                const barWidth = Math.min(width * 0.6, 50)
                const cx = x + width / 2

                // Calculate scale: y is at p75, the bottom of chart (y + height) is at 0
                // So pixelsPerMs = (y + height - y) / p75 ... wait, height = p75 (bar from 0 to p75)
                // Actually: bar goes from 0 to p75. y = top (p75 pixel), y + height = bottom (0 pixel)
                const zeroY = y + height
                const pixelsPerMs = height / payload.p75
                const valToY = (v) => zeroY - v * pixelsPerMs

                const p5y = valToY(payload.p5)
                const p25y = valToY(payload.p25)
                const p50y = valToY(payload.p50)
                const p75y = valToY(payload.p75)
                const p95y = valToY(Math.min(payload.p95, maxValue))
                const capWidth = barWidth * 0.35

                const visibleOutliers = (payload.outliers || [])
                  .filter(v => v <= maxValue)
                  .slice(0, 10)

                return (
                  <g>
                    {/* Whisker line */}
                    <line x1={cx} y1={p95y} x2={cx} y2={p5y}
                      stroke={color} strokeWidth={1.5} />

                    {/* Whisker caps */}
                    <line x1={cx - capWidth} y1={p95y} x2={cx + capWidth} y2={p95y}
                      stroke={color} strokeWidth={1.5} />
                    <line x1={cx - capWidth} y1={p5y} x2={cx + capWidth} y2={p5y}
                      stroke={color} strokeWidth={1.5} />

                    {/* Box */}
                    <rect x={cx - barWidth / 2} y={p75y} width={barWidth} height={p25y - p75y}
                      fill={color} fillOpacity={0.25} stroke={color} strokeWidth={1.5} rx={3} />

                    {/* Median */}
                    <line x1={cx - barWidth / 2} y1={p50y} x2={cx + barWidth / 2} y2={p50y}
                      stroke={color} strokeWidth={2.5} />

                    {/* Outliers */}
                    {visibleOutliers.map((v, j) => (
                      <circle key={j} cx={cx} cy={valToY(v)} r={2.5}
                        fill={color} fillOpacity={0.5} />
                    ))}
                  </g>
                )
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-96 flex items-center justify-center" style={{ color: 'var(--text-disabled)' }}>
          No data for selected models
        </div>
      )}


      {/* Takeaway */}
      {sorted.length >= 2 && (
        <Takeaway stats={sorted} />
      )}
    </div>
  )
}

// Wrapper that injects pixel coordinates for whiskers/median/outliers
function BoxPlotShapeWrapper({ chartData, maxValue }) {
  return function ShapeRenderer(props) {
    const { x, y, width, height, index } = props
    if (index === undefined || !chartData[index]) return null

    const entry = chartData[index]

    // Calculate the chart's plot area from the bar position
    // The bar's y is at p75, y + height is at p25
    // So we can derive the scale: pixelsPerMs = height / (p75 - p25)
    const boxHeightMs = entry.p75 - entry.p25
    if (boxHeightMs <= 0) return null
    const pixelsPerMs = height / boxHeightMs

    // p75 pixel = y, so any value's pixel = y - (value - p75) * pixelsPerMs
    const valToY = (v) => y - (v - entry.p75) * pixelsPerMs

    const payload = {
      ...entry,
      _p95y: valToY(Math.min(entry.p95, maxValue)),
      _p5y: valToY(entry.p5),
      _p50y: valToY(entry.p50),
      _outlierYs: entry.outliers
        .filter(v => v <= maxValue)
        .slice(0, 10)
        .map(v => valToY(v)),
    }

    return <BoxPlotShape x={x} y={y} width={width} height={height} payload={payload} />
  }
}

function Takeaway({ stats }) {
  const dg = stats.find(s => s.provider === 'deepgram-aura2')
  if (!dg) return null

  const others = stats.filter(s => s.provider !== 'deepgram-aura2')
  if (!others.length) return null

  const dgRange = dg.p95 - dg.p5
  const widest = others.reduce((a, b) => ((b.p95 - b.p5) > (a.p95 - a.p5) ? b : a))
  const widestRange = widest.p95 - widest.p5
  const widestConfig = PROVIDER_CONFIG[widest.provider]

  let text
  if (dgRange <= widestRange) {
    const ratio = (widestRange / dgRange).toFixed(1)
    text = `Deepgram Aura-2 has the tightest latency distribution (p5–p95: ${Math.round(dg.p5)}–${Math.round(dg.p95)}ms). ${widestConfig?.vendor} ${getChartLabel(widest.provider)} has ${ratio}x wider variance (${Math.round(widest.p5)}–${Math.round(widest.p95)}ms).`
  } else {
    text = `Deepgram Aura-2 latency ranges from ${Math.round(dg.p5)}ms to ${Math.round(dg.p95)}ms (p5–p95).`
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
