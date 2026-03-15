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

**Provider selector** — sidebar or top bar (like Coval). Select/deselect any provider. All charts update simultaneously. Deepgram always on by default. Grouped by vendor (ElevenLabs ›, Cartesia ›, etc.).

**Content type filter** — global dropdown or pill selector. Filter all charts to a specific content type or category. Options:
- All (default)
- Conversational
- Alphanumeric (all)
  - Identifiers
  - Formatted Entities
  - Mixed
- Individual subcategories (currency, tracking, VINs, etc.)

Every chart below responds to both controls.

### 1. Hero: Latency Rankings
Bar chart sorted by median TTFA. Deepgram clearly #1. Immediate visual impact.
- Deepgram visually highlighted (color, label, or annotation)
- Metric toggle: median / mean / p95
- Error bars showing variance
- Hover: exact values, sample count
- Click bar: highlight that provider across all charts
- Answers: "How fast does it start speaking?"

### 2. Latency Variation
Box plots showing TTFA distribution per provider.
- Shows consistency — Deepgram has tightest spread
- p25, p50, p75, whiskers, outliers visible
- Responds to global content type filter (distribution changes by content)
- Hover: exact percentile values

### 3. Accuracy Rankings
Bar chart by provider showing pronunciation accuracy.
- Metric toggle: WER / PER / Critical PER
- Severity toggle: show critical only, minor only, or both (stacked)
- Category filter integrates with global control
- Hover: exact values, sample count
- Click bar: highlight provider across all charts
- Answers: "How accurately does it pronounce things?"

### 4. Accuracy Deep Dive
Subcategory breakdown (13 subcategories).
- Grouped bar or heatmap showing per-subcategory accuracy
- Currency, tracking numbers, VINs, serial numbers, etc.
- Shows where Flash falls apart (currency 73% critical PER)
- Shows where Deepgram and Cartesia differ
- Metric toggle carries over from section 3
- Hover: exact values per provider per subcategory

### 5. The Scatterplot: Latency vs Accuracy
The "aha moment" — TTFA on X, WER on Y. Each provider is a dot.
- Deepgram: bottom-left (fast + accurate)
- Cartesia: slightly right, same height (slower, equally accurate)
- ElevenLabs Flash: low X, high Y (fast but inaccurate)
- ElevenLabs Multilingual/v3: high X, lower Y (accurate but slow)
- Bubble size = optional third dimension (consistency? p95?)
- Responds to global content type filter — dots shift when filtering to alphanumeric
- Hover: provider name, exact TTFA, exact WER
- Click: highlight provider across all charts
- The payoff: prospect has seen latency and accuracy separately. The scatterplot confirms no tradeoff.

### 6. Content Type Sensitivity Heatmap
Providers as rows, content types as columns. Color intensity = performance.
- Toggle between latency heatmap and accuracy heatmap
- Deepgram's row uniformly green (content-agnostic)
- Cartesia/ElevenLabs show red spots on alphanumeric
- Sortable columns (click header to sort by that content type)
- Hover: exact value per cell
- Responds to provider selector (hide/show rows)

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

## Open Questions

1. **Audio playback in explorer?** Could embed WAV files for WER mismatches so prospects can hear the errors. Would need audio file hosting (Supabase storage or S3).
2. **Methodology page?** Static page explaining how benchmarks are run, linking to GitHub repo for transparency.
3. **Raw data download?** Let visitors download CSVs for their own analysis?
4. **Deepgram branding?** Subtle or prominent? This is a Deepgram-run benchmark, should be transparent about that.
5. **Mobile responsive?** Probably not priority for v1 — reps use it on laptops in sales calls.

## Milestones

1. **Database setup** — Supabase tables, push script
2. **Scaffold frontend** — React + Vite + Tailwind, deploy to Fly.io
3. **Hero chart** — TTFA vs WER scatterplot with filters
4. **TTFA view** — bar chart with content type filters
5. **WER view** — bar chart with category hierarchy
6. **Provider comparison** — side-by-side view
7. **Polish** — methodology page, branding, loading states
8. **Connect to live data** — push script, auto-refresh
