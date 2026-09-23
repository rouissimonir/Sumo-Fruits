FEATURE FREEZE until N1 gate passes.

# Sumo Fruits release progress

The first submission remains paused until the N0 store listing is accurate. This file tracks the plan in `docs/plan.md` and `docs/implementation-steps.md`. A checked item means its stated acceptance test passed, not that a future milestone has started.

## N0 — submission preparation

- [x] 0.1 Create progress, decisions, and research records.
- [x] 0.2 Add repository guidance for the release freeze and future architecture.
- [ ] 0.3 Capture and frame six actual gameplay screens at both iPhone sizes.
- [ ] 0.4 Replace the current illustrated App Store screenshots with the real gameplay set in App Store Connect; local concepts have been archived as reference.
- [x] 0.5 Rename chapter 4 to The White Rope and remove the old phrase from player-facing copy.
- [ ] 0.6 Add and verify the opt-in, local playtest session log. Code and automated test pass; verify Settings export on the new TestFlight build.
- [ ] 0.7 Confirm submission status and create the external TestFlight playtest group.

## N1 — stranger playtest

- [ ] 1.1 Observe five new mobile puzzle players.
- [ ] 1.2 Record the three post-session answers for each player.
- [ ] 1.3 Summarize exported session logs.
- [ ] 1.4 Record PASS/FAIL and five ranked problems.

## N2 — first five minutes (only after N1 result)

- [ ] 2.1 Career front door and mode unlocks.
- [ ] 2.2 Teach launching in play.
- [ ] 2.3 Simplify early career HUD.
- [ ] 2.4 Faster result and retry flow.
- [ ] 2.5 Clashes and ring-out feel audit.
- [ ] 2.6 Rival intent readability.
- [ ] 2.7 Fix the top five observed problems.
- [ ] 2.8 Repeat the playtest with five new players.

## N3 — deterministic simulation (only after N2 gate)

- [ ] 3.1 Seeded RNG.
- [ ] 3.2 Route gameplay randomness through RNG.
- [ ] 3.3 Fixed simulation step.
- [ ] 3.4 Engine events and effects adapter.
- [ ] 3.5 Storage adapter.
- [ ] 3.6 Validated game data files.
- [ ] 3.7 Headless balance runner.
- [ ] 3.8 Tune levels from bot results.
- [ ] 3.9 Split the engine by responsibility.
- [ ] 3.10 CI gates for validated data and simulation.

## N4 — market test

- [ ] 4.1 Publish the playable web build.
- [ ] 4.2 Record thresholds before posting.
- [ ] 4.3 Post five honest gameplay videos.
- [ ] 4.4 Publish a simple landing page.
- [ ] 4.5 Record PASS/FAIL and the strongest hook.

## N5 — retention (only after N2 and N4 pass)

- [ ] 5.1 Privacy-reviewed analytics and updated disclosures.
- [ ] 5.2 Fair daily board and native result sharing.
- [ ] 5.3 Gentle streak calendar.
- [ ] 5.4 Full Dohyō purchase and restore.
- [ ] 5.5 Two validated new chapters.
- [ ] 5.6 Record D1/D7 retention gate.

## N6 — scale (only after N5 gate)

- [ ] Android, localisation, async challenge, art refresh, and weekly content as justified by the gate.

## Needs Mo

- Capture actual iPhone gameplay for N0.3 or provide original captures from the current TestFlight build.
- Replace uploaded screenshots in App Store Connect before submitting for review.
- Confirm the current App Store review status and the external TestFlight group.
- Recruit five genre players who have not seen the game.

## Later

- New rivals, hazards, cosmetics, and chapters wait for N1 evidence.
- Deterministic simulation and monetisation are separate milestones; do not delay an honest first submission just to add them.
