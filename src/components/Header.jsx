const TABS = [
  { id: 'tts', label: 'Text-to-Speech' },
  { id: 'stt', label: 'Speech-to-Text' },
  { id: 'voice-agent', label: 'Voice Agent API' },
]

export default function Header({ activeTab, onTabChange }) {
  return (
    <header
      className="flex items-center justify-between px-6 py-3 border-b"
      style={{ borderColor: 'var(--bg-medium)', background: 'var(--bg-dark)' }}
    >
      {/* Left: Logo + title */}
      <div className="flex items-center gap-3 w-80 whitespace-nowrap">
        <img
          src="https://www.datocms-assets.com/96965/1683539914-logo.svg"
          alt="Deepgram"
          className="h-6"
          style={{ marginTop: '2px' }}
        />
        <span
          className="text-xl font-semibold tracking-tight"
          style={{ color: 'var(--text-primary)' }}
        >
          Benchmark Explorer
        </span>
      </div>

      {/* Center: Tabs */}
      <nav className="flex items-center gap-8">
        {TABS.map(tab => {
          const isActive = tab.id === activeTab
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="relative pb-3 pt-1 text-sm font-medium transition-colors duration-150 hover:opacity-80"
              style={{
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            >
              {tab.label}
              {isActive && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                  style={{ background: 'var(--dg-green)' }}
                />
              )}
            </button>
          )
        })}
      </nav>

      {/* Right: Links */}
      <div className="flex items-center justify-end gap-5 text-sm w-80">
        <a
          href="https://tts-comparison-demo.fly.dev/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:opacity-80 transition-opacity"
          style={{ color: 'var(--text-muted)' }}
        >
          Try TTS Demo
        </a>
        <button
          className="hover:opacity-80 transition-opacity"
          style={{ color: 'var(--text-muted)' }}
        >
          About
        </button>
      </div>
    </header>
  )
}
