# PressRank — Frontend Design Prompt (paste into Claude design)

Copy everything in the code block below into Claude. It consumes the JSON API documented in `README.md`.

```
Design and build the frontend for **PressRank**, a web app that gives blind, community-driven credibility ratings to news-spreading channels (YouTube creators, Instagram pages, TV broadcasters, independent commentators — any medium). The core idea: users judge ANONYMIZED statements, not brands; the source is revealed only AFTER they vote. The product's personality is the calm, trustworthy opposite of sensational news.

## Brand & visual language
- Be the visual opposite of screaming TV news. NO red "BREAKING" bars, no clutter.
- Calm, editorial, data-forward — closer to a clean fintech app or AllSides than a news channel.
- Palette: ink/charcoal base (#16181d) on white/off-white, ONE calm accent (deep indigo ~#3a3f8f or teal). Deliberately avoid politically loaded primaries.
- Typography: Inter (Latin); if multilingual, pair with a Devanagari face (Hind/Mukta).
- Mobile-first, PWA feel: fast, lightweight, works one-handed.
- Shareability is the growth engine — design auto-generated "share cards" ("this week's most-trusted channel") sized for WhatsApp, X, and Instagram stories.

## Tech
- Next.js (App Router) + TypeScript + Tailwind. Charts via Recharts or visx.
- It must consume an existing JSON API (contract below) — do NOT invent a backend.

## Core screens

1. **Arena (the hero)** — the blind "taste test for news."
   - Fetch `GET /api/arena/next?kind=topk` (also support `kind=pairwise`).
   - Show the single `question` prominently at top, then 6–8 statement cards (`statements[].text`, with optional `context` in muted small text). NO source/logo shown.
   - Top-k mode: tap to select up to `max_pick` (3). Pairwise mode: 2 cards, pick 1.
   - Submit → `POST /api/arena/vote` with `{ slate_id, selected_statement_ids, turnstile_token }`.
   - On success, render **the reveal**: animate each card flipping to show `reveal[].channel.name` + medium, with a check on the ones the user picked. This "I blind-picked the channel I claim to hate" moment is the shareable payoff — add a "share this result" card.
   - Requires login to vote (link to /login). Reading needs no login.

2. **Leaderboard**
   - Hero: two scatter maps side by side —
     - **Bias × Credibility**: `GET /api/scatter?x=neutrality&y=factual` (label quadrants).
     - **Reach × Trust**: `GET /api/scatter?x=reach&y=factual` (x = audience size, y = a quality rating; surfaces the "huge reach, low trust" quadrant). Plot each point as the channel; tooltip with name + medium.
   - Below: a sortable table from `GET /api/leaderboard?dimension=` with a dimension switcher (neutrality, factual, sourcing, non_godi_media, non_sensational) and filters for medium / content_type / language. Show `rating`, a confidence band (`±sigma`), and `n_statements`. Make rows link to the profile.

3. **Channel profile** — `GET /api/channels/:id`
   - Header: name, verified tick, medium/type/content_type/language/country tags, reach stats (labeled "context only — not part of the rating").
   - **Radar chart** across all dimensions from `radar[]` (show confidence bands; mark provisional/unranked dimensions).
   - List of `statements[]` (recent rated statements with source links).

4. **Compare** — pick 2+ channels, overlay their radar charts and show dimension-by-dimension deltas (TV anchor vs. independent creator is the headline use case).

## Tone of copy
Honest and humble: ratings are "the perceived quality of a representative, blind-judged sample of this channel's statements" — never a verdict. Surface the methodology link. Keep it neutral; the platform judges every channel by the same yardstick.

Deliver responsive, accessible components. Start with the Arena and Leaderboard.
```
