# Sumo Fruits — Next-Level Plan

*Written 2026-09-23, following `SUCCESS_TEMPLATE.md`. Source of truth for what happens next. Build steps are in `docs/implementation-steps.md`.*

> **Short version:** Sumo Fruits doesn't need more features to get to the next level. It needs **evidence** — proof that strangers understand it, enjoy it, and come back. You built most of the template's M4 (content & meta) and M5 (native build) **before running the M1–M3 kill gates**. This plan runs those gates now, fixes the three problems that could sink the launch, and only then scales up content.

---

## 0. Where the game stands (audit)

What I found in the repo:

| Area | Status | Assessment |
| --- | --- | --- |
| Core loop | Slingshot fruit into a bowl, merge same tiers, push hazards/rivals out | ✅ Has a real twist (Suika merge + sumo push-out) |
| Modes | Classic, Career (24 levels / 4 chapters / 4 rival bosses), Challenge, Daily Basho, Versus pass-and-play | ⚠️ 5 front doors, and nobody outside has confirmed any of them is fun |
| Systems | 3 skills, 7 hazard kinds, 3 arena shapes, 4 arena conditions, kimarite ledger, missions, rewards, referee voice, adaptive music | ⚠️ A lot of systems for a game with no playtest data |
| Native | Capacitor 8 iOS, Codemagic CI, "prepare first App Store submission" commit (09-21) | ✅ Ahead of schedule |
| Tests | 4 test files (`node --test` via tsx), ~200 lines | 🟡 Good start, only covers a few paths |
| Architecture | `GameEngine.ts` = 3,152 lines. Imports `sound` + `haptics` directly. Variable `dt` (`realDt * timeScale`). **31 × `Math.random`** in the engine. Tuning numbers live in TS, not JSON | 🔴 Breaks template rule #1. There's no headless sim, no balance bot, and nothing is deterministic |
| Analytics | None. `ATTRIBUTIONS.md` promises "zero telemetry" | 🔴 After launch you won't be able to tell *why* players quit |
| Store screenshots | AI-rendered, painterly/3D fruit characters | 🔴 **They don't look like the game** (the game draws procedural 2D vector fruit). `sc1` sells "CURVE", but commit `simplify straight-only mobile play` removed curve from mobile |

### The three launch killers (fix first)

1. **The store screenshots misrepresent the game.** Apple's guidelines require screenshots to show the app in use, so this is a rejection risk. Even if review lets them through, the gap between the listing and the real game leads to "not what I expected" deletes and 1-star reviews on day one. → Step N0.3.
2. **No measurement.** Without events you can't run a single gate in this plan. → N1 (App Store Connect's opt-in retention data + a local session log) and N5 (privacy-friendly analytics).
3. **Too many choices on the first screen.** Five modes plus settings plus arena cycling is choice paralysis for a new player. Career should be the front door. Everything else unlocks through it. → N2.

---

## 1. Concept (sharpened)

**Pitch:** A physics merge game where you **slingshot sumo fruits into a ring**: bump equals together to grow heavyweights, and bump rivals out of the ring.

**Core fantasy:** Start as a blueberry rookie. 10 minutes later your watermelon is shoving a boss out of the dohyō.

**The twist in one sentence:** *Suika, but the fruit fight back.* Merging makes you heavier, and weight is what wins the push-out.

**Design pillars:**

1. **The bump is the skill.** Every feature has to make aiming and bumping more interesting. If it doesn't, it's cut.
2. **Weight you can feel.** Bigger tier = slower, heavier, more dominant. Clashes must *feel* like mass.
3. **One thumb, 60-second bouts.** Each level fits in a bus stop.
4. **Readable chaos.** You can always see what will be pushed out next (edge danger, rival intent arrows).
5. **Data-driven everything.** Levels, fruits and balance live in JSON (not the case today; see N3).

**Reference games:**

| Game | Steal this | Avoid this |
| --- | --- | --- |
| Suika Game (Aladdin X) | Instant readability, "one more drop", tier ladder everyone knows | Endless only, no goals, and a huge crowd of clones in the store |
| Angry Birds / Crossy-style level maps | Short levels, 3-star mastery, instant retry | Energy systems |
| Curling / Crokinole | Knock-out tactics, reading angles | Slow pacing |
| Wordle-style dailies | One shared daily seed, share-card virality | — |

**Competitive landscape (checked 2026-09-23):**

| Game | Platform | What it tells you |
| --- | --- | --- |
| Suika Game + many "Watermelon merge" clones | Web / iOS / Android | Proves demand for the fruit ladder. Also means **"merge fruit" alone is a commodity**, so the push-out has to lead every piece of marketing |
| SumoRoll: Road to the Yokozuna | iOS / Android | An existing sumo mobile game with nearly the same subtitle as your Chapter 4 ("Road to Yokozuna"). Rename the chapter to avoid confusion (N0.5) |
| Sumotori Dreams (mobile port) | iOS / Android | Sumo + physics has cult appeal, but it's a ragdoll comedy game, not a merge game. Different audience |

**How to be different (in shipping order):**

1. Push-out combat on top of the merge ladder (**have it**, but make it the headline).
2. Boss rivals with telegraphed intent (**have it**, show it in the first 30 s of every video).
3. Daily Basho with a shareable result card (N5).
4. Async "challenge a friend" bouts on the same seed (only after N3 makes the sim deterministic).

---

## 2. Core loop & controls

- **Session target:** 6–10 min (3–6 career levels). **Stop mid-run:** at any level boundary; backgrounding already pauses.
- **Loop:** pick level → read objective (≤ 1 line) → 4–18 shots → result with stamps → next (one tap).
- **Meta loop:** stamps → chapter unlocks → rival boss → cosmetic reward (mawashi / bowl / tawara).

| Input | Action |
| --- | --- |
| Drag back from launcher | Aim + power (straight, default) |
| Release | Launch |
| Tap skill button, then launch | Arm Palm Strike / Taiko |
| Tap salt, then tap bowl | Place salt |

**Open design questions → A/B flags (decide at the N1/N2 gates, tie = the simpler option):**

- `curveShots`: off (current mobile) vs. an unlockable in chapter 3. *If it stays off, remove it from all marketing.*
- `skillsInClassic`: on vs. off.
- `frontDoor`: `career` (recommended) vs. `classic`.

---

## 3. Systems — keep, hide, cut

Max ~7 core systems. Everything else gets hidden until the gates say it earns its place.

| # | System | Decision | Why |
| --- | --- | --- | --- |
| 1 | Slingshot + bowl physics | **Keep, polish** | It *is* the game |
| 2 | Merge / clash | **Keep, polish** | Pillar 2 |
| 3 | Ring-out / lives | **Keep** | Pillar 1 |
| 4 | Hazards (BUG, ICE, WASABI, CHILI) | Keep | Teach one per level, already done well |
| 5 | Rival bosses | **Keep, feature** | Your best differentiator |
| 6 | Career map + stamps + rewards | **Keep = front door** | Onboarding + retention |
| 7 | Skills (Salt, Palm, Taiko) | Keep but unlock in career | Already gated by level, good |
| — | Classic endless | Unlock after chapter 1 | Suika fans will want it |
| — | Daily Basho | Unlock after chapter 1, **make shareable** in N5 | Retention hook |
| — | Versus pass-and-play | Hide behind a menu, **don't promote** | Pass-and-play is rarely used on phones. Revisit as async later |
| — | Challenge mode | **Cut or merge into career** | Duplicates career |
| — | Arena-mode cycling in the HUD | **Remove from HUD** | Designer toggle, not a player choice |
| — | Missions / kimarite ledger | Keep, secondary | Low cost, but don't add more |

---

## 4. Content (v1 = what exists)

**No new content until the N1 gate passes.** v1 is 24 levels, 4 rivals (Tengu Orange, Cherry Slapper, Coconut Tank, Dragonfruit Yokozuna), 4 cosmetic rewards and 11 fruit tiers. That's enough for a launch.

v1.1 (after N4, if the gates pass): chapters 5–6 (12 levels), 2 new rivals, 1 new hazard, and cosmetic sets. Everything authored in JSON and validated by the bot.

---

## 5. Balance, data & targets

**Move to data files (N3):**

- `data/fruits.json` ← `FRUIT_CATALOG`
- `data/balance.json` ← `PhysicsTuning` defaults, combo/fever/hype, skill charges, settle thresholds (22 px/s, 0.35 s, 6 s failsafe), spin constants
- `data/campaign/chapter-N.json` ← `CAMPAIGN_LEVELS`
- `data/rivals.json`, `data/hazards.json`, `data/rewards.json`
- All validated with Zod at load and in CI.

**Bot targets (per career level, 200 seeded runs each):**

| Bot policy | Clear rate | Median shots used |
| --- | --- | --- |
| Random aim/power | < 10% (after level 3) | — |
| Greedy (nearest equal-tier target) | 30–60% | ≤ 90% of limit |
| Smart (search over ~64 aim/power samples per shot) | ≥ 95% | ≤ 70% of limit |

Rules: if the smart bot clears < 95%, the level is too hard or broken. If random clears > 30%, the level teaches nothing. The difficulty curve should rise across chapters with a dip after every boss.

**Human targets:** first 10 levels clear rate 70–90% first try; boss levels 30–50% first try.

---

## 6. Tech & architecture — targeted refactor, not a rewrite

Keep React + Canvas 2D + Capacitor. It works, and a rewrite would kill the momentum. The one change that matters:

```
data/*.json (Zod) ─► src/sim  (pure TS: world, rng, events, fixed 60 Hz step) ─► event queue
                                                                                   ├─► GameCanvas (render)
input ─► commands ─┘                                                               ├─► sound / haptics
                                                                                   └─► analytics
src/sim ─► tools/sim-runner.ts (Node, headless bot)
```

**Why now?** Three things on this roadmap need a deterministic, headless sim: the balance bot, fair Daily Basho seeds (31 × `Math.random` means two players on the same day don't get the same game), and async friend challenges.

Refactor rules (strangler pattern, one slice at a time, game shippable after every step):

1. `sim/rng.ts` (mulberry32) replaces every `Math.random` in `src/game` + `src/physics`.
2. A fixed-step accumulator in the engine; render interpolates.
3. `sound.*` / `haptics.*` calls in the engine become typed events (`merge`, `ringOut`, `clash`, `refereeCall`…), drained by an `fx` adapter.
4. `localStorage` behind `platform/storage.ts`.
5. Split `GameEngine.ts` by domain: `ShotDirector`, `PhysicsWorld`, `ScoreKeeper`, `ModeController` (career / classic / daily / versus). Target: no file over 800 lines.

**Performance budget (floor device: iPhone XR / iOS 15):** 60 fps, ≤ 40 bodies, sim step < 4 ms, JS heap < 150 MB, cold start < 2 s.

---

## 10. Milestones with kill gates (re-based to where you actually are)

| # | Milestone | Length (part-time) | Deliverables | Kill gate (set before looking) |
| --- | --- | --- | --- | --- |
| **N0** | Freeze & fix the listing | 3–4 days | Feature freeze, `docs/` + `CLAUDE.md`, honest screenshots, chapter rename, submission status confirmed | — |
| **N1** | Stranger playtest | 1 wk | TestFlight to 5 fresh genre players, local session log, silent observation | ≥ 4/5 do bump-to-merge **unprompted within 30 s**; ≥ 3/5 beat Tengu (L6); ≥ 3/5 say they'd play tomorrow. **Fail → N2 only, no content, re-test** |
| **N2** | First 5 minutes + feel | 2 wk | Career as front door, teach-by-doing L1–3, juice pass, one-tap retry/next, HUD declutter | 5 *new* testers: median session ≥ 6 min; ≥ 3/5 start another level on their own |
| **N3** | Sim extraction + bot | 2 wk | Deterministic sim, JSON data + Zod, balance bot, CI | `npm run sim` clears all 24 levels at target rates; same seed = same result 1,000× |
| **N4** | Market test (runs alongside N3) | 1–2 wk | Web build on itch.io / Cloudflare Pages (you already have a Vite web build), 5 vertical videos, landing page | Watch-through > 50% on ≥ 1 video; ≥ 1% of viewers visit the store/web build; 100+ web plays. **Fail → rework the hook/art, not the code** |
| **N5** | Retention layer | 3–4 wk | Privacy-friendly analytics, shareable Daily Basho, chapters 5–6 (JSON), premium unlock | Cohort D1 ≥ 30%, D7 ≥ 10% |
| **N6** | Scale | ongoing | Android (Capacitor, same codebase), weekly updates, localisation (FR/AR/JA/ES), async duels | D1/D7 hold for 2 update cycles → invest more; D1 < 25% after 2 cycles → stop content and fix the core, or shelve and reuse the engine |

**Rule:** nothing from a later milestone before the current gate passes. Put new ideas on a "later" list in `docs/progress.md`.

---

## 11. Art direction decision

Your listing art (painterly 3D mascots) is much more appealing than the in-game procedural vector fruit. Pick one, and do it honestly:

- **Option A (cheap, now):** screenshots = real gameplay captures inside a branded frame (logo, caption, pattern border). Always compliant.
- **Option B (after N4 passes):** bring the game up to the art. Commission or produce sprite sheets for the 11 fruit + 4 rivals in the key-art style (the per-tier idle/squash/panic frames the canvas renderer already fakes). Pay for art **only after the market test** (template §11).

Do A now. Decide on B with the N4 numbers.

---

## 13. Validation, analytics & business

- **Before analytics exists:** App Store Connect → App Analytics already shows retention for users who opt in to share. Use it from day one. Also add a local `sessionLog` (dev/TestFlight builds only) you can export from Settings.
- **N5 analytics:** choose a privacy-focused SDK (e.g. TelemetryDeck or self-hosted PostHog), then update the App Privacy label and `ATTRIBUTIONS.md` / `PRIVACY.md` so they stay truthful. Events: `session_start`, `level_start{id}`, `level_end{id,result,shots,stars,cause}`, `tutorial_step`, `boss_attempt`, `daily_played`, `share_tapped`, `unlock_viewed`, `purchase`.
- **Soft-launch targets:** tutorial (L1–3) completion ≥ 85%, D1 ≥ 35%, D7 ≥ 12%, ≥ 3 levels/session.
- **Monetisation v1:** free chapter 1 (6 levels incl. first boss) → one-time **Full Dohyō** unlock ($3.99) for chapters 2+ and future chapters, plus cosmetic packs. No ads in v1: they would break the "zero ad networks" promise and bring ATT/privacy work. Add **Restore Purchases**. Enrol in the App Store Small Business Program (15%).

---

## 17. Risks

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Listing art mismatch → rejection or bad reviews | **High** | High | N0.3 real-gameplay screenshots |
| Strangers don't get the bump-to-merge verb | Medium | **Fatal** | N1 gate; fix in N2 before any content |
| Players read it as "yet another Suika clone" | High | High | Lead every asset with the push-out + boss, not the merge |
| `GameEngine.ts` monolith slows every AI change | High | Medium | N3 strangler refactor, 800-line cap in CLAUDE.md |
| Feature pile-up (it has already happened) | **High** | High | Feature freeze until N1, one new mechanic per week max |
| Splitting time across several game projects + relocation | High | High | One game gets the weekly hours until its next gate result. Shelve the others explicitly |
| Burnout | Medium | High | Fixed weekly hours, playable TestFlight every week |

---

## 18. Next 48 hours

- [ ] Declare the feature freeze (write it at the top of `docs/progress.md`)
- [ ] Check App Store Connect: submitted? in review? If not yet submitted → swap screenshots **before** submitting
- [ ] Capture 6 real gameplay screenshots (6.9" + 6.5") and frame them
- [ ] Rename chapter 4 "Road to Yokozuna" → e.g. "The White Rope"
- [ ] Book 5 playtesters who play mobile puzzle games and have never seen the game
- [ ] Run the N0 kickoff prompt from `docs/implementation-steps.md`

**Before every gate:** play 10 levels yourself, fix the top 5 problems, write the gate result down honestly, and be willing to stop.
