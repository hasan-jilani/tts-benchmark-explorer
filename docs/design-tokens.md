# Design Tokens — Deepgram Benchmark Explorer

Sourced from Deepgram Brand Guidelines. Dark theme application.

## Colors

### Primary (Deepgram Green — used for Deepgram data in all charts)
- Spring Green: `#13ef93` — primary brand green, Deepgram bars/dots/highlights
- Light Green: `#a1f9d4` — hover states, secondary highlights
- Dark Green: `#075433` — subtle backgrounds, borders

### Secondary (Blue — used for links, secondary UI)
- Blue: `#149afb` — links, secondary actions
- Light Blue: `#a1d7fd` — hover states

### Accent & Semantic
- Pink: `#ee028c` — accent, callouts
- Purple: `#ae63f9` — accent, alternative highlight
- Red: `#f04438` — errors, critical severity, "bad" in heatmap
- Yellow: `#fec84b` — warnings, minor severity
- Green: `#12b76a` — success, "good" in heatmap, match badges

### Dark Theme Backgrounds (darkest to lightest)
- Darkest: `#0b0b0c` — page background
- Dark: `#101014` — card backgrounds
- Medium dark: `#1a1a1f` — chart backgrounds, sidebar
- Medium: `#232329` — borders, dividers
- Lighter: `#2c2c33` — hover states on dark surfaces

### Dark Theme Text (lightest to darkest)
- White: `#fbfbff` — headings, primary text
- Light gray: `#ededf2` — body text
- Mid gray: `#e1e1e5` — secondary text
- Gray: `#bbbbbf` — tertiary text, labels
- Dark gray: `#949498` — muted text, axis labels
- Darker gray: `#4e4e52` — disabled text

### Link
- Link blue: `#79affa`

## Typography

### Headings: Roobert Pro
- Web font available (custom, needs hosting)
- Use for: page title, section headings (h1, h2)

### Body: Inter
- Google Fonts: `font-family: "Inter", sans-serif;`
- Weights: Light 300, Regular 500, Medium 600, Semi-bold 700, Bold 800
- Use for: subtitles (600-800), body copy (300-500), chart labels, tooltips

## Provider Color Assignments

Persistent colors across all charts. Deepgram always green.

| Provider | Color | Hex |
|---|---|---|
| Deepgram | Green (primary) | `#13ef93` |
| ElevenLabs | Blue | `#149afb` |
| Cartesia | Purple | `#ae63f9` |
| Rime | Pink | `#ee028c` |
| OpenAI | Yellow | `#fec84b` |

When multiple models per vendor are shown, use lighter/darker shades:
- ElevenLabs Flash: `#149afb`, Multilingual: `#a1d7fd`, v3: `#0a6fbd`
- Cartesia Sonic 3: `#ae63f9`, Turbo: `#d4a0ff`, Sonic 2: `#7b3ab8`

## Heatmap Colors

- Good (low latency / low WER): `#12b76a` → `#13ef93` (green spectrum)
- Bad (high latency / high WER): `#fec84b` → `#f04438` (yellow → red spectrum)
- Neutral: `#4e4e52` (dark gray)

## Severity Badges

- Match: `#12b76a` green background, white text
- Minor: `#fec84b` yellow background, dark text
- Critical: `#f04438` red background, white text

## Animations / Transitions

- Bar chart transitions: 300ms ease-out (bars slide to new positions on filter change)
- Tooltip fade: 150ms ease-in
- Toggle switch: 200ms ease
- Hover states: 150ms ease
- Keep animations subtle — data-focused, not flashy
