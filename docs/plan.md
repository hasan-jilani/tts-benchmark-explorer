# TTS Benchmark Explorer — Plan

## What It Is

Public-facing interactive web app where prospects and sales reps can explore TTS benchmark data. Companion site to the [TTS Comparison Demo](https://tts-comparison-demo.fly.dev/). Not actively promoted — shared via link in sales conversations.

## Audience

- **Primary:** Prospects evaluating TTS providers for voice agents
- **Secondary:** Sales reps using it in live conversations
- **Tertiary:** Internal enablement (PMM, engineering)

## Scope

Both benchmarks visualized:
- **Latency** (TTFA) — how fast each provider starts speaking
- **WER** (pronunciation accuracy) — how correctly each provider speaks

## Key Views

### Narrative Arc
The prospect journey: fast → accurate → no tradeoff. Each section builds on the previous.

### Global Controls (persistent across all charts)

**Provider selector** — sidebar, grouped by vendor (ElevenLabs ›, Cartesia ›, etc.).
- Default selection: 1 recommended model per vendor (5 providers):
  - Deepgram Aura-2 (always on)
  - ElevenLabs Flash v2.5
  - Cartesia Sonic 3
  - Rime Mist v2
  - OpenAI gpt-4o-mini-tts
- Expand vendor to see/add additional models (e.g., ElevenLabs Multilingual, v3, Turbo)
- All charts update simultaneously when selection changes
- Each provider has a persistent color across all charts. Deepgram = green.

**Content type filters** — per-section, not global. Latency and WER have different prompt sets with different categories.
- Latency section filter: conversational-short, conversational-medium, conversational-long, customer-service, ivr, alphanumeric, mixed, casual
- WER section filter: conversational, identifiers, formatted-entities, mixed (plus 13 subcategories)
- Scatterplot: uses WER categories (since it maps latency vs accuracy)

**Note:** Not all providers have data for all charts (e.g., WER only has 3 providers so far). Charts should gracefully handle missing data — show available providers, note "data pending" for others.

### 1. Hero: Latency Rankings
Vertical bar chart. Deepgram anchored left, competitors trailing right. Sorted fastest to slowest.
- Default metric: median TTFA
- Metric toggle: median / mean / p95
- Error bars or variance indicators
- Deepgram bar in green, competitors in persistent per-provider colors
- Hover: tooltip with median, mean, p95, stdev, sample count
- Responds to content type filter (bars re-sort, values change, subtle animation on transition)
- Answers: "How fast does it start speaking?"

### 2. Latency Variation (deep dive)
Vertical box plots — one per provider, same left-to-right sort order as chart 1.
- Box: p25 to p75. Line: p50 (median). Whiskers: p5/p95. Dots: outliers.
- Shows consistency — Deepgram has tightest box, OpenAI has widest
- Same content type filter as chart 1 (shared within latency section)
- Hover: exact p25, p50, p75, p95, stdev values
- No toggles — box plot shows everything at once
- Answers: "How consistent is the latency?"

### 3. Accuracy Rankings
Vertical bar chart. Lowest WER on left, worst on right.
- Default metric: WER
- Metric toggle: WER / PER / Critical PER
- On PER/Critical PER: stacked bars — critical (dark) + minor (light) segments
- On WER: single-color bars
- WER section content type filter: conversational, identifiers, formatted-entities, mixed (plus subcategories)
- Hover: exact WER, PER, Critical PER, sample count
- Same provider colors as latency charts
- Answers: "How accurately does it pronounce things?"

### 4. Accuracy Deep Dive + Audio Samples (deep dive)
Subcategory breakdown with embedded audio examples.

**Chart:** Grouped bars or heatmap — providers as columns, subcategories as rows.
- Currency, tracking numbers, VINs, serial numbers, addresses, dates, etc.
- Metric toggle carries over from chart 3 (WER / PER / Critical PER)
- Hover: exact values per provider per subcategory
- Shows where Flash falls apart (currency 73% critical PER)
- Shows where Deepgram and Cartesia differ

**Audio samples:** Curated side-by-side comparisons per subcategory.
- Click subcategory row or "▶ Hear examples" button to expand
- Dynamic based on sidebar provider selection — only shows selected providers
- Always shows Deepgram match (green ✓) + selected competitors with critical errors (red ✗)
- Never shows competitor matches (no point) or DG errors (curated for impact)

**Curation logic:**
1. For each subcategory, find prompts where DG = match AND at least one selected competitor = critical
2. Pick 2-3 best examples per subcategory (most dramatic contrast)
3. If no DG match + competitor critical examples exist for a subcategory, no audio panel — just chart data
4. Never show a prompt where DG has any error (match only)

**Example (sidebar: Deepgram + Flash + Cartesia):**
  Currency → "Your balance is $320,540.54"
  ▶ Deepgram     ✓ MATCH  "...three hundred twenty thousand five hundred and forty dollars..."
  ▶ Flash        ✗ CRITICAL  "...three hundred twenty five forty fom"
  (Cartesia not shown — they got it right on this prompt)

**Per-provider display:**
- Play button (inline audio, no download/navigation)
- Severity badge (color-coded)
- Transcript text (muted font)

**Data source:** WAV files from WER benchmark (results-wer/audio/). Hosted in Supabase storage or S3.
- Answers: "What does a pronunciation error actually sound like?"

### 5. The Scatterplot: Latency vs Accuracy
The "aha moment" — TTFA on X, WER on Y. One dot per provider.
- Uses overall metrics (not content-type filtered — latency and WER use different prompt sets with only 7 overlapping prompts)
- Deepgram: bottom-left (fast + accurate)
- Cartesia: slightly right, same height (slower, equally accurate)
- ElevenLabs Flash: low X, high Y (fast but inaccurate)
- ElevenLabs Multilingual/v3: high X, lower Y (accurate but slow)
- Bubble size: TBD — price per character would add a third dimension (cheap + fast + accurate). Requires pricing data collection.
- Hover: provider name, exact TTFA, exact WER, price (if available)
- Follows sidebar provider selection
- No content type filter (overall metrics only)
- The payoff: prospect has seen latency and accuracy separately. The scatterplot confirms no tradeoff.
- Answers: "Is there a catch? Do I have to choose between speed and accuracy?"

### 6. Performance Heatmap
Providers as rows, metrics as columns. Color intensity = performance (green = good, red = bad, relative to best in column).

Toggle: "Latency | Accuracy" pill switch at top.

**Latency view columns:** p50 TTFA, p95 TTFA, stdev, price (when available)
**Accuracy view columns:** WER, PER, Critical PER, price (when available)

- Sortable columns — click header to sort by that metric
- Hover: exact value per cell
- Follows sidebar provider selection (hide/show rows)
- Deepgram's row uniformly green across both views
- The "reference table" — prospect can compare any metric at a glance
- Answers: "Give me the full picture in one view"

## Data Architecture

### Data Flow
```
New model or quarterly refresh
  → Run latency-benchmark.js + wer-benchmark.js locally
  → Results in CSV files
  → Push to Supabase via --push flag or upload script
  → Explorer reads from Supabase REST API
  → Frontend updates automatically (no redeploy)
```

### Database: Supabase (Postgres)
- Free tier sufficient for this volume
- Built-in REST API (PostgREST) — no backend needed
- Tables:

**latency_results**
| Column | Type |
|---|---|
| id | serial |
| provider | text |
| provider_label | text |
| prompt_id | int |
| category | text |
| text_length | int |
| iteration | int |
| is_warmup | boolean |
| ttfa_ms | float |
| rtf | float |
| total_time_ms | float |
| audio_duration_ms | float |
| total_bytes | int |
| error | text |
| run_timestamp | timestamptz |

**wer_results**
| Column | Type |
|---|---|
| id | serial |
| provider | text |
| provider_label | text |
| prompt_id | int |
| category | text |
| subcategory | text |
| iteration | int |
| original | text |
| transcript | text |
| match | boolean |
| word_accuracy | float |
| severity | text (critical/minor/none) |
| mismatched_words | jsonb |
| notes | text |
| run_timestamp | timestamptz |

**providers** (metadata)
| Column | Type |
|---|---|
| id | text (primary key) |
| label | text |
| vendor | text |
| model | text |
| protocol | text (websocket/http) |
| recommended_for | text |
| notes | text |

**benchmark_runs** (audit log)
| Column | Type |
|---|---|
| id | serial |
| type | text (latency/wer) |
| providers | text[] |
| prompts_count | int |
| runs_per_prompt | int |
| started_at | timestamptz |
| completed_at | timestamptz |
| environment | jsonb (machine, network, node version) |

### Push Mechanism
Add `--push` flag to both benchmark scripts:
```bash
node latency-benchmark.js --providers deepgram-aura2 --push
node wer-benchmark.js --providers cartesia-sonic-3 --push
```
Reads Supabase URL + key from `.env`. Uploads results after run completes. Could also be a separate `push-results.js` script that reads CSVs and uploads.

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React + Vite | Same as tts-comparison-demo, familiar |
| Charts | Recharts or Plotly | Interactive, supports scatterplot + bar + heatmap |
| Styling | Tailwind CSS | Same as tts-comparison-demo |
| Database | Supabase (Postgres) | Free, REST API, no backend needed |
| Hosting | Fly.io or Vercel | Same as tts-comparison-demo |
| Repo | `tts-benchmark-explorer/` | Separate from benchmark tool |

## Relationship to Other Projects

| Project | Purpose | Repo |
|---|---|---|
| tts-benchmark | Generate latency + WER data (CLI tool) | hasan-jilani/tts-benchmark |
| tts-benchmark-explorer | Visualize data (web app) | hasan-jilani/tts-benchmark-explorer (new) |
| tts-comparison-demo | Live TTS comparison (audio playback) | hasan-jilani/tts-comparison-demo |

The explorer is the "data story" companion to the demo's "hear it yourself" experience.

## Update Workflow

### Event-driven (new model release)
1. Add provider config to `providers.js`
2. Run latency: `node latency-benchmark.js --providers new-provider`
3. Run WER: `node wer-benchmark.js --providers new-provider`
4. Run severity: `node add-severity.js`
5. Push: `node push-results.js` (or `--push` flag)
6. Explorer updates automatically

### Quarterly refresh
1. Run all providers: `node latency-benchmark.js --all --runs 50`
2. Run WER: `node wer-benchmark.js --all`
3. Push results
4. Update "Last updated" timestamp in explorer

## Branding & Chrome

### Title
"Deepgram Benchmark Explorer" — future-proofs for STT and VA API tabs.

### Header
```
[Deepgram logo] Deepgram Benchmark Explorer

TTS | STT (coming soon) | Voice Agent API (coming soon) | About
```
- Deepgram logo same treatment as tts-comparison-demo
- Dark theme throughout (matches TTS demo and Coval)
- STT and VA API tabs link to "coming soon" page with CTA to product page/docs/playground

### About / Methodology Page
Combined "About This Benchmark" page:
- Who runs it — Deepgram (transparent, not hidden)
- How it's run — methodology summary (latency: sequential, 20 runs, warmup; WER: TTS→STT→Haiku)
- Link to open-source GitHub repo (full benchmark code)
- Link to Coval's independent benchmark (third-party validation)
- How often it's updated (event-driven + quarterly)
- Acknowledged limitations (single location, residential network, etc.)
- This is the credibility page — when a prospect asks "isn't it biased?" the rep sends them here

### Footer
- "Benchmarks by Deepgram" with link to deepgram.com
- Link to GitHub methodology
- "Last updated: March 2026" timestamp
- Links: About | GitHub | TTS Demo | Contact Sales

### Disclosure
Transparent throughout:
- Header: "Deepgram Benchmark Explorer" (not hiding who runs it)
- About page: full methodology disclosure
- Footer: "Benchmarks by Deepgram" + GitHub link
- Open source code = anyone can verify or reproduce

### CTA
Minimal for v1 (sales-driven, prospects already in funnel):
- "Try the TTS Demo" button (links to tts-comparison-demo.fly.dev)
- "Contact Sales" link
- Bottom of page, not aggressive — data sells itself

### Mobile
Responsive design from v1. Prospects may open the link on their phone during a sales call. Charts should stack vertically and remain readable on smaller screens.

## Open Questions

1. **Audio hosting** — WAV files for accuracy deep dive need hosting. Supabase storage or S3? Or bundle with the frontend deploy?
2. **Price data** — Include pricing in scatterplot bubble size and heatmap? Requires data collection. Coval has it.
3. **Raw data download** — Let visitors download CSVs? Builds trust but gives competitors your data.

## Milestones

1. **Scaffold frontend** — React + Vite + Tailwind, dark theme, deploy to Fly.io
2. **Database setup** — Supabase tables, push script from benchmark CSVs
3. **Provider sidebar** — persistent selector with vendor grouping
4. **Chart 1: Latency Rankings** — hero bar chart with metric toggle + warmup toggle
5. **Chart 2: Latency Variation** — box plots
6. **Chart 3: Accuracy Rankings** — bar chart with WER/PER/Critical PER toggle
7. **Chart 4: Accuracy Deep Dive** — subcategory breakdown + audio samples
8. **Chart 5: Scatterplot** — TTFA vs WER
9. **Chart 6: Heatmap** — sortable performance table
10. **About page** — methodology, disclosure, GitHub link
11. **Polish** — loading states, mobile responsive, animations
12. **STT / VA API tabs** — coming soon pages
