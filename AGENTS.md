# Sumo Fruits development rules

- Follow `docs/progress.md` and `docs/implementation-steps.md`. Gameplay feature work is frozen until the N1 playtest gate is recorded; release fixes and current milestone tasks are allowed.
- App Store images must show actual gameplay. Keep claims aligned with enabled controls and features.
- Preserve the React, Canvas 2D, Capacitor iOS release path and the `tsx --test` runner.
- Before committing code, run `npm run lint` and `npm test`. Run `npm run verify:ios-release` and `npm run build` for release-facing changes.
- Make targeted changes and preserve unrelated user files. Record choices that affect scope or release claims in `docs/decisions.md`.
- N3 architecture goals are staged work: seeded gameplay randomness, fixed-step simulation, engine events for effects, storage adapter, validated data, and a headless balance bot. Do not claim these are already present or enforce a rule that would make the current game unbuildable.
