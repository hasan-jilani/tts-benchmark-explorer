// Provider metadata — colors, display order, vendor grouping
// priority: competitor importance for curation/display (lower = more important, 0 = DG)
export const PROVIDER_CONFIG = {
  'deepgram-aura2': {
    label: 'Aura-2',
    vendor: 'Deepgram',
    color: '#13ef93',       // green
    recommended: true,
    priority: 0,
  },
  'elevenlabs-flash-v2.5': {
    label: 'Flash v2.5',
    vendor: 'ElevenLabs',
    color: '#149afb',       // blue
    recommended: true,
    priority: 1,
  },
  'elevenlabs-multilingual-v2-norm-on': {
    label: 'Multilingual v2',
    subtitle: 'text norm on',
    vendor: 'ElevenLabs',
    color: '#00cfc1',       // teal-green
    priority: 2,
  },
  'elevenlabs-multilingual-v2-norm-off': {
    label: 'Multilingual v2',
    subtitle: 'text norm off',
    vendor: 'ElevenLabs',
    color: '#7b61ff',       // violet
    priority: 3,
  },
  'cartesia-sonic-3': {
    label: 'Sonic 3',
    vendor: 'Cartesia',
    color: '#ae63f9',       // purple
    recommended: true,
    priority: 4,
  },
  'openai-gpt-4o-mini-tts': {
    label: 'GPT-4o Mini TTS',
    vendor: 'OpenAI',
    color: '#fec84b',       // yellow
    recommended: true,
    priority: 5,
  },
  'openai-tts-1': {
    label: 'TTS-1',
    vendor: 'OpenAI',
    color: '#ff6b35',       // orange
    priority: 6,
  },
  'rime-mistv2-norm-on': {
    label: 'Mist v2',
    subtitle: 'text norm on',
    vendor: 'Rime',
    color: '#ee028c',       // hot pink
    recommended: true,
    priority: 7,
  },
  'rime-mistv2-norm-off': {
    label: 'Mist v2',
    subtitle: 'text norm off',
    vendor: 'Rime',
    color: '#c44601',       // burnt orange
    priority: 8,
  },
}

// Helper: get display label for charts
export function getChartLabel(id) {
  const config = PROVIDER_CONFIG[id]
  if (!config) return id
  if (config.subtitle) return `${config.label} (${config.subtitle})`
  return config.label
}

// Helper: get full label with vendor
export function getFullLabel(id) {
  const config = PROVIDER_CONFIG[id]
  if (!config) return id
  return `${config.vendor} ${getChartLabel(id)}`
}

// Default: all providers selected
export const DEFAULT_SELECTED = Object.keys(PROVIDER_CONFIG)

// Vendors in display order (matches provider priority)
export const VENDORS = ['Deepgram', 'ElevenLabs', 'Cartesia', 'OpenAI', 'Rime']
