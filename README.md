# PressRank

**Blind, community-driven credibility ratings for news-spreading channels** — YouTube creators, Instagram pages, TV broadcasters, anyone. You judge *anonymized statements*, not brands; the source is revealed only after you vote. That blindness is what makes the ranking hard to game.

The backend is **fully automated** — discovery, info collection, reach stats, and provenance-pinned statement harvesting all run on free AI + platform APIs. **The one thing that is not automated is the rating itself** — that stays community-driven.

Built to deploy on **Vercel** (Next.js App Router) with **Supabase** (Postgres + Auth).

---

## Architecture

```
app/
  api/
    leaderboard        GET  ranked channels for a dimension
    scatter            GET  points for Bias×Credibility / Reach×Trust maps
    channels/[id]      GET  channel profile (radar, reach, recent statements)
    arena/next         GET  one anonymized slate (pairwise or top-k)
    arena/vote         POST cast a vote -> returns the reveal
    channels           GET  lightweight channel list (pickers + filters)
    cron/collect       GET/POST  automated collection (Vercel Cron)
    cron/recompute     GET/POST  recompute ratings (Vercel Cron)
  arena/ leaderboard/ channel/[id]/ compare/ share/ login/   full UI (Claude design, wired to the API)
components/
  Header.tsx Footer.tsx          shared chrome (nav, theme toggle, auth pill)
  charts/    Scatter / Radar / Bars (MiniBar, CmpBar) — SVG, theme-aware
lib/
  ai/        provider-agnostic AIProvider + gemini & openai-compat adapters
  collect/   pipeline: discover→stats→harvest→tag→slates + youtube client
  rating/    shared top-k + pairwise scoring engine, shrinkage, weighting
  supabase/  client/server/admin + types
  ui/        theme (light/dark palette + CSS vars), useAuth, dims
  api/       cron auth, turnstile, rate limit
supabase/migrations/   SQL schema + RLS
scripts/seed-channels.ts
```

### Frontend
The UI is the approved Claude design, ported to React/TSX and wired live to the API above:
**Arena** (blind cards + flip-to-reveal + share-result card), **Leaderboard** (Bias×Credibility &
Reach×Trust scatter maps + dimension pills + medium/type/language filters + table with ±σ mini-bars),
**Channel profile** (radar with confidence whiskers + reach + statements), **Compare** (overlaid radars
+ per-dimension delta bars, `/compare?ids=a,b,c`), and **Share** (WhatsApp / X / IG-story cards from the
top-ranked channel). Light/dark theme with the design's exact palette; Inter + Newsreader + Hind fonts.
All screens have empty states for a fresh database (ratings appear only after votes + recompute).

### The rating mechanic (top3d-style, generalized)
Both mechanics share **one** scoring backend — pairwise (`pick 1 of 2`) is just the smallest case of blind top-k (`pick best 3 of ~7`). Each vote is a *partial ranking* over a slate. The math lives in `lib/rating/engine.ts`.

**A selection only means something relative to how likely it was by chance.** Being picked out of a head-to-head pair is a coin flip; being picked out of a 7-statement slate where the voter chose 3 is a 43% shot. So for every impression the engine records what a *random* voter making the same number of picks would have scored, and measures each statement against **its own** chance baseline:

```
chance = Σ(picked / slate_size) / exposures        per statement
p      = (selected + chance·5) / (exposures + 5)   Bayesian shrinkage
score  = OR / (1 + OR),  OR = [p/(1-p)] · [(1-chance)/chance]
```

The odds ratio rescales everything so that **performing exactly at chance always lands on 0.50**, whatever mix of slate sizes a statement happened to appear in. Above 0.50 = voters picked it more often than random selection would.

Channel ratings **pool** their statements' counts rather than averaging their scores (averaging let a statement judged twice count as much as one judged forty times), with each statement capped at 40 impressions so one viral excerpt can't carry a channel. `sigma` is a real standard error — binomial error on the pooled rate, in quadrature with how much the channel's own statements disagree — not a function of the statement count alone.

The leaderboard is **ordered by `rating − 1.96σ`**, the conservative estimate, so a channel judged thirty times outranks one that got lucky twice. The displayed figure is still the rating.

Votes are **weighted, not counted** (`lib/rating/weight.ts`): `weight = identity_trust × behavioral_authenticity × recency`. MVP derives `identity_trust` from account age; the other factors are seams for CIB/anomaly detection later.

`npm run verify:rating` asserts these invariants offline (no DB, no network).

### Ranking thresholds — the launch window
A channel qualifies for the public ranking once it clears a minimum statement count and a minimum number of judgements. Those bars are **deliberately low while the database is young** — otherwise the leaderboard is an empty page — and tighten automatically as vote volume grows (`lib/config.ts`, `rankingTier()`):

| Total votes | Tier | Min statements | Min judgements |
|---|---|---|---|
| < 2,500 | `launch` | 1 | 2 |
| 2,500 – 9,999 | `growth` | 2 | 4 |
| ≥ 10,000 | `mature` | 3 | 10 |

Two steps rather than one cliff, so channels are never yanked off the board overnight. Everything is overridable via `LAUNCH_WINDOW_VOTES`, `RANK_MIN_STATEMENTS`, `RANK_MIN_EXPOSURE`.

Channels with real votes that have **not** yet cleared the current bar are still returned by `/api/leaderboard`, flagged `provisional: true` and rendered below the qualified block as *not yet qualified*. Hiding them misrepresents how much the community has actually judged.

### Coverage: what actually gets channels ranked
Ranking is bottlenecked by *exposure*, so both the Arena and the slate composer are coverage-aware:

- **`/api/arena/next`** serves the **least-voted** slates first (`slates.vote_count`), randomising inside that under-served band. It previously served the 200 most *recent* slates, so the newest were re-served forever while a thousand older ones never collected a single vote.
- **`composeSlates`** builds each slate from the least-covered channels and their least-covered statements, where coverage counts votes received *and* slates already queued. Coverage spread across channels roughly halves over ten collection runs.

### Non-destructive by construction
Nothing in the pipeline deletes evidence:

- `recomputeRatings` upserts; rows that lose their evidence are **retired in place** (zeroed, `ranked=false`), never dropped. It used to `DELETE` every rating first and rebuild — so a failure halfway through left the public leaderboard empty.
- Expired and broken slates are marked `active=false` instead of deleted. Deleting a slate cascades away **every vote ever cast on it**.
- Every Supabase write is error-checked. Silently ignoring them is how `statement_scores` came to sit permanently empty while the job reported success.
- Every large read pages past PostgREST's 1000-row cap via `lib/supabase/paginate.ts`. Unpaginated selects were silently truncating votes, slates and statements out of the maths.

## Setup

1. **Create a Supabase project** (free). In the SQL editor, run the migrations in order:
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_rls.sql`
   - `supabase/migrations/0003_yearly_archives.sql`
   - `supabase/migrations/0004_ranking_engine.sql`

   `0004` is **additive and idempotent** — no drops, no deletes, safe to re-run.
   Until it is applied the app degrades gracefully (see `lib/supabase/capabilities.ts`):
   it keeps working, but serves slates in the old order and omits the provisional
   flag. `npm run recompute` says so explicitly in its `warnings`.
2. **Enable auth providers** in Supabase → Authentication: Email (magic link) and Google OAuth. Add `http://localhost:3000/auth/callback` and your prod URL to the redirect allowlist.
3. **Copy env:** `cp .env.example .env.local` and fill in:
   - Supabase URL + anon key + **service-role key**
   - `AI_PROVIDER` = `gemini` (free, get a key at aistudio.google.com) **or** `openai-compat` (Groq/OpenRouter — set base URL, key, model)
   - `YOUTUBE_API_KEY` (free quota)
   - `CRON_SECRET` (long random string)
   - Leave `DISABLE_TURNSTILE=true` for local dev
4. **Install + seed + run:**
   ```bash
   npm install
   npm run seed          # inserts starter channels
   npm run dev
   ```
5. **Populate data (run once locally to verify):**
   ```bash
   curl "http://localhost:3000/api/cron/collect?secret=YOUR_CRON_SECRET&limit=10"
   curl "http://localhost:3000/api/cron/recompute?secret=YOUR_CRON_SECRET"
   ```
   Or without the server running: `npm run collect` / `npm run recompute`.
   `npm run check` runs the typechecker plus the rating invariants.

### Swapping the AI provider
Change `AI_PROVIDER` and the matching keys — no code changes. Adapters: `lib/ai/gemini.ts`, `lib/ai/openai-compat.ts`. Add a new one by extending `BaseProvider` and registering it in `lib/ai/index.ts`.

---

## Deploy to Vercel

1. Push to a Git repo and import into Vercel.
2. Add all env vars from `.env.example` in the Vercel project settings (set `DISABLE_TURNSTILE=false` and add real Turnstile keys for prod).
3. `vercel.json` registers the cron jobs automatically (collect every 6h, recompute every 2h). Vercel injects `CRON_SECRET` as the Bearer token on cron calls.
4. Deploy. Done.

---

## API contract (for the frontend)

| Method | Path | Query / Body | Returns |
|---|---|---|---|
| GET | `/api/leaderboard` | `dimension, medium?, content_type?, lang?, include=ranked\|all` | `{ dimension, rows: [{ channel, rating, sigma, lower_bound, n_statements, exposure, ranked, provisional }], meta: { totalVotes, tier, minStatements, minExposure, launchWindow, votesToNextTier, rankedCount, provisionalCount } }` |
| GET | `/api/scatter` | `x, y` (dimension keys, or `x=reach`), `include=ranked\|all` | `{ xAxis, yAxis, points: [{ channel, x, y, provisional }] }` |
| GET | `/api/channels/:id` | — | `{ channel, radar, stats, statements }` |
| GET | `/api/arena/next` | `kind=topk\|pairwise, dimension?` | `{ slate_id, kind, max_pick, question, dimension, statements:[{id,text,context}], votesLeftWeek, votesLeftMonth }` (no source) |
| POST | `/api/arena/vote` | `{ slate_id, selected_statement_ids[], turnstile_token? }` (auth) | `{ ok, votesLeftWeek, votesLeftMonth }` — blind by design, sources are never revealed |

Dimension keys: `neutrality, factual, sourcing, non_godi_media, non_sensational`.

---

## Frontend design prompt

The shipped UI is a deliberately minimal placeholder. The polished frontend is generated separately via Claude design — see **`FRONTEND_PROMPT.md`** for the paste-ready prompt. It targets the API contract above.

---

## Deferred (documented hooks, not built in MVP)
Plackett–Luce / Glicko-2 scoring · CIB / sockpuppet / burst anomaly detection · solicitation monitoring · append-only hash-chained tamper-evident log + public Merkle anchoring · AI referee triangulation · deepfake detection · multilingual moderation · style-leakage normalization · phone-OTP / device-attestation tiers. See the planning docs (`*.md`) for the full rationale.
