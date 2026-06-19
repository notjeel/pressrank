# Blind Statement Survey — Voting Mechanism Spec

*Companion to the platform and integrity plans. Defines the primary voting mechanic: people see anonymized statements from outlets — no title, no source — and select the few that stand out. Those selections become channel ratings.*

---

## 1. The mechanic in one line

**Show a slate of source-hidden statements → the voter picks the few that best fit a specific question → those picks update the latent quality scores of the channels behind them.**

This is **blind top-k selection.** Pairwise "A or B?" (the earlier Arena) is just its smallest case — pick 1 from 2. Showing 6–8 statements and picking up to 3 carries more information per screen, feels like a natural survey, and is the strongest anti-forgery voting format you can build (you can't boost yourself or attack a rival you can't identify).

---

## 2. The voting loop

1. **Generate a slate** — 6–8 anonymized statements, drawn from different channels, balanced and randomized (§5).
2. **Ask one narrow question** — e.g., *"Which of these is worded most neutrally?"* (the question defines which dimension you're measuring — see §6).
3. **Voter selects up to k** (≈3). This records a *partial ranking*: selected statements rank above unselected ones in this slate.
4. **Update scores** — each statement's latent quality updates from the partial ranking (§3); statement scores roll up to their channel.
5. **Reveal (optional, powerful)** — show the voter which channels their blind picks came from (§7).

---

## 3. The scoring math

The data type here — "pick the best k from a set of n" — has a principled model. Don't reinvent it.

- **MVP:** **selection rate with Bayesian shrinkage.** A statement's score ≈ (times selected ÷ times shown), shrunk toward the global mean so a statement shown 5 times doesn't outrank one shown 5,000. Simple, ships fast.
- **Full:** **Plackett–Luce.** This is the canonical model for top-k / ranked choices from a set — the direct generalization of the Bradley–Terry/Elo model already in the plan. Each slate is a partial ranking; you fit a latent quality score per statement. It uses the "what was *not* picked" information that selection-rate throws away, and it stays mathematically continuous with the pairwise Elo leaderboard (same family, richer input).

**Statement → channel aggregation (the subtle part):** you're inferring *channel* quality from *statement* quality, so:
- Aggregate many statements per channel (mean of statement scores, **shrunk** by sample size).
- Track **within-channel variance** — a channel with one brilliant line and ten mediocre ones is different from a consistently solid one; surface both the central estimate and a **confidence band** (Glicko-style), never a false-precision point.
- Require a minimum statement count and exposure before a channel gets a public rating.

---

## 4. What counts as a "statement" (and the corpus problem)

The statement is the atom of the whole system, so define it carefully:

- **Form:** a short verbatim excerpt, headline, or claim — long enough to carry meaning, short enough to read on a phone and to stay within fair-use-for-criticism limits.
- **Provenance-pinned (ties to the anti-forgery doc §5):** every statement is a real, unaltered, correctly attributed excerpt pulled from a canonical source (YouTube caption/transcript via API, broadcast capture, published headline) and hashed on ingest. No free-floating, user-submitted, or paraphrased statements enter the live pool — that's the forgery vector you closed last time.
- **Context preserved:** an out-of-context quote can misrepresent a channel (and invites defamation claims). Keep enough surrounding context that the excerpt is fair; reject gotcha-fragments.

**Fair sampling is non-negotiable.** *Whoever chooses which statements enter the pool controls the result.* Statements must be drawn **representatively and algorithmically** from each channel's actual output over a window — not hand-picked best/worst by editors or users. Hand-curation reintroduces exactly the bias the blind mechanism is meant to remove. Balance the *number* of statements harvested per channel too.

---

## 5. Slate composition & UX

- **Size:** n ≈ 6–8 statements; pick up to k ≈ 3.
- **Source mix:** ideally ≤1 statement per channel per slate, so picks discriminate *between* channels.
- **Randomize** order and composition to kill position bias and make slates unpredictable (an attacker can't pre-plan).
- **Balance valence** within a slate across the political spectrum (see §6).
- **UI:** a clean card slate, tap-to-select up to k, submit, next slate. Mobile-first. Frame it playfully — a *"blind taste test for news."*

---

## 6. The decisive risk — measuring credibility, not agreement

This is the make-or-break design choice. If you ask *"pick the statements you trust most,"* people pick what matches their existing politics, and you've built a partisan-alignment meter wearing a credibility badge.

Mitigations, in order of importance:

1. **Engineer the question.** Ask narrow, low-temperature, quality-specific prompts:
   - *"Which is worded most neutrally?"*
   - *"Which is most precise about what's actually known vs. speculation?"*
   - *"Which best separates fact from opinion?"*
   - *"Which is best sourced / most specific?"*
   Avoid open-valence prompts like "which do you trust" or "which is best."
2. **Run one dimension per slate.** Different prompts populate different axes (neutrality, factual precision, sourcing, sensationalism). Don't blend.
3. **Balance slate valence** so a voter can't just pick "their side."
4. **Triangulate** (from the integrity doc): cross-check crowd selections against the AI referee + fact-checker corroboration to separate *factually sound* from *merely agreeable*. Sharp divergence = a captured-crowd signal.
5. **Optionally, embrace it as a separate output.** By recording *which voter cohort* picks *what*, you can deliberately **map a channel's audience lean** — but label that as a *bias* measurement, kept distinct from the *quality* measurement. Don't let one contaminate the other.

---

## 7. The reveal (engagement + an integrity dividend)

After a voter submits, show them which channels their blind picks actually came from. This is:
- **Sticky and shareable** — the *"I blind-picked the channel I claim to hate"* moment is genuinely surprising and spreads on WhatsApp/X.
- **An integrity proof** — it makes the blindness tangible; voters see for themselves that they judged content, not brands.
- **Media-literacy in action** — it gently confronts people with the gap between their stated loyalties and their blind preferences.

---

## 8. Integrity properties (why this format resists forging)

This mechanic *advances* the unforgeability goal from the last doc:

- **Source-hidden → no targeting.** Can't self-promote or brigade a rival you can't identify. The biggest attack class is structurally dead.
- **Randomized, unpredictable slates → no pre-planning.**
- **Provenance-pinned statements → no injecting fakes.**
- Layer the existing defenses on top: **weighted (not counted) selections**, CIB/sockpuppet detection, device attestation.

**Residual risk to watch — style leakage.** A channel's signature phrasing, anchor catchphrases, or formatting can *de-anonymize* a statement, letting loyalists re-identify and favor it. Mitigations: normalize obvious stylistic tells where feasible (strip station-specific tags/sign-offs), prefer claim/transcript excerpts over branded headlines, and monitor for selection patterns that correlate with identifiable style markers.

---

## 9. Build order

**MVP:** selection-rate + Bayesian shrinkage · single quality-specific dimension · provenance-pinned statement seeding (semi-automated) · basic slate randomization · the reveal.

**Full:** Plackett–Luce scoring · automated representative harvesting across channels · multi-dimension prompts · cohort-based bias mapping (kept separate from quality) · style-leakage normalization.

---

## 10. One fairness caveat to state publicly

A channel is being judged on decontextualized excerpts of its output — useful, but not the whole truth of an outlet. Frame the rating honestly as *"the perceived quality of a representative sample of this channel's statements, judged blind,"* preserve context in every excerpt, and keep the right-of-reply path open (also a legal necessity). That honesty is itself part of what makes the number trustworthy.
