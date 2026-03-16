import { useState } from 'react'
import Header from './components/Header'
import ProviderSidebar from './components/ProviderSidebar'
import DataStatus from './components/DataStatus'
import LatencyRankings from './components/LatencyRankings'
import LatencyVariation from './components/LatencyVariation'
import { useLatencyData, useWerData } from './lib/hooks'
import { DEFAULT_SELECTED, PROVIDER_CONFIG } from './lib/providers'

export default function App() {
  const [activeTab, setActiveTab] = useState('tts')
  const [selectedProviders, setSelectedProviders] = useState(DEFAULT_SELECTED)
  const latency = useLatencyData()
  const wer = useWerData()

  function toggleProvider(id) {
    if (id === 'deepgram-aura2') return // always on
    setSelectedProviders(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-darkest)' }}>
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex">
        {activeTab === 'tts' && (
          <ProviderSidebar
            selected={selectedProviders}
            onToggle={toggleProvider}
            onSelectAll={() => setSelectedProviders(Object.keys(PROVIDER_CONFIG))}
          />
        )}
        <main className="flex-1 p-6 space-y-6">
          {activeTab === 'tts' ? (
            <>
              {!latency.loading && !latency.error && (
                <>
                  <LatencyRankings
                    data={latency.data}
                    selectedProviders={selectedProviders}
                  />
                  <LatencyVariation
                    data={latency.data}
                    selectedProviders={selectedProviders}
                  />
                </>
              )}
              {latency.loading && (
                <div className="p-6 rounded-lg" style={{ background: 'var(--bg-dark)', color: 'var(--text-disabled)' }}>
                  Loading latency data...
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 200px)' }}>
              <div className="text-center">
                <h2 className="text-2xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  {activeTab === 'stt' ? 'Speech-to-Text' : 'Voice Agent API'} Benchmarks
                </h2>
                <p style={{ color: 'var(--text-muted)' }}>
                  Coming soon
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
