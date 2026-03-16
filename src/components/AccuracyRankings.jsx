import { useState, useMemo, useRef, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList, CartesianGrid } from 'recharts'
import { PROVIDER_CONFIG, getChartLabel } from '../lib/providers'
import { computeAccuracyStats, getWerCategories, getWerSubcategories } from '../lib/stats'

const METRICS = [
  { id: 'wer', label: 'WER', tooltip: 'Word Error Rate — percentage of words spoken incorrectly.' },
  { id: 'per', label: 'PER', tooltip: 'Pronunciation Error Rate — percentage of prompts with at least one mismatch.' },
  { id: 'criticalPer', label: 'Critical PER', tooltip: 'Critical Pronunciation Error Rate — percentage of prompts with a critical-severity mismatch.' },
]

const METRIC_LABELS = { wer: 'WER', per: 'PER', criticalPer: 'Critical PER' }

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

export default function AccuracyRankings({ data, selectedProviders }) {
  const [metric, setMetric] = useState('wer')
  const [category, setCategory] = useState('all')
  const [subcategory, setSubcategory] = useState('all')

  // Build category -> subcategory map for the dropdown
  const categoryMap = useMemo(() => {
    const cats = getWerCategories(data)
    const map = {}
    for (const cat of cats) {
      map[cat] = getWerSubcategories(data, cat)
    }
    return map
  }, [data])

  // Subcategories for the selected category
  const subcategories = useMemo(
    () => category !== 'all' ? categoryMap[category] || [] : [],
    [category, categoryMap]
  )

  // The filter value passed to stats: subcategory if chosen, else category
  const filterValue = subcategory !== 'all' ? subcategory : category

  const stats = useMemo(
    () => computeAccuracyStats(data, selectedProviders, filterValue),
    [data, selectedProviders, filterValue]
  )

  // Sort by selected metric ascending (lowest error first = best)
  const sorted = useMemo(() => {
    return [...stats].sort((a, b) => {
      // Sort by displayed value (1 decimal), with DG winning ties
      const aDisplay = a[metric].toFixed(1)
      const bDisplay = b[metric].toFixed(1)
      if (aDisplay === bDisplay) {
        // Tie — DG goes first
        if (a.provider === 'deepgram-aura2') return -1
        if (b.provider === 'deepgram-aura2') return 1
        return 0
      }
      return a[metric] - b[metric]
    })
  }, [stats, metric])

  // Y-axis max: round up to next 10% increment with headroom
  const maxMetric = Math.max(...sorted.map(s => s[metric]), 0)
  const maxValue = Math.ceil((maxMetric * 1.15) / 10) * 10 || 10
  const tickCount = maxValue / 10 + 1
  const ticks = Array.from({ length: tickCount }, (_, i) => i * 10)

  return (
    <div className="p-6 rounded-lg" style={{ background: 'var(--bg-dark)' }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Accuracy Rankings
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Pronunciation accuracy — how correctly each model speaks formatted entities, identifiers, and conversational text.
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
            onChange={e => { setCategory(e.target.value); setSubcategory('all') }}
            className="px-3 py-1.5 text-xs rounded border-none outline-none"
            style={{
              background: 'var(--bg-medium)',
              color: 'var(--text-body)',
            }}
          >
            <option value="all">All content types</option>
            {Object.keys(categoryMap).map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Subcategory filter — only shown when a category is selected */}
        {category !== 'all' && subcategories.length > 0 && (
          <div className="select-wrap">
            <select
              value={subcategory}
              onChange={e => setSubcategory(e.target.value)}
              className="px-3 py-1.5 text-xs rounded border-none outline-none"
              style={{
                background: 'var(--bg-medium)',
                color: 'var(--text-body)',
              }}
            >
              <option value="all">All {category}</option>
              {subcategories.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>
        )}
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
              height={70}
            />
            <YAxis
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              axisLine={{ stroke: 'var(--bg-medium)' }}
              tickLine={false}
              tickFormatter={v => `${Math.round(v)}%`}
              domain={[0, maxValue]}
              ticks={ticks}
              label={{
                value: `${METRIC_LABELS[metric]} (%)`,
                angle: -90,
                position: 'insideLeft',
                offset: -5,
                style: { fill: 'var(--text-muted)', fontSize: 11 },
              }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-lighter)', opacity: 0.3 }} />

            <Bar dataKey={metric} radius={[4, 4, 0, 0]} animationDuration={300}>
              <LabelList
                dataKey={metric}
                position="top"
                formatter={v => `${v.toFixed(1)}%`}
                style={{ fill: 'var(--text-body)', fontSize: 11, fontWeight: 500 }}
              />
              {sorted.map(entry => (
                <Cell
                  key={entry.provider}
                  fill={PROVIDER_CONFIG[entry.provider]?.color || '#666'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-96 flex items-center justify-center" style={{ color: 'var(--text-disabled)' }}>
          No data for selected models
        </div>
      )}

      {/* Takeaway */}
      {sorted.length >= 2 && (
        <Takeaway stats={sorted} metric={metric} category={filterValue} />
      )}

      {/* Audio samples — only when a subcategory is selected */}
      {subcategory !== 'all' && (
        <AudioSamples
          data={data}
          subcategory={subcategory}
          selectedProviders={selectedProviders}
        />
      )}
    </div>
  )
}

function CustomTooltip({ active, payload }) {
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
        <div>WER: <span className="font-medium">{data.wer.toFixed(1)}%</span></div>
        <div>PER: <span className="font-medium">{data.per.toFixed(1)}%</span></div>
        <div>Critical PER: <span className="font-medium">{data.criticalPer.toFixed(1)}%</span></div>
        <div style={{ color: 'var(--text-muted)' }}>n = {data.n}</div>
      </div>
    </div>
  )
}

function AudioSamples({ data, subcategory, selectedProviders }) {
  const [expanded, setExpanded] = useState(false)
  const audioRef = useRef(null) // currently playing HTMLAudioElement
  const [playingUrl, setPlayingUrl] = useState(null)

  const handlePlay = useCallback((url) => {
    if (!url) return
    // If clicking the same one that's playing, pause it
    if (audioRef.current && playingUrl === url) {
      audioRef.current.pause()
      audioRef.current = null
      setPlayingUrl(null)
      return
    }
    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause()
    }
    const audio = new Audio(url)
    audio.addEventListener('ended', () => {
      setPlayingUrl(null)
      audioRef.current = null
    })
    audio.play()
    audioRef.current = audio
    setPlayingUrl(url)
  }, [playingUrl])

  // Curate top examples: DG match + competitor critical
  const examples = useMemo(() => {
    const filtered = data.filter(
      r => r.subcategory === subcategory && selectedProviders.includes(r.provider)
    )

    // Group by prompt_id + provider, keep first iteration only
    const byPromptProvider = {}
    for (const row of filtered) {
      const key = `${row.prompt_id}:${row.provider}`
      if (!byPromptProvider[key]) byPromptProvider[key] = row
    }
    const deduped = Object.values(byPromptProvider)

    // Group by prompt_id
    const byPrompt = {}
    for (const row of deduped) {
      if (!byPrompt[row.prompt_id]) byPrompt[row.prompt_id] = []
      byPrompt[row.prompt_id].push(row)
    }

    // Find prompts where DG matched and at least one competitor is critical
    const candidates = []
    for (const [promptId, rows] of Object.entries(byPrompt)) {
      const dgRow = rows.find(r => r.provider === 'deepgram-aura2')
      if (!dgRow || dgRow.match !== true) continue

      const competitorRows = rows.filter(r => r.provider !== 'deepgram-aura2')
      const criticalCount = competitorRows.filter(r => r.severity === 'critical').length
      if (criticalCount === 0) continue

      candidates.push({
        promptId,
        original: dgRow.original,
        dgRow,
        competitors: competitorRows
          .filter(r => r.severity === 'critical' || r.severity === 'minor')
          .sort((a, b) => {
            // critical first, then minor
            if (a.severity === 'critical' && b.severity !== 'critical') return -1
            if (a.severity !== 'critical' && b.severity === 'critical') return 1
            return 0
          }),
        criticalCount,
      })
    }

    // Rank by number of critical competitors, take top 3
    candidates.sort((a, b) => b.criticalCount - a.criticalCount)
    return candidates.slice(0, 3)
  }, [data, subcategory, selectedProviders])

  if (examples.length === 0) return null

  return (
    <div
      className="mt-3 rounded-lg overflow-hidden"
      style={{ background: 'var(--bg-medium-dark)' }}
    >
      {/* Collapsible header */}
      <button
        onClick={() => setExpanded(prev => !prev)}
        className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium"
        style={{ color: 'var(--text-primary)', background: 'transparent' }}
      >
        <span
          className="inline-block transition-transform duration-200"
          style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
        >
          ▶
        </span>
        Hear examples
        <span
          className="ml-1 px-2 py-0.5 rounded-full text-xs font-medium"
          style={{ background: 'var(--bg-medium)', color: 'var(--text-muted)' }}
        >
          {examples.length} {examples.length === 1 ? 'example' : 'examples'}
        </span>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {examples.map((example, idx) => (
            <div
              key={example.promptId}
              className="rounded-lg p-4"
              style={{
                background: 'var(--bg-dark)',
                borderTop: idx > 0 ? '1px solid var(--bg-medium)' : 'none',
              }}
            >
              {/* Original prompt text */}
              <p className="text-sm mb-3" style={{ color: 'var(--text-body)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Prompt: </span>
                &ldquo;{example.original}&rdquo;
              </p>

              {/* DG row */}
              <AudioRow
                row={example.dgRow}
                isPlaying={playingUrl === example.dgRow.audio_url}
                onPlay={handlePlay}
              />

              {/* Competitor rows */}
              {example.competitors.map(row => (
                <AudioRow
                  key={row.provider}
                  row={row}
                  isPlaying={playingUrl === row.audio_url}
                  onPlay={handlePlay}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AudioRow({ row, isPlaying, onPlay }) {
  const config = PROVIDER_CONFIG[row.provider]
  const severityStyles = {
    match: { background: 'rgba(19, 239, 147, 0.15)', color: '#13ef93', label: 'MATCH' },
    critical: { background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', label: 'CRITICAL' },
    minor: { background: 'rgba(234, 179, 8, 0.15)', color: '#eab308', label: 'MINOR' },
  }
  const badge = row.match ? severityStyles.match : severityStyles[row.severity] || severityStyles.minor

  return (
    <div
      className="flex items-start gap-3 py-2"
      style={{ borderBottom: '1px solid var(--bg-medium)' }}
    >
      {/* Play button */}
      {row.audio_url ? (
        <button
          onClick={() => onPlay(row.audio_url)}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-sm"
          style={{ background: 'var(--bg-medium)', color: 'var(--text-primary)' }}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
      ) : (
        <div className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-xs"
          style={{ background: 'var(--bg-medium)', color: 'var(--text-disabled)' }}
          title="No audio available"
        >
          —
        </div>
      )}

      <div className="flex-1 min-w-0">
        {/* Provider name + badge */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium" style={{ color: config?.color || 'var(--text-body)' }}>
            {config?.vendor} {getChartLabel(row.provider)}
          </span>
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase"
            style={{ background: badge.background, color: badge.color }}
          >
            {badge.label}
          </span>
        </div>

        {/* Transcript */}
        <p
          className="text-xs leading-relaxed"
          style={{ color: 'var(--text-muted)', fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
        >
          {row.transcript || '(no transcript)'}
        </p>
      </div>
    </div>
  )
}

function Takeaway({ stats, metric, category }) {
  const dg = stats.find(s => s.provider === 'deepgram-aura2')
  if (!dg) return null

  const others = stats.filter(s => s.provider !== 'deepgram-aura2')
  if (!others.length) return null

  const dgVal = dg[metric]
  // For accuracy metrics, lower is better — find the best (lowest) competitor
  const best = others.reduce((a, b) => (a[metric] < b[metric] ? a : b))
  const bestVal = best[metric]
  const bestConfig = PROVIDER_CONFIG[best.provider]

  const metricLabel = METRIC_LABELS[metric]
  const categoryLabel = category === 'all' ? '' : ` on ${category} content`

  // Compare using displayed values so takeaway matches what the user sees
  const dgDisplay = dgVal.toFixed(1)
  const bestDisplay = bestVal.toFixed(1)

  let text
  if (dgDisplay === bestDisplay) {
    // Visually tied
    text = `Deepgram Aura-2 matches ${bestConfig?.vendor} ${getChartLabel(best.provider)} at ${dgDisplay}% ${metricLabel}${categoryLabel}.`
  } else if (dgVal < bestVal) {
    // DG leads
    const gap = bestVal - dgVal
    if (gap < 2) {
      text = `Deepgram Aura-2 edges out ${bestConfig?.vendor} ${getChartLabel(best.provider)} — ${dgDisplay}% vs ${bestDisplay}% ${metricLabel}${categoryLabel}.`
    } else {
      text = `Deepgram Aura-2 leads at ${dgDisplay}% ${metricLabel}${categoryLabel} — ${gap.toFixed(1)} percentage points lower than ${bestConfig?.vendor} ${getChartLabel(best.provider)} (${bestDisplay}%).`
    }
  } else {
    // DG is not best — use metric-specific "close" thresholds
    const gapPp = dgVal - bestVal
    const closeThreshold = metric === 'wer' ? 2 : 5 // percentage points
    if (gapPp <= closeThreshold) {
      text = `Deepgram Aura-2 is neck and neck with ${bestConfig?.vendor} ${getChartLabel(best.provider)} — ${dgDisplay}% vs ${bestDisplay}% ${metricLabel}${categoryLabel}.`
    } else {
      const behindPct = bestVal > 0 ? ((dgVal - bestVal) / bestVal * 100).toFixed(0) : '0'
      text = `Deepgram Aura-2 is within ${behindPct}% of ${bestConfig?.vendor} ${getChartLabel(best.provider)}${categoryLabel} at ${dgDisplay}% vs ${bestDisplay}% ${metricLabel}.`
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
