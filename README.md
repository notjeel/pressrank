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
Both mechanics share **one** scoring backend — pairwise (`pick 1 of 2`) is just the smallest case of blind top-k (`pick best 3 of ~7`). Each vote is a *partial ranking* over a slate. MVP scoring is **selection-rate with Bayesian shrinkage** per (statement × dimension), rolled up to channel ratings with sample-size shrinkage and a confidence band (`sigma`). A channel is only shown publicly once it clears minimum statement-count + exposure thresholds. The math lives in `lib/rating/engine.ts`; the upgrade path to Plackett–Luce / Glicko-2 sits behind the same interface.

Votes are **weighted, not counted** (`lib/rating/weight.ts`): `weight = identity_trust × behavioral_authenticity × recency`. MVP derives `identity_trust` from account age; the other factors are seams for CIB/anomaly detection later.

---

## Setup

1. **Create a Supabase project** (free). In the SQL editor, run the migrations in order:
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_rls.sql`
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
| GET | `/api/leaderboard` | `dimension, medium?, content_type?, lang?` | `{ dimension, rows: [{ channel, rating, sigma, n_statements, exposure }] }` |
| GET | `/api/scatter` | `x, y` (dimension keys, or `x=reach`) | `{ xAxis, yAxis, points: [{ channel, x, y }] }` |
| GET | `/api/channels/:id` | — | `{ channel, radar, stats, statements }` |
| GET | `/api/arena/next` | `kind=topk\|pairwise, dimension?` | `{ slate_id, kind, max_pick, question, dimension, statements:[{id,text,context}] }` (no source) |
| POST | `/api/arena/vote` | `{ slate_id, selected_statement_ids[], turnstile_token? }` (auth) | `{ ok, weight, reveal:[{statement_id, selected, channel}] }` |

Dimension keys: `neutrality, factual, sourcing, fact_vs_opinion, non_sensational`.

---

## Frontend design prompt

The shipped UI is a deliberately minimal placeholder. The polished frontend is generated separately via Claude design — see **`FRONTEND_PROMPT.md`** for the paste-ready prompt. It targets the API contract above.

---

## Deferred (documented hooks, not built in MVP)
Plackett–Luce / Glicko-2 scoring · CIB / sockpuppet / burst anomaly detection · solicitation monitoring · append-only hash-chained tamper-evident log + public Merkle anchoring · AI referee triangulation · deepfake detection · multilingual moderation · style-leakage normalization · phone-OTP / device-attestation tiers. See the planning docs (`*.md`) for the full rationale.
