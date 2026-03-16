import { useState } from 'react'
import { PROVIDER_CONFIG, VENDORS } from '../lib/providers'

export default function ProviderSidebar({ selected, onToggle, onSelectAll }) {
  const [collapsed, setCollapsed] = useState(false)
  const [expandedVendors, setExpandedVendors] = useState(
    Object.fromEntries(VENDORS.map(v => [v, true]))
  )

  const providersByVendor = {}
  for (const [id, config] of Object.entries(PROVIDER_CONFIG)) {
    if (!providersByVendor[config.vendor]) providersByVendor[config.vendor] = []
    providersByVendor[config.vendor].push({ id, ...config })
  }

  function toggleVendor(vendor) {
    setExpandedVendors(prev => ({ ...prev, [vendor]: !prev[vendor] }))
  }

  return (
    <aside
      className="shrink-0 border-r transition-all duration-200 overflow-hidden min-h-screen"
      style={{
        width: collapsed ? '48px' : '220px',
        borderColor: 'var(--bg-medium)',
        background: 'var(--bg-darkest)',
      }}
    >
      {/* Toggle button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-center py-3 border-b hover:opacity-80"
        style={{ borderColor: 'var(--bg-medium)', color: 'var(--text-muted)' }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
      </button>

      {/* Model list */}
      {!collapsed && (
        <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 110px)' }}>
          <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            Select TTS Models to Compare
          </div>
          {selected.length < Object.keys(PROVIDER_CONFIG).length && (
            <button
              onClick={onSelectAll}
              className="text-[10px] hover:opacity-80 mb-3"
              style={{ color: 'var(--link)' }}
            >
              Select all
            </button>
          )}

          {VENDORS.map(vendor => (
            <div key={vendor} className="mb-2">
              {/* Vendor header */}
              <button
                onClick={() => toggleVendor(vendor)}
                className="flex items-center justify-between w-full text-xs font-medium py-1.5 hover:opacity-80"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <span>{vendor} ({(providersByVendor[vendor] || []).length})</span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  style={{
                    transform: expandedVendors[vendor] ? 'rotate(0deg)' : 'rotate(-90deg)',
                    transition: 'transform 150ms',
                  }}
                >
                  <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {/* Models */}
              {expandedVendors[vendor] && (providersByVendor[vendor] || []).map(model => (
                <ModelButton
                  key={model.id}
                  id={model.id}
                  label={model.label}
                  subtitle={model.subtitle}
                  color={model.color}
                  isSelected={selected.includes(model.id)}
                  isDg={model.id === 'deepgram-aura2'}
                  onToggle={onToggle}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Collapsed: show selected count */}
      {collapsed && (
        <div className="flex flex-col items-center py-3">
          <div className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            {selected.length}
          </div>
          <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {selected.length === 1 ? 'model' : 'models'}
          </div>
        </div>
      )}
    </aside>
  )
}

function ModelButton({ id, label, subtitle, color, isSelected, isDg, onToggle }) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={() => !isDg && onToggle(id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="model-btn w-full text-left text-xs py-1.5 px-2.5 mb-0.5 rounded"
      data-selected={isSelected}
      data-always-on={isDg}
      style={{
        background: isSelected ? `${color}18` : hovered ? 'var(--bg-lighter)' : 'transparent',
        borderLeft: isSelected ? `3px solid ${color}` : '3px solid transparent',
        color: isSelected ? 'var(--text-body)' : hovered ? 'var(--text-secondary)' : 'var(--text-disabled)',
      }}
    >
      <div>{label}</div>
      {isDg && (
        <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
          always on
        </div>
      )}
      {subtitle && (
        <div className="text-[10px] mt-0.5" style={{ color: isSelected ? 'var(--text-muted)' : 'var(--text-disabled)', opacity: 0.8 }}>
          {subtitle}
        </div>
      )}
    </button>
  )
}
