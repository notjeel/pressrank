# Integrity & Anti-Forgery Architecture — Implementation Plan

*Companion to the main platform plan. How to make the ratings manipulation-resistant, tamper-evident, and self-correcting — resistant even to the rated entities, and even to the operators.*

---

## 0. The honest premise (read this first)

"Unforgeable" in an absolute sense is impossible — any sufficiently determined, well-funded adversary can attack any system. Promising true unforgeability is dishonest and sets you up to fail publicly.

The achievable, and correct, goal has three parts:

1. **Manipulation-resistant** — forging a result costs far more than it's worth.
2. **Tamper-evident & publicly verifiable** — any attack (including by the operators) is *detectable and visible*, not silent.
3. **Self-correcting** — when manipulation happens, the system degrades gracefully and recovers, rather than producing a quietly poisoned ranking.

Most of property #2 is an **architecture** problem (verifiable logs, reproducible computation). AI handles **detection and moderation**. Neither alone is enough; the design below combines them.

**The one-line strategy:** make manufactured consensus expensive, make tampering impossible to hide, and put as much rating weight as possible onto things that *can't be targeted because they're anonymous.*

---

## 1. Threat model

Design against real adversaries with real resources. In the Indian context specifically:

| Adversary | Capability | Goal |
|---|---|---|
| **A rated entity + its fanbase** | One post mobilises millions (a 40M-sub creator, a top TV channel's audience) | Mass self-upvote / rival-downvote |
| **Paid vote/click farms** | Cheap, abundant in India; thousands of "real-looking" actions for little money | Sell votes to any bidder |
| **Political IT cells / coordinated ops** | Organised, persistent, multi-account, narrative-driven | Push partisan rankings |
| **Sybil / bot farms** | Cheap SIMs, emulators, automation, residential proxies | Fabricate accounts at scale |
| **Content forgers / deepfakers** | Doctored clips, fabricated transcripts, spliced edits | Make rivals look bad / themselves good in the Arena |
| **Reach-stat gamers** | Sub farms, view bots on YouTube | Inflate the "reach" context signal |
| **Insider / operator tampering** | Direct DB / admin access | Silently alter votes or rankings |

The system must hold against **all** of these — including the last one, which is what most "trust" platforms quietly ignore.

---

## 2. Core design principles

Everything below derives from these. They're the load-bearing ideas.

- **P1 — Rate the anonymized artifact, not the brand.** Blind-by-default. You can't brigade what you can't identify. This removes the target for the largest attack class. Maximise the weight of blind Arena outcomes in the final ranking.
- **P2 — Weight, don't count.** The leaderboard is computed from *weighted* votes, where weight is a function of account trust and behavioral authenticity. Manufactured votes get a weight near zero. This is more robust than ban-hammering because it doesn't require perfect detection and fails gracefully.
- **P3 — Provenance over detection.** Prefer cryptographically pinning authentic source artifacts over trying to detect fakes after the fact. Detection (deepfake/forgery models) is a *backup* layer, not the primary defense — because detection is an arms race you can't fully win.
- **P4 — Triangulate; trust no single oracle (including the crowd).** Final signals come from the intersection of the open crowd, the blind crowd, an AI referee, and (where available) expert raters and fact-checker corroboration. If these diverge sharply, that's an anomaly to investigate — it's how you catch a *captured crowd*.
- **P5 — Tamper-evident and reproducible.** Every vote goes into an append-only, hash-chained log whose root is published. The ranking algorithm and privacy-preserving data snapshots are published so anyone can recompute and verify. "Don't trust — verify," including verifying the operators.
- **P6 — AI flags, humans decide on high-stakes actions.** Bans, delistings, and ranking overrides are human (ideally independent-panel) decisions on AI-surfaced evidence. Every such action is itself logged in the tamper-evident log.
- **P7 — Defense in depth.** Assume every individual layer will be partially defeated. Security comes from the stack, not any one control.

---

## 3. Subsystem A — Identity & Sybil resistance

**Goal: one real, distinct human, expressing a genuine opinion.** This is the root of everything; if it fails, nothing downstream matters. Build it as a layered stack where each layer raises cost:

1. **Phone-OTP signup** — table stakes in India and a first cost barrier. *Necessary but not sufficient* (Indian SIMs are cheap and farmable). Store only a salted hash of the number.
2. **Device attestation** — **Play Integrity API** (Android) and **App Attest / DeviceCheck** (iOS) to reject emulators, rooted/automated devices, and farm setups. This is a large step up from OTP alone.
3. **Progressive / earned trust** — accounts accrue voting weight slowly through consistent, non-anomalous behavior over time. A brand-new account has near-zero weight. This makes freshly-farmed accounts *useless* without months of believable history — which is far more expensive than buying SIMs.
4. **Optional strong personhood (with heavy caveats)** — India offers Aadhaar/DigiLocker-based verification, but using it raises serious privacy, centralisation, and exclusion concerns and would deter genuine users. **Recommendation:** do *not* gate participation on government ID. At most, offer it as an opt-in path to a higher trust tier, and only if privacy can be preserved (verify-without-storing). Privacy-preserving "proof of personhood" schemes exist but are immature — treat as research, not foundation.

**Output:** every account carries an **identity-trust score** (0–1) derived from the layers above. This feeds the weighting in §9.

---

## 4. Subsystem B — Vote integrity & collusion detection (the AI core)

This is where AI does the heaviest lifting: detecting **coordinated inauthentic behavior (CIB)** that individual-account checks miss. Authentic-looking accounts acting *together* are the real threat.

### 4.1 The vote graph
Continuously build a graph/event-store of: users × entities × votes × timestamps × device/IP/session/behavioral features. This is the substrate for all detection.

### 4.2 Detection models
Run a layered ensemble (cheap heuristics first, ML where it earns its keep):

- **Co-voting / lockstep detection** — correlation analysis and community detection over the vote graph to find clusters that vote in suspiciously identical patterns ("vote rings"). Start with co-occurrence matrices + clustering; graduate to a **graph neural network** only once data volume justifies it.
- **Temporal burst detection** — model the baseline vote-rate per entity and flag anomalous spikes (especially asymmetric ones — one entity surging up while a rival surges down in the same window).
- **Behavioral bot detection** — session timing, inter-action intervals, touch/scroll dynamics, entropy of behavior. Farms and scripts have tell-tale regularity.
- **Sockpuppet clustering** — embed accounts on behavioral + device + network features; cluster to surface farms sharing infrastructure (IP subnets, registration cohorts, fingerprints).
- **Solicitation monitoring** — *India-specific, high-leverage.* Monitor the public social posts/videos of rated entities for vote-solicitation ("go rate me on X"). When detected, automatically **quarantine the correlated vote surge** for scrutiny and down-weighting. This directly neutralises the fanbase-mobilisation attack — and it's fair, because soliciting votes for yourself is exactly the behavior the platform exists to resist.

### 4.3 Output & action
Each vote gets a **behavioral-authenticity score**; each account a rolling **trust score**. These feed §9 weighting. Sharp anomalies open an **integrity incident** in a human-review queue (§8). Default posture is **down-weight, not delete** — quarantine suspicious activity, neutralise its influence, escalate genuine attacks to humans. Avoid auto-bans (false positives on real users are corrosive to trust).

### 4.4 How it's built
- **Pipeline:** event stream → feature store → (a) fast online scoring for obvious bots at vote time; (b) batch graph/CIB analysis on a schedule (hourly/daily).
- **Stack:** Postgres + a stream processor (e.g., a queue + workers); Python ML services (scikit-learn / PyTorch); a graph store or in-memory graph for the batch jobs.
- **Principle:** ship the cheap heuristics (rate limits, burst detection, device attestation) *first* — they stop 80% of attacks. Build the GNN later.

---

## 5. Subsystem C — Content authenticity / anti-forgery (the Arena)

**Goal: the coverage being rated is real, correctly attributed, and unaltered** — so no one can feed forged clips/transcripts of a rival (or doctored flattering versions of themselves) into the Arena.

### 5.1 Provenance-first ingestion (primary defense)
- **No free-floating user-submitted clips.** Coverage is ingested only from **canonical sources**: a specific YouTube `video_id` (digital) or a timestamped TV broadcast capture. If you ever allow user submissions, they enter a heavily-quarantined, verify-before-publish pipeline — never the live Arena directly.
- **Cryptographically pin every artifact.** On ingest, hash the exact source bytes / transcript and store the hash with source metadata. Any later alteration is then provably detectable.
- **Adopt provenance standards** — **C2PA / Content Credentials** where the source supplies them; record provenance metadata so the chain from original broadcast/upload to Arena item is auditable.

### 5.2 Transcript integrity
- Pull captions directly via the **YouTube Data API**; hash them. For TV, run **ASR** on the recorded broadcast and store both the audio hash and the transcript.
- **Cross-source corroboration:** for a given event, compare multiple outlets' transcripts of the same moment. A fabricated quote that no other source corroborates is a strong forgery signal.

### 5.3 AI deepfake / manipulation detection (backup layer)
- An **ensemble** of face/voice-manipulation and splice/edit detectors flags suspect audio/video.
- **Be honest about limits:** deepfake detection is an unwinnable arms race in isolation. It is a *flagging* layer that triggers human review and cross-checks — **never** an automated verdict. Provenance (5.1) + corroboration (5.2) are the real defenses; detection catches what slips through.

### 5.4 How it's built
Ingestion workers (YouTube API, broadcast capture) → hashing + provenance store → transcript/ASR pipeline → corroboration check → deepfake-detector ensemble (flag only) → publishable, hash-pinned Arena item. Anything flagged is withheld pending human review.

---

## 6. Subsystem D — AI moderation pipeline

Governs all user-generated content (comments, reviews, story submissions, dispute text) and provides the **AI referee** triangulation input.

- **Multilingual classification** — toxicity, hate speech, doxxing, defamation-risk, and coordinated narrative-spam, across **Hindi, Hinglish/code-mixed, and major regional languages.** This is genuinely hard: off-the-shelf English moderation underperforms badly on Hinglish, so plan for **India-tuned models** and a labelled Hinglish dataset. Underestimating this is the most common way Indian UGC moderation fails.
- **Architecture** — LLM-based classifiers for nuance + cheaper fast filters for volume; confidence-thresholded auto-actions for clear cases; **human escalation** for the rest; a user-facing **appeals** path.
- **The AI referee (triangulation, per P4)** — for blind Arena items, an LLM does an *independent* automated read (e.g., checking factual claims against cited sources, flagging sensationalism markers) as **one input among many.** If 10,000 (possibly brigaded) votes call a piece "factual" but the AI referee + fact-check corroboration strongly disagree, that divergence is an anomaly signal — this is how you detect a *captured crowd*. The referee is a juror, never the judge.
- **How it's built** — moderation as a service behind the API; model calls + rules engine; review console for human moderators; all moderator actions logged (§7).

---

## 7. Subsystem E — Tamper-evidence & public verifiability

**This is what makes the system unforgeable *by the operators* — the property almost everyone skips.**

### 7.1 Append-only, hash-chained vote log
- Every vote (and every admin/moderation action) is appended to an **immutable, hash-chained log** — a Merkle-tree / transparency-log design, the same idea behind **Certificate Transparency**. Each entry commits to all prior entries, so retroactive edits break the chain.

### 7.2 Public anchoring
- **Periodically publish the Merkle root** to a public, append-only location (a public timestamping service, or — for the root hash *only* — a public blockchain). Anyone can later prove the log existed in a given state at a given time and wasn't rewritten. You get tamper-evidence **without** running votes on-chain.

### 7.3 Reproducible rankings
- **Publish the ranking algorithm** and periodic **privacy-preserving data snapshots** (hashed user IDs, no PII) so independent parties can **recompute the leaderboard** and confirm it matches the published numbers. If your published ranking ever diverges from what the public data produces, it's caught immediately.

### 7.4 The honest blockchain verdict
You'll be tempted toward "put it on a blockchain." Resist full on-chain voting:
- It **doesn't solve the actual problem** — Sybil/identity. A blockchain can't tell you a vote came from a distinct real human (that's Subsystem A's job).
- It's slow, expensive, and can leak user privacy.

**Use the transparency-log pattern (7.1–7.3) instead** — it delivers exactly the "even operators can't forge it silently" property you want, at low cost and without the downsides. Anchor *root hashes* to a public chain if you like the optics; keep the data off-chain.

### 7.5 Separation of duties
No single admin has silent god-mode over ratings. Sensitive actions require logging (and ideally multi-party approval). Admin actions live in the same tamper-evident log as votes.

---

## 8. Governance & human-in-the-loop

Integrity isn't only code; it's process.

- **Human adjudication** of bans, delistings, and overrides on AI-surfaced evidence — ideally by an **independent integrity panel**, not the founders alone.
- **Appeals + right-of-reply** for both users and rated entities (also a legal necessity — see the main plan's legal section).
- **Red-team program + bug bounty** for the integrity stack; assume attackers will probe it.
- **Public integrity transparency report** — periodically disclose attack waves detected, votes down-weighted/removed, and methodology changes. Visible self-correction *is* the trust-builder.
- **Open the integrity pipeline** (or have it independently audited) so claims can be checked.

---

## 9. The integrity math — how scores become rankings

- Final per-dimension rating uses **weighted** Elo/Glicko-2 updates: each vote's contribution is scaled by
  `weight = identity_trust × behavioral_authenticity × recency × consistency`.
- Manufactured votes (low identity trust and/or low behavioral authenticity) contribute ≈ 0, so they *can't move the ranking* even if undetected as a hard "ban."
- **Confidence bands, not just points** (Glicko-2's rating-deviation) so low-data or contested entities show uncertainty rather than false precision.
- **Three-tier response** to suspicious activity: **down-weight** (default, automatic) → **quarantine** (hold for review) → **remove/ban** (human decision, logged). Bias the system toward down-weighting; reserve bans for confirmed attacks.

---

## 10. Phased rollout

Don't build the GNN on day one. Sequence by leverage-per-effort:

**Phase 0 — Cheap, high-leverage (launch):** phone-OTP + device attestation + rate limits + temporal burst detection + blind-by-default Arena + weighted (not counted) ranking + the append-only hash-chained log. This alone defeats most attacks.

**Phase 1 — Detection:** CIB clustering (co-voting, sockpuppet clustering), solicitation monitoring, the AI referee, multilingual moderation pipeline, human-review console + appeals.

**Phase 2 — Verifiability & authenticity:** public Merkle-root anchoring, reproducible-ranking snapshots, provenance pinning (C2PA), transcript corroboration.

**Phase 3 — Hardening:** GNN-based CIB, deepfake-detector ensemble, independent integrity panel, bug bounty, published transparency reports.

---

## 11. Metrics & continuous red-teaming

You can't claim integrity you don't measure:

- **Seeded attacks / honeypots** — run controlled fake campaigns against staging (and occasionally production) and measure detection rate and time-to-detect.
- **False-positive rate on genuine users** — track how often real users get down-weighted; this is the cost side and must stay low.
- **Ranking stability under stress** — does a simulated 10k-vote brigade move the leaderboard? It shouldn't.
- **Model drift monitoring** for the moderation/CIB models, with scheduled retraining.

---

## 12. Honest limitations (state these publicly)

- **Deepfake detection will sometimes fail** — provenance and corroboration are why that's survivable.
- **A patient adversary aging real-looking accounts for months** can accrue some weight — progressive trust raises the cost dramatically but not infinitely.
- **The platform's own neutrality is a perpetual target** — radical transparency (open methodology, reproducible rankings, transparency reports) is the only durable answer; there is no purely technical fix for "we don't trust the referee."
- **Perfect personhood without surveillance is unsolved** — you trade some Sybil-resistance to protect privacy and inclusion, and that's the right trade.

**The realistic win:** every attack is **expensive to mount, hard to hide, automatically dampened, and publicly visible when it happens.** That is what lets the ratings "stand to their point" — not a promise of perfection, but a system that makes cheating cost more than it's worth and makes honesty the only thing that scales.
