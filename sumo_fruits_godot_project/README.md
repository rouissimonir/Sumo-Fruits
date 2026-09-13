# Sumo Fruits: The Bumper Bowl

This is the complete Godot 4.7 port of the web game. It keeps the original 11-rank fruit catalog and brings the web gameplay systems, modes, presentation effects, and live physics controls into a native Godot project.

## Run locally

1. Install Godot 4.7.2 Standard.
2. In Godot Project Manager, choose **Import** and select this folder's `project.godot`.
3. Open the project and press **F6/F5** or the Play button.

The project uses generated vector art and procedural sound, so it does not need downloaded asset packs.

## Controls

- Mouse or touch: drag the waiting fruit away from the launcher, then release it.
- **S** or **Space**: throw Kiyome-no-Shio salt into the center of the dohyo.
- **P**: pause or resume.
- **R**: restart the current bout.
- HUD buttons: switch mode or arena, view the 11 fruit ranks, tune physics, toggle sound, pause, and restart.

## Ported gameplay

- The original 11 fruit tiers, physical sizes, masses, damping, bounce, knockback resistance, colors, faces, and mawashi details.
- Circular, elliptical, and mass-weighted wobble arenas.
- Sixteen destructible tawara bales, rim breaches, ring-outs, rim saves, and a timed capacity-overflow loss.
- Drag-and-release slingshot with a predicted trajectory and impact marker.
- High-speed locked clashes, momentum-preserving merges, radial fusion shockwaves, combo multipliers, bank-shot recognition, and tier promotion calls.
- Bug, ice, sticky three-hit wasabi, consumable chili, and dynamic rival hazards.
- Sacred salt zones that brake outward motion and purify eligible hazards; one charge refills after six launches, with hazard knockouts contributing recharge progress.
- Crowd hype and three double-score Festival shots.
- Priority referee callouts, technique ribbons, hit stop, camera shake, particles, ripples, confetti, and procedural sound effects.
- Classic play, four-stage Banzuke career with telegraphed Oshidashi/Tsuppari rivals, and three Festival challenges: Wobble Sea, Broken Tawara, and One Beautiful Shot.
- Fruit roster and a live physics tuner with Honbasho, Pinball, Heavyweight, and Chaos presets plus clipboard-ready GDScript constants.

## Automated validation

From this directory, run:

```sh
godot --headless --editor --path . --quit
godot --headless --path . --script res://tests/smoke_test.gd
```

The smoke test covers scene loading, launch, merge, scoring, ring-out/lives, every arena type, broken bales, salt purification, Wasabi durability, challenge setup/completion, career rival spawning, and live tuning.

## Codemagic iOS export

The repository-level `codemagic.yaml` validates this project and exports an Xcode project using Godot 4.7.2. Configure these Codemagic environment variables before starting the workflow:

- `BUNDLE_ID`, such as `com.example.sumofruits`
- `APP_STORE_TEAM_ID`, your Apple Developer Team ID

Signing and App Store distribution still require the matching Apple certificates and provisioning profile in Codemagic.
