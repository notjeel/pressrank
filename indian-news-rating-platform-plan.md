# The People's Verdict — A Community Rating Platform for India's News Ecosystem

*A full product, design, and implementation plan — modeled on top3d.ai, built for India. Covers TV news channels **and** independent digital/YouTube news, rated side by side.*

---

## 1. The concept in one line

**From prime-time TV to your YouTube feed — one place to see who's actually credible.**

top3d.ai works because it cuts through marketing hype with *blind, community-driven, ELO-based rankings* — no sponsorship, no vendor influence. You'd port that playbook to a domain that desperately needs it: India's news ecosystem. And crucially, that ecosystem is no longer just television.

Two forces make the timing unusually good:

1. **Official TV ratings are broken and distrusted.** BARC's TRP is currently *suspended* for the news genre (over sensationalised war coverage), is built on a tiny sample (~58,000 meters for 230M+ TV homes), has a history of manipulation scandals, and only ever measured *viewership* — never *quality* or *trust*.
2. **Trust is migrating to digital.** A massive, fast-growing independent news layer — solo creators and digital newsrooms — now rivals legacy TV for reach and credibility, especially among younger and Hindi-belt audiences. Yet there is **no ratings system anywhere** that lets you compare a TV channel against a YouTube creator on the same story.

You're not competing with BARC. You're measuring what BARC never measured — across a medium BARC barely touches.

---

## 2. Scope — what gets rated

The platform rates the whole news landscape, with every entity tagged so users can filter and compare fairly:

- **Legacy / TV broadcasters** — Aaj Tak, NDTV, Times Now, Republic, India Today, Zee News, ABP, etc. (and their YouTube mirrors).
- **Digital-native newsrooms** — The Lallantop, ThePrint, The Wire, Newslaundry, Mojo Story. Organisations with mastheads and editorial accountability.
- **Independent creators / commentators** — Dhruv Rathee, Ravish Kumar, Akash Banerjee (The Deshbhakt), Abhisar Sharma, Nitish Rajput, Samdish (Unfiltered), etc. Individuals with a varying mix of news, explainer, commentary, and satire.
- **Fact-checkers** — Alt News, BOOM, Factly.

Each entity carries tags: **medium** (TV / YouTube / both) · **type** (org vs. individual) · **content type** (hard news / explainer / commentary / satire / opinion) · **language**.

**Why content-type tagging is now essential:** on YouTube the news/opinion/satire line is blurry — a satirist and a hard-news bulletin shouldn't be judged on the same axes without context. Let users filter and rate *within* a content type so comparisons stay fair.

---

## 3. The core mechanic (the important part)

top3d.ai's genius is the **Arena**: two outputs from the same prompt, names hidden, you pick the better one, an ELO score updates. The blindness is what makes it trustworthy and hard to game. You adapt this into **two complementary engines**, now spanning both mediums.

### Engine A — The Reputation Leaderboard (open, ship first)
Pairwise comparisons with identities *shown*:
> *"Which is more credible on **factual accuracy**?"* → Entity X vs Entity Y → vote → ELO updates on that dimension.

Pairwise ELO beats 1–5 stars: it resists inflation, gives a stable relative ordering, and is far harder for a small brigade to distort than one entity's star average.

### Engine B — The Coverage Arena (blind, your signature differentiator)
Take **one real news event** (a budget, a verdict, an election result). Pull how two entities covered it, **strip the identity**, and ask:
> *"Which coverage was more factual / less sensational / more balanced?"*

**Digital makes this dramatically easier.** YouTube content is natively embeddable and exposes **captions/transcripts via the YouTube Data API** — so you can pull a creator's segment, de-identify the transcript, and compare it programmatically, with none of the broadcast-rights friction of TV clips. This is a strong reason to lean digital-heavy early (see Roadmap).

### The killer feature — cross-medium matchups
Because both mediums live in one system, you can ask what *nobody else offers*:
> *"Who covered the Budget better — Aaj Tak or Dhruv Rathee? NDTV or The Wire?"*

TV-anchor-vs-independent-creator, head to head, on the same story. That single comparison is the hook that gets the platform shared.

**Why blind voting matters beyond novelty:** you can't brigade an entity you can't see. The blind Arena is both your headline feature *and* your best defense against the political weaponisation that would otherwise wreck a news-rating site.

---

## 4. What users rate — the dimensions

Multi-axis, never a single "good/bad" score (this is also your legal shield — aggregated *opinion across several axes*, not a verdict):

- **Credibility / factual accuracy**
- **Bias / slant** — a *spectrum*, not a verdict (model on AllSides' bias ratings / the Ad Fontes Media Bias Chart). Leaning isn't "bad"; hiding it is.
- **Sensationalism** — calm ↔ TRP/clickbait-chasing.
- **Depth** — headline/short-form churn ↔ genuine reporting.
- **Debate civility** — relevant to TV's shouting-match format.
- **Accountability** — corrections issued when wrong.
- **Production quality.**

**Two dimensions that matter more for digital creators:**
- **Disclosure / transparency** — funding, sponsorships, conflicts of interest (weight this heavily for creators).
- **Sourcing** — does the creator cite verifiable sources?

The hero visualizations (see Design) are a **Bias × Credibility map** and a **Reach × Trust map** — both populations (TV + creators) plotted together.

---

## 5. Site structure

1. **Arena** — blind Coverage Arena vote card; supports cross-medium matchups.
2. **Leaderboard** — sortable by dimension; Bias × Credibility and Reach × Trust scatter maps as heroes; filters for medium (TV / YouTube / both), type, content type, language.
3. **Channel/creator profiles** — radar chart across dimensions, trend-over-time, recent rated coverage, corrections log, verified official handles + public reach stats.
4. **Compare** — two or more entities side by side (incl. TV vs. creator).
5. **Story pages** — one event, every outlet's coverage (TV + YouTube) gathered with how each was rated. Great editorial value + SEO.
6. **Learn / Blog** — media-literacy explainers, "how we rate," weekly recaps (SEO + credibility, as top3d.ai does).

---

## 6. Name ideas

Names evoking *news + India + trust/verdict*. All work for TV **and** digital — none is medium-locked. (Verify trademark + domain before committing; several are common Hindi words.)

| Name | Meaning / angle | Why it works |
|---|---|---|
| **Janmat** (जनमत) | "public verdict / opinion" | ⭐ Top pick. Captures *the people's rating vs. the manufactured TRP*. Native, meaningful, ages well across mediums. |
| **Bharosa** (भरोसा) | "trust" | Directly names what you measure. `getbharosa.com` / `bharosa.tv`. |
| **Khabarmeter** / **KhabarRank** | "news-meter / news-rank" | Descriptive, bilingual, medium-agnostic. |
| **SachMeter** | sach = "truth" → "TruthMeter" | Punchy, reads in English, instantly clear. |
| **Nazariya** (नज़रिया) | "perspective / lens" | Strong if you lean into the bias-spectrum angle. |
| **Prahari** (प्रहरी) | "sentinel / watchdog" | Serious watchdog framing. |
| **The News League** / **NewsArena** | English, ranking-flavored | More global / neutral feel. |

⚠️ Avoid anything close to "BARC" — confusing and legally risky against the incumbent.

**Recommendation: Janmat** — cleanest expression of the thesis (crowd verdict > rigged ratings), native to the audience, works in a logo, and reads equally well for a TV channel or a YouTuber.

---

## 7. Design & visual identity

**Principle: be the visual opposite of sensational TV.** No screaming red "BREAKING" bars. Calm, editorial, data-forward — closer to a clean fintech app or AllSides than to a news channel. That contrast *is* the brand.

- **Mobile-first PWA.** India is overwhelmingly Android + mobile + data-conscious. Lightweight, fast, offline-tolerant. (Your digital-news audience is *already* online and will actually visit a website — a big reason to court them.)
- **Bilingual from day one** — Hindi + English toggle, prominent. Regional languages later.
- **Color:** ink/charcoal base + one calm accent (deep indigo or teal). **Deliberately avoid saffron and green** as primaries to stay visibly neutral.
- **Typography:** Devanagari + Latin pairing — e.g., *Hind*/*Mukta* for Devanagari, *Inter* for Latin.
- **Signature data viz:**
  - **Bias × Credibility scatter map** — leaderboard hero; one glance tells the story.
  - **Reach × Trust scatter map** — plot public reach (YouTube subs/views via API) against community-rated credibility. Instantly surfaces the "huge reach, low trust" and "small but trusted" quadrants — a striking, shareable picture of the whole ecosystem. *Reach is context only; ratings stay community-driven.*
  - **Per-entity radar charts** across all dimensions.
- **Shareability is the growth engine.** Auto-generate share cards (*"This week's most-trusted channel / creator"*) sized for **WhatsApp, X, Instagram**. WhatsApp forwarding is how things spread in India.

Design first: (1) Arena vote card, (2) Leaderboard with both scatter maps, (3) Profile with radar + trend + reach, (4) Story page.

---

## 8. Tech stack & architecture

- **Frontend:** Next.js (React) + Tailwind, built as a PWA. Charts via Recharts/visx or D3.
- **Backend:** Next.js API routes for the MVP (split to a Node/NestJS service when you outgrow it).
- **Database:** PostgreSQL via **Supabase** or **Neon**.
- **Auth — critical:** **phone OTP** (expected in India + your first anti-abuse layer). Supabase/Firebase Auth + an Indian SMS provider (MSG91, Twilio).
- **YouTube integration:** **YouTube Data API v3** for channel verification, public stats (subs/views), video metadata, and **caption/transcript retrieval** (powers the blind Arena and the Reach × Trust map). Cache stats; refresh on a schedule to respect quotas.
- **ELO/ranking:** in the backend; store `rating` + `games` per (entity × dimension). See §9.
- **Hosting:** Vercel (frontend) + Supabase/Neon (DB). Cheap, autoscaling.
- **Anti-abuse:** Cloudflare Turnstile / hCaptcha, server-side rate limiting, device fingerprinting.
- **Analytics:** PostHog or Plausible.
- **i18n:** `next-intl` / `i18next` for Hindi/English from the start.

### Minimal data model
```
entities       (id, name_en, name_hi, type, medium, content_type, language,
                logo, youtube_channel_id, official_url, verified: bool)
dimensions     (id, key, label_en, label_hi)              # credibility, bias, disclosure, …
ratings        (entity_id, dimension_id, elo, games, sigma, updated_at)
entity_stats   (entity_id, subs, views, fetched_at)       # from YouTube API, contextual
matchups       (id, dimension_id, entity_a, entity_b, blind: bool, story_id?)
votes          (id, user_id, matchup_id, winner_id, created_at, weight)
users          (id, phone_hash, created_at, reputation, region)
stories        (id, title, event_date, summary)
coverage       (id, story_id, entity_id, source, video_id, transcript, chyron, clip_url)
```

---

## 9. Ranking implementation

- Start with **Elo** per dimension (the chess/Chatbot Arena approach): each vote is a "match," scaled by a K-factor.
- **Shrink low-data entities** toward the mean (Bayesian prior / confidence intervals) so a creator with 12 votes doesn't outrank one with 12,000. Show a confidence band, not just a point.
- **Upgrade to Glicko-2** later — it tracks rating *uncertainty* (RD), which matters when vote volume is uneven (a long tail of small creators vs. a few giant channels).
- Optional slow **decay** so stale ratings don't dominate as outlets evolve.

---

## 10. Integrity & anti-manipulation (do not skip)

A site rating Indian news on "credibility" and "bias" *will* be brigaded and astroturfed — and rating named creators raises the stakes. Treat integrity as a core feature:

- **Phone-OTP-verified accounts only;** rate-limit votes per user per pair.
- **The blind Arena is your strongest weapon** — you can't target what you can't identify.
- **Reputation weighting:** weight by account age + consistency; new accounts count for less.
- **Anomaly detection:** flag vote-velocity spikes, coordinated patterns, IP/device clustering.
- **Entity verification:** YouTube has rampant impersonation. Verify and link official channel IDs and creators' official sites before listing.
- **Radical transparency:** publish methodology + periodic transparency reports. The platform itself *will* be accused of bias by all sides — openness is the only durable answer.
- Consider a **"verified voter"** tier (journalists, academics) shown alongside the open crowd.

---

## 11. Legal & ethical (India-specific — get real counsel)

Rating *named* media — especially **individual creators** — carries serious legal and political exposure in India. Retain an Indian media-law advocate before launch. Key issues:

- **Defamation** is civil *and criminal* in India (now under the Bharatiya Nyaya Sanhita, replacing IPC §§499/500). Rating a named person's credibility is **higher-risk** than rating a corporation — expect threats and SLAPP-style pressure from both legacy and independent camps.
- **The terrain is politically explosive.** The "legacy TV vs independent creator" divide maps onto loaded partisan labels; creators have faced FIRs, and the discourse is highly charged. **Non-negotiable design principle:** rate a prime-time anchor and an independent YouTuber by the *exact same transparent yardstick*, and refuse to let the platform become a weapon for either side. Neutrality is existential here.
- **Mitigations to discuss:** frame ratings explicitly as *aggregated user opinion / fair comment*; source factual claims; publish methodology; offer **right-of-reply / takedown** (for individuals too); incorporate as **Pvt Ltd / LLP** for a liability shield.
- **IT Rules, 2021:** hosting user-generated content brings intermediary duties (grievance officer, takedown timelines).
- **Content sourcing:** using clips/transcripts for *criticism and review* may fall under fair-dealing exceptions in the Copyright Act — tread carefully and document it. YouTube's API Terms also govern how you store and display data.
- **The core ethic:** **never take money from anyone you rate.** Like top3d.ai's non-sponsored promise, your independence *is* the product.

---

## 12. Monetization (without selling your soul)

Paid placement is off the table, so:

- **Aggregated data & API for B2B — the real business, and digital makes it bigger.** Influencer/creator marketing is a huge and growing budget in India; brands and agencies urgently want **creator brand-safety and credibility data**. A "news-creator credibility & brand-safety index" is arguably *more* commercially valuable than TV ratings. Sell dashboards/exports to agencies, brands, researchers, journalism schools.
- **Annual "State of Indian News Credibility" report** — revenue + a big PR/launch moment.
- **Ad-light display ads** (non-rated advertisers only) and neutral affiliate (OTT/news subscriptions, books).
- **Donations / membership** (Wikipedia / indie-media model) — credibility-friendly.
- **Grants / sponsorship** from foundations, j-schools, media-literacy orgs.

Lead with: free + ad-light for users; monetize via B2B data/insights + reports.

---

## 13. Go-to-market

- **Solve cold-start:** seed the leaderboard with an expert-rated baseline so it isn't empty on day one.
- **Launch on a high-interest event** — an election or the Union Budget — when coverage comparison is maximally topical and the cross-medium Arena writes itself.
- **Distribution:** X media-critique circles; Reddit (`r/india`, `r/IndiaSpeaks`, `r/librandu` — deliberately span the spectrum); journalism/media-literacy orgs. The independent-creator *audiences themselves* are highly online and shareable.
- **Viral loop:** weekly shareable leaderboard cards → WhatsApp + X.
- **Partnerships:** fact-checkers (Alt News, BOOM, Factly) for the corrections feed — but balance across orgs so the *platform* doesn't inherit one perceived lean.

---

## 14. Roadmap

Digital sourcing is easier (captions via API, native embeds, rights-light) *and* its audience is already online — so digital can come early rather than last.

**Phase 0 — MVP (~4–8 weeks):** entity directory spanning **TV + digital/YouTube** + open pairwise Elo (Engine A) on 3–4 dimensions + leaderboard with medium/type filters + basic profiles + phone-OTP auth + anti-abuse basics. Hindi + English. YouTube API for verification + reach stats.

**Phase 1:** full profiles (radar + trend + reach), Compare page (incl. TV-vs-creator), Bias × Credibility and Reach × Trust maps, auto-generated share cards, weekly digest.

**Phase 2 — the differentiator:** blind **Coverage Arena** (Engine B) — feasible early for digital via captions; add **cross-medium matchups** + Story pages.

**Phase 3:** video-clip Arena for TV, regional-language entities, B2B data/API + creator brand-safety index, native mobile apps, deeper corrections-tracker integrations.

---

## 15. Biggest risks (and the honest read)

- **Legal/defamation pressure** (higher now that you rate individuals) → multi-axis "opinion" framing, transparency, counsel, right-of-reply.
- **Political weaponisation / brigading** → blind Arena + reputation weighting + anomaly detection + the same-yardstick neutrality rule.
- **Cold start** → expert seeding + event-timed launch.
- **"You're biased too"** → you *will* be accused by every camp; radical methodological transparency is the only defense.
- **Content-type fairness** → without good tagging, you'll be accused of comparing satire to bulletins; get the taxonomy right early.
- **Sustainability** → the B2B data play (now spanning creator brand-safety) keeps the lights on; design for it early.

The idea is strong precisely because the official system is broken, trust is fragmenting across mediums, and *nobody* offers a fair, cross-medium view. The hard part isn't the tech — it's integrity and neutrality across a politically charged divide. Nail those and you have something genuinely valuable.
