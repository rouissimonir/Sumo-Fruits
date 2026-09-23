# Sumo Fruits — Implementation Steps (next level)

Each step takes 1–4 hours, one prompt each. ⚠️ = "ask for a plan before any code".
Definition of done for every code step: `npm run lint && npm test` green (plus `npm run validate-data && npm run sim -- --runs 50` once N3 adds them). Tick the step in `docs/progress.md`, commit `N{x} x.y: <summary>`.

Keep the current test runner (`tsx --test`). Don't migrate to Vitest unless something forces it.

---

## N0 — Freeze & fix the listing (3–4 days)

| # | Step | Done when |
| --- | --- | --- |
| 0.1 | Create `docs/progress.md` (every step ID below + **Needs Mo** list + **Later** list), `docs/decisions.md`, `docs/research.md` | Files exist; "FEATURE FREEZE until N1 gate" is the first line of progress.md |
| 0.2 | Create `CLAUDE.md` + `AGENTS.md` (rules below) | Both committed |
| 0.3 | **Mo:** capture 6 real gameplay screenshots (L1 merge, L6 Tengu boss with intent arrow, hazard push-out, big merge/Yokozuna, career map, reward reveal) at 1320×2868 + 1284×2778, frame them with logo/caption | Every screenshot's play area is a real, unedited capture. No "curve" claims while `curveShots` is off |
| 0.4 | Remove `sc1` "Aim. Curve." art and the 3D-style mascots from store use. Keep them as future art reference in `marketing/reference/` | App Store Connect shows only the real-gameplay set |
| 0.5 | Rename chapter 4 "Road to Yokozuna" → "The White Rope" (or similar) in `CAMPAIGN_CHAPTERS` + any UI copy | Test: no string "Road to Yokozuna" left in `src/` |
| 0.6 | Add a `?debug` / Settings-hidden **session log**: level_start/end, shots, result, cause, duration → stored locally, "Export log" copies JSON | Test: playing 2 levels produces 2 `level_end` records; export returns valid JSON |
| 0.7 | **Mo:** confirm App Store submission status; TestFlight external group "Playtest-1" set up | Link ready to send |

## N1 — Stranger playtest (1 week)

| # | Step | Done when |
| --- | --- | --- |
| 1.1 | **Mo:** 5 testers (play mobile puzzle games, never seen it). Hand over the phone, say nothing, record thumbs + face if allowed | 5 sessions done |
| 1.2 | **Mo:** after each session ask exactly: What was the goal? Best moment? Would you play again tomorrow? | Answers in `docs/research.md` |
| 1.3 | Collect the exported session logs → a table: seconds to first merge, levels cleared, where each quit | Table in `docs/research.md` |
| 1.4 | **Gate:** write PASS/FAIL against the plan §10 thresholds, plus the top 5 problems ranked | Entry in `docs/decisions.md`. FAIL → do N2 only, then re-run N1 with 5 new people |

## N2 — First 5 minutes + feel (2 weeks)

| # | Step | Done when |
| --- | --- | --- |
| 2.1 ⚠️ | Front door: app opens on the Career map (or straight into L1 on first launch). Classic / Daily unlock after L6; Versus under "More"; Challenge removed/merged | First launch → in a level within 1 tap; test asserts the unlock rule |
| 2.2 | Replace `TutorialModal` text wall with teach-by-doing overlays in L1–L3 (ghost finger shows drag-back once, then disappears after the first successful launch) | New player launches within 10 s without reading anything (Needs Mo: verify on device) |
| 2.3 | Remove arena-mode cycling + skill-cycling clutter from the HUD during career; objective = one line + shot counter | HUD in L1 shows ≤ 4 elements |
| 2.4 | Result screen: stars/stamps, "what worked" line (best kimarite), **one big Next** button + small Retry; Retry is instant (< 300 ms) | Timed in a test; manual check |
| 2.5 | Juice audit against template §15. Add whatever's missing: hit-stop 20–40 ms on tier ≥ 6 clashes, screen shake scaled by mass (respects reducedMotion), ring-out slow-mo 0.3 s | Checklist ticked in progress.md |
| 2.6 | Rival intent always readable: the arrow/cone is visible on the shot *before* the attack, and the launch preview highlights whatever would be pushed out | Needs Mo: tester can say what the boss will do next |
| 2.7 | Apply the top-5 fixes from N1.4 (one step each, added here) | Each fix has a "done when" |
| 2.8 | **Gate:** N1 protocol with 5 **new** testers + session log | PASS/FAIL written down |

## N3 — Deterministic sim + balance bot (2 weeks)

| # | Step | Done when |
| --- | --- | --- |
| 3.1 | `src/sim/rng.ts` mulberry32 with `float/int/pick/weighted`; engine holds one `rng` seeded per level/daily | Test: same seed → same 1,000-value sequence |
| 3.2 ⚠️ | Replace all 31 `Math.random` in `src/game` + `src/physics` with `rng` (visual-only particles may use a separate `fxRng`) | `grep Math.random src/game src/physics` → 0 (lint rule enforces it) |
| 3.3 ⚠️ | Fixed 60 Hz step with an accumulator; `timeScale`/hit-stop change the step count, not `dt`; render interpolates | Test: replaying the same launch commands gives identical final positions 100× |
| 3.4 ⚠️ | Engine emits typed events (`launch`, `clash`, `merge`, `ringOut`, `refereeCall`, `haptic`…) into a pooled queue; an `fx` adapter plays sound/haptics. Remove the `sound`/`haptics` imports from `GameEngine.ts` | Engine file imports nothing from `src/audio`; game sounds identical (Needs Mo) |
| 3.5 | `platform/storage.ts` wraps localStorage (memory fallback in Node) | Engine runs in Node with no DOM |
| 3.6 | `data/fruits.json`, `data/balance.json`, `data/campaign/chapter-1..4.json`, `rivals.json`, `rewards.json` + Zod schemas; `npm run validate-data` | A typo fails with `chapter-2.json[3].queue: …` |
| 3.7 | `tools/sim-runner.ts` + bots (random, greedy, smart = 64 sampled aim/power per shot) → `npm run sim -- --runs 200 [--level career-06] [--csv]` | Prints a clear-rate + median-shots table for all 24 levels in < 2 min |
| 3.8 | Tune levels outside the plan §5 targets (JSON diffs only) | All 24 levels inside target bands |
| 3.9 | Split `GameEngine.ts` → `ShotDirector`, `PhysicsWorld`, `ScoreKeeper`, `modes/*` | No `src/` file > 800 lines except `GameCanvas.tsx` (tracked in Later) |
| 3.10 | CI (GitHub Actions or Codemagic pre-step): lint, test, validate-data, `sim --runs 50`, build | Red CI blocks the iOS build |

## N4 — Market test (runs alongside N3)

| # | Step | Done when |
| --- | --- | --- |
| 4.1 | Deploy the Vite build to Cloudflare Pages + itch.io (`base: './'`, touch + mouse) | Public URL plays on phone and desktop |
| 4.2 | **Mo:** set thresholds in `docs/decisions.md` **before** posting (plan §10) | Written and dated |
| 4.3 | **Mo:** 5 vertical 10–20 s videos, hook in the first 2 s, all real gameplay: (a) watermelon shoves a boss out, (b) 3× chain merge, (c) near-ring-out save, (d) "Suika but they fight back", (e) Yokozuna Pineapple coronation | Posted daily for a week on TikTok / Shorts / Reels |
| 4.4 | Landing page: 1 GIF, web play button, App Store badge, email signup | Live |
| 4.5 | **Gate:** compare against the thresholds | PASS/FAIL + which hook won, logged |

## N5 — Retention layer (3–4 weeks, only after N2 + N4 pass)

| # | Step | Done when |
| --- | --- | --- |
| 5.1 ⚠️ | Analytics adapter (`platform/analytics.ts`), privacy-focused provider, events from plan §13; update App Privacy label, PRIVACY.md, ATTRIBUTIONS.md | Events visible in the dashboard from a TestFlight build; docs truthful |
| 5.2 | Daily Basho on the deterministic seed: 1 attempt counted, result card (emoji grid of shots/merges/push-outs) → native share sheet | Two devices on the same date get an identical board; share opens the sheet |
| 5.3 | Streak + calendar for Daily Basho (no punishment for missing days) | Test: streak logic across UTC boundary |
| 5.4 ⚠️ | StoreKit one-time "Full Dohyō" unlock (chapter 2+) + Restore Purchases (Capacitor IAP plugin) | Sandbox purchase + restore both work |
| 5.5 | Chapters 5–6 (12 levels), 2 rivals, 1 hazard, authored in JSON and bot-validated | `npm run sim` in target bands |
| 5.6 | **Gate:** cohort D1 ≥ 30%, D7 ≥ 10% | Numbers logged |

## N6 — Scale (only if N5 passes)

Android via `@capacitor/android` + Codemagic → localisation (FR, AR, JA, ES) → async friend challenge (share a seed + your score, friend plays the same board) → art upgrade (plan §11 option B) → weekly content drops.

---

## CLAUDE.md (paste on day 1)

```markdown
# Sumo Fruits — rules for AI

## Architecture (never break)
- src/sim/** (and GameEngine until it's split) must not import src/audio, src/components, React, or window/document.
- All gameplay numbers live in data/*.json once N3.6 lands. No new magic numbers in engine code.
- All gameplay randomness goes through sim/rng.ts. Math.random is lint-banned in src/game, src/physics, src/sim.
- Sound and haptics are triggered only by draining engine events.
- No new file over 800 lines. Split instead.

## Scope
- FEATURE FREEZE until the N1 gate passes. Only fixes and steps from docs/implementation-steps.md.
- Store screenshots/marketing must show real gameplay. Never claim a feature that is flagged off.

## Definition of done
- npm run lint && npm test (+ validate-data, sim --runs 50 after N3) all pass.
- Tick the step in docs/progress.md; log unclear choices in docs/decisions.md.
- Describe the change in 3 bullets. Don't touch unrelated files.

## Engine notes
- React 19 + Canvas 2D + Capacitor 8 (iOS). Tests: `tsx --test tests/**/*.test.ts`.
- Codemagic builds iOS on pushes to main; macOS native binaries are pinned in optionalDependencies. Don't remove them.
```

## Prompts

**Kickoff (plan mode):**

```
You are working on "Sumo Fruits: The Bumper Bowl" (React 19 + Canvas 2D + Capacitor iOS).
Read fully first: @docs/plan.md and @docs/implementation-steps.md.
Task: complete N0. I do 0.3, 0.4 and 0.7 myself; you do the rest.
Create CLAUDE.md and AGENTS.md from the block in implementation-steps.md.
After each step run its "done when", tick it in docs/progress.md, commit "N0 0.x: <summary>".
Stop when N0 is done: tell me what's done, what I must do by hand, and what you decided.
Show me your plan first.
```

**Milestone prompt:** reuse template §12 with `N{x}` in place of `M{N}` and `npm run lint && npm test` as the check command.

**One-liners:**

- Drift: `Re-read plan section X and redo step Y.`
- Balance (after N3): `Run npm run sim -- --runs 500 --csv, compare to plan §5, propose changes as JSON diffs only.`
