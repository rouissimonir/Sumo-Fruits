# Sumo Fruits: The Bumper Bowl (Complete Godot 4.3+ Standalone Project)

A complete, standalone, playable physics-driven arcade merger and sumo bumper game built in Godot 4.3+.

## Quick Start
1. Download **Godot Engine 4.3 or newer** (Standard version from [https://godotengine.org](https://godotengine.org)).
2. Open Godot, click **Import**, browse to this directory, and choose `project.godot`.
3. Press **F5** (or the Play button at the top right) to launch and play immediately!

## Gameplay & Controls
- **Aim & Launch**: Click & drag back on the loaded fruit at the bottom pedestal, then release to launch into the Dohyō bowl!
- **Tsuppari Clashes & Merging**: Colliding matching fruit tiers triggers a clash and fuses them into the next weight class (Tiers 1 to 11 Yokozuna).
- **16 Destructible Tawara Straw Bales**: High-speed impacts damage the perimeter straw bales. If breached, wrestlers can ring out!
- **Wasabi Sludge Hazard**: A sticky mound that slows wrestlers down. Defeat it by:
  1. Striking it 3 times directly with fruits (Tier 4+ deals 2 damage!)
  2. Pushing it out of the ring (Yorikiri)
  3. Throwing Kiyome-no-Shio Sacred Salt (`[S]` key or Salt button)
- **Sacred Salt [S]**: Cleanses hazards and calms chaotic ring momentum. Recharges every 6 launches.
- **Hype & Fever Mode**: Successive merges build Hype into 2x score Fever Mode!
- **Procedural Sound**: Built-in `SoundSynth.gd` generates authentic taiko drums, hyoshigi clappers, and sumo slaps in pure GDScript without needing external audio assets.
