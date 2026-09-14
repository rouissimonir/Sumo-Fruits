# Sumo Fruits: The Bumper Bowl — Comprehensive Requirements & Architecture Specification
**Document Version:** 2.0.0  
**Target Runtime:** iOS 15+ (React 19 + Vite + HTML5 Canvas 2D + Web Audio API inside Capacitor 8)
**Status:** Canonical Implementation & Systems Architecture Specification

---

## 1. Executive Summary & Core Pillars

*Sumo Fruits: The Bumper Bowl* is a physics-driven merge battler and arena combat game. Merging the progressive weight-class escalation of the "Suika" watermelon merge genre with Japanese grand sumo (*Ozumo*) physics, players slingshot sumo fruits into an authentic concave clay arena (*Dohyō*), clashing weights, managing ring capacity, triggering multi-tier fusions, and knocking rivals past the sacred straw bales (*Tawara*).

### The Four Foundational Pillars
1. **Authoritative Physics Integrity:** A single mathematical physics model rules free motion, bowl slope acceleration, surface damping, English spin steering, and environmental forces across both preview trajectory and live simulation.
2. **Deterministic Event Pipeline:** An event router guarantees single ownership of score, life loss, fusion reservations, and technique detection. No duplicate fusions, no ghost ring-outs.
3. **Intentionality & Touch Precision:** Slingshot launching defaults strictly to linear, straight trajectories (`spin = 0.0`). Complex English curves require deliberate user engagement.
4. **Authentic Ritual Atmosphere:** Sumo Gyōji referee calls, Hyōshigi wooden clappers, Taiko drums, sacred Kiyome-no-Shio salt purification, and 48 Kimarite winning maneuvers.

---

## 2. System Architecture & Module Boundaries

```text
src/
├── types/
│   └── game.ts                  # Canonical interfaces, enum declarations, catalog tables
├── physics/
│   ├── bowlMotion.ts            # Canonical acceleration, damping, surface friction, English spin
│   └── trajectoryPredictor.ts   # Swept-circle prediction matching exact integration step
├── game/
│   ├── GameEngine.ts            # Authoritative session state machine & frame orchestrator
│   ├── ShotDirector.ts          # Shot lifecycle, settlement detection, turn boundaries
│   ├── EventRouter.ts           # Authoritative gameplay event queue (decouples logic from FX)
│   ├── TechniqueDetector.ts     # Causality-linked Kimarite detection engine
│   ├── KimariteManager.ts       # Achievement ledger, persistence, progression
│   ├── CareerManager.ts         # Banzuke ranking ladder, stages, complication rules
│   ├── DuelController.ts        # Turn-based pass-and-play duel rules, ownership, paired queues
│   ├── ArenaConditionManager.ts # Dynamic conditions (Grippy Clay, Kamikaze Wind, Closing Ring)
│   ├── RefereeDirector.ts       # Voice prioritization, callout queue, cooldown management
│   └── ReplayRecorder.ts        # Visual snapshot ring-buffer for highlight playback
├── components/
│   ├── GameCanvas.tsx           # High-performance 60fps canvas renderer (zero gameplay logic)
│   ├── HUD.tsx                  # Top status bar, salt meter, spin toggles, duel banners
│   ├── SpinSelector.tsx         # [↶ Left | Straight | ↷ Right] interactive launcher dock
│   ├── SettingsModal.tsx        # Configuration, volume sliders, arena shape selection
│   ├── TierListModal.tsx        # 11-Tier wrestler encyclopedia
│   ├── KimariteModal.tsx        # Technique stamps ledger & replays
│   └── ParameterTuner.tsx       # Live physics engine calibration suite
└── audio/
    └── soundEffects.ts          # Synthesized Web Audio API soundscape & Gyōji vocal engine
```

### Separation of Concerns Matrix

| System / Module | Authority & Responsibilities | Forbidden Operations |
|---|---|---|
| `GameEngine` | Runs timestep, owns bodies, advances shot state machine, tracks lives & score | Drawing to canvas, playing unqueued audio directly |
| `BowlMotion` | Computes \(\mathbf{a}_{\text{total}}\), angular drift, surface restitution | Directly mutating entity IDs or score |
| `ShotDirector` | Determines `AIMING` → `LAUNCHED` → `SETTLING` → `RESOLVED` boundaries | Changing fruit tiers or altering player lives |
| `EventRouter` | Queues single-event emissions with causality IDs (`shotId`, `causeEntityId`) | Modifying physics coordinates |
| `TechniqueDetector` | Evaluates committed events for Kimarite criteria (e.g. *Oshidashi*, *Hikiotoshi*) | Granting score or lives directly |
| `DuelController` | Controls `PLAYER_ONE` vs `PLAYER_TWO`, active queue pointer, camera rotation | Permitting cross-owner fusions |
| `GameCanvas` | Renders sprites, mawashi tails, particle systems, calligraphy overlays | Modifying any game state or physics calculations |
| `ReplayRecorder` | Samples visual state at 20Hz into a circular ring buffer; replays purely visually | Spawning physical colliders or triggering game scoring |

---

## 3. Core Physics & Deliberate Spin Model

### 3.1 Default Straight Aiming Law
- **Default State:** `launcherSpin = 0.0` (Linear Slingshot).
- Single-touch slingshot drag adjusts only the launch impulse magnitude and heading angle \(\theta\).
- Accidental sideways finger drag **never** imparts angular drift or trajectory curvature.

### 3.2 Deliberate Curve Selection Modes
Three selections exist:
- `CURVE_LEFT` (\(s = -1.0\))
- `STRAIGHT` (\(s = 0.0\)) — **Default**
- `CURVE_RIGHT` (\(s = +1.0\))

**Engagement Mechanisms:**
1. **Interactive Spin Selector Pill:** Placed adjacent to the launcher or on the HUD: `[ ↶ Left | Straight | ↷ Right ]`. Tapping explicitly sets the curve bias for the shot.
2. **Two-Finger Modifier Gesture (Mobile Touch):** Holding a second finger anywhere on screen while pulling the slingshot engages curve mode; lateral offset of the secondary touch or pull dynamically biases \(s\). Releasing the modifier finger before launch safely resets to Straight without premature release.

### 3.3 The Shared Motion Formulation
During free motion across timestep \(\Delta t\):

$$\mathbf{a}_{\text{total}} = \mathbf{a}_{\text{bowl}} + \mathbf{a}_{\text{wind}} + \mathbf{a}_{\text{salt}}$$

$$\mathbf{a}_{\text{bowl}} = -k_{\text{slope}} \cdot (r / R)^2 \cdot \hat{\mathbf{u}}_r$$

For fruits with active spin (\(s \neq 0\)), before first solid contact:

$$\Delta\theta = s \cdot \omega_0 \cdot \sqrt{\frac{m_{\text{ref}}}{m}} \cdot e^{-\lambda t} \cdot \Delta t$$

$$\mathbf{v}_{\text{curved}} = \operatorname{Rotate}(\mathbf{v}, \Delta\theta)$$

$$\mathbf{v}(t + \Delta t) = (\mathbf{v}_{\text{curved}} + \mathbf{a}_{\text{total}} \Delta t) \cdot (1 - \gamma_{\text{total}} \Delta t)$$

**Baseline Starting Constants:**
- Initial Turn Rate \(\omega_0 = 1.25\text{ rad/s}\)
- Decay Rate \(\lambda = 3.8\text{ s}^{-1}\)
- Maximum Duration \(t_{\text{max}} = 0.65\text{ s}\)
- Maximum Accumulated Heading Deflection \(\Theta_{\text{max}} \approx 18^\circ\)
- **Termination Rule:** Any solid contact (fruit, rim bale, or hazard) immediately zeroes spin: `spin = 0.0`.

---

## 4. Shot Lifecycle & Settlement Detection

A shot passes through an explicit state machine:

```text
PLANNING ──(Touch Launcher)──► AIMING
   ▲                              │ (Release >= minPull)
   │                              ▼
   │                          LAUNCHED
   │                              │
   │                              ▼
   │                      CHAIN_RESOLVING (Clashes & Fusions)
   │                              │
   │                              ▼
   └──(All Stable)────────── SETTLING (Velocities < 22 px/s for 0.35s)
```

### Settlement Conditions:
1. No pending merge clash locks (`clashId === null` for all fruits).
2. All in-ring fruit linear speeds \(\|\mathbf{v}\| < 22\text{ px/s}\).
3. Condition holds continuously for \(\ge 0.35\text{ seconds}\), OR fail-safe timeout of \(6.0\text{ s}\) elapses.
4. If a timeout occurs, ongoing motion is dampened to rest; pending fusions complete before returning to `PLANNING`.

---

## 5. Prioritized Gyōji (Sumo Referee) Event Director

The referee reacts strictly to committed events emitted by `EventRouter`. It never alters gameplay logic.

### 5.1 Priority Hierarchy

| Priority Level | Rank | Trigger Event | Callout (Romaji / Kanji) | Audio Behavior |
|---|---|---|---|---|
| **MATCH_RESULT** | 100 | Bout Victory, Rival Knockout, Game Over | *Shōbu Ari!* (勝負あり) | Cancels all active voice lines immediately |
| **YOKOZUNA** | 90 | Tier 11 Pineapple Coronation | *Yokozuna Shinjin!* (横綱昇進) | Taiko roll + Grand chime flourish |
| **RIVAL_DEFEAT** | 80 | Career Rival pushed out of ring | *Kinboshi!* (金星) | Hyōshigi double strike + brass cry |
| **PERSONAL_BEST**| 70 | High score shattered | *Saikō Tokuten!* (最高得点) | Confetti burst + Taiko fanfare |
| **KIMARITE** | 60 | Validated sumo technique awarded | *Oshidashi!* (押し出し) etc. | Voice callout with technique stamp |
| **EDGE_DANGER** | 40 | Fruit teeters in outer 8% danger zone | *Nokotta! Nokotta!* (残った!) | Short warning chant (cooldown: 4.0s per episode) |
| **TACHIAI** | 20 | Fruit launched from slingshot | *Hakkeyoi!* (発気揚々) | Crisp launch shout |

### 5.2 Concurrency & Cooldown Rules
- Maximum **1** active voice line at any moment. Higher-priority cues interrupt lower-priority ones.
- Edge struggle (*Nokotta!*) is gated by a 4.0-second cooldown per fruit to prevent stutters.
- Restart immediately invalidates and mutes the queue.

---

## 6. Arena Condition Systems & Daily Basho

### 6.1 Condition 1: Grippy Clay (*Nure-Dohyō*)
- **Description:** Sacred wet clay arena floor increases rolling friction.
- **Physics Rule:** Surface damping increased by \(\Delta\gamma = +0.85\text{ s}^{-1}\).
- **Invariants:** Fruit mass, restitution, and merge radii remain strictly unaltered.
- **Prediction:** Trajectory predictor incorporates \(\gamma_{\text{total}} = \gamma_{\text{tier}} + \Delta\gamma\), displaying accurate shorter travel.

### 6.2 Condition 2: Kamikaze Breeze (*Shinto Wind*)
- **Description:** Gusts sweep across the shrine courtyard, gently nudging lighter wrestlers.
- **Physics Rule:** Continuous wind acceleration \(\mathbf{a}_{\text{wind}} = (\mathbf{F}_{\text{wind}} / m)\), clamped at maximum \(35\text{ px/s}^2\).
- **Scheduling:** Wind vector is scheduled at shot start and remains immutable during aiming and flight.
- **Prediction:** Swept trajectory arc reflects the current wind vector.

### 6.3 Condition 3: Closing Ring (*Sudden Death Basho*)
- **Description:** Every 5 shots, the legal ring boundary contracts inward by 3%.
- **Physical Safety:** Physical outer straw bales remain solid; an inner glowing legal ring marks the active boundary.
- **Grace Period:** Fruit caught outside due to contraction receive a 2.0-second recovery timer. If pushed back inside, they survive; otherwise, eliminated.
- **Capacity:** Standard overflow area game-over is disabled in Closing Ring mode; ring survival is paramount.

### 6.4 Daily Basho Architecture
- Deterministic seed based on UTC date: `Hash(YYYY-MM-DD)`.
- Pre-seeded fruit queue, predetermined rival, and locked arena condition.
- Separate high-score and completion ledger (`sumo_basho_history`).
- Offline play supported via local pseudo-random sequence.

---

## 7. Local 2-Player Pass-and-Play (Tachiai Duel)

### 7.1 Ownership Rules
Every fruit on the board holds an `owner` attribute:
```ts
type FruitOwner = 'PLAYER_ONE' | 'PLAYER_TWO' | 'NEUTRAL';
```

- **Fusion Constraint:** Two fruits can ONLY merge if:
  1. `tier_A === tier_B`
  2. `owner_A === owner_B`
- If Player 1's fruit collides with Player 2's fruit of the same tier, they **clash elastically** as opposing combatants; they never merge.
- If Player 1 pushes Player 2's fruit into another Player 2 fruit of the same tier, causing a fusion, Player 2 is credited with the merge score.

### 7.2 Turn Lifecycle & Handover
1. Player 1 aims and fires.
2. Shot resolves completely (`SETTLING` verified).
3. Terminal losses evaluated (each ring-out docks 1 life from the fruit's owner).
4. Simulation pauses safely.
5. "Player 2 — Ready" transition barrier displays.
6. Optional view inversion (180° rotation for tabletop play opposite each other).
7. Player 2 presses Ready to resume play.

---

## 8. Kimarite Technique Recognition Ledger

Committed events are evaluated against the official Ozumo winning techniques:

```ts
export interface KimariteDefinition {
  id: string;
  nameJp: string;
  nameRomaji: string;
  title: string;
  category: 'FUSION' | 'TRICK_SHOT' | 'DEFENSE' | 'MASTERY';
  criteria: (event: EvaluatedShotEvent) => boolean;
}
```

### Initial Canonical Techniques:
1. **Oshidashi (押し出し - Frontal Push-Out):** A launched fruit pushes an opponent/hazard out of the ring without rebounding off a bale first.
2. **Hikiotoshi (引き落とし - Rebound Bank Fusion):** Fruit fusions occurring immediately after a high-angle rim bale bank shot.
3. **Gyaku-Kaiten (逆回転 - English Curve Hook):** A fusion achieved using active left/right curve spin around an obstacle.
4. **Tsuppari Ren-da (突っ張り連打 - Thrusting Combo):** Triggering 3 or more fusions in a single shot cascade.
5. **Utchari (うっちゃり - Backward Pivot Rescue):** Fruit enters danger zone (>90% rim radius) with outwards velocity, rebounds off a bale, and safely recovers.
6. **Yorikiri (寄り切り - Grapple Drive-Out):** Maintaining sustained body contact (>0.25s) with an opponent fruit while pushing them past the Tawara.
7. **Kinboshi (金星 - Gold Star Upset):** Eliminating the highest-tier Career Rival fruit using a fruit of at least 3 tiers lower.
8. **Pineapple Coronation (横綱昇進 - Grand Champion):** Merging two Watermelons to crown Tier 11 Yokozuna Pineapple.

---

## 9. Visual-Only Replay Recorder Architecture

To deliver celebration highlights without corrupting authoritative state:
- **Ring Buffer:** Stores the last 6.0 seconds of sampled state at 20 Hz.
- **Sampled Payload:** Entity IDs, screen coordinates `(x, y)`, rotation `angle`, visual squish/stretch parameters, and active ribbons.
- **Decoupled Playback Scene:** Replays are rendered with lightweight `ReplayActor` visual sprites.
- **Strict Sandbox:** Replay nodes contain **no physics colliders, no collision listeners, and no dispatchers to GameEngine score or lives**.

---

## 10. Verification & Test Matrix

| ID | Test Scenario | Expected Outcome |
|---|---|---|
| **TC-01** | Straight Slingshot Drag | `launcherSpin === 0.0`. Trajectory is straight line; lateral drag changes angle only. |
| **TC-02** | Deliberate Curve Toggle | Selecting `CURVE_LEFT` applies \(\Delta\theta < 0\). Predictor and physics trajectory match with <3px delta. |
| **TC-03** | First Contact Spin Clearance | Upon collision with any body or bale, `fruit.spin` immediately drops to `0.0`. |
| **TC-04** | Duel Cross-Owner Fusion Rejection | Player 1 Cherry and Player 2 Cherry collide at high speed: elastically bounce, 0 merges occur. |
| **TC-05** | Referee Voice Interruption | High-priority result (*Shōbu Ari!*) instantly overrides low-priority tachiai voice line. |
| **TC-06** | Grippy Clay Drag Verification | Fruits on Nure-Dohyō stop within 60% of normal distance; mass and merge rules remain identical. |
| **TC-07** | Replay Isolation Test | Triggering a 5-second replay 10 times results in exactly 0 additional score or life deductions. |
| **TC-08** | App Backgrounding & Resume | Minimizing browser during drag cancels drag safely without launching fruit or draining lives. |

---

## 11. Implementation Roadmap & Execution Order

1. **Phase A (Foundations & Spin Gating):** Add `SpinSelector` UI, lock default `spin = 0.0`, implement shared `TrajectoryPredictor` and touch modifiers.
2. **Phase B (Referee Queue & Audio Director):** Synthesize authentic Gyōji chants with priority queue and visual calligraphy ribbons.
3. **Phase C (Arena Conditions & Daily Basho):** Implement Grippy Clay, Kamikaze Breeze, and Closing Ring with UTC daily seed generator.
4. **Phase D (Local 2-Player Tachiai Duel):** Add `FruitOwner` layer, turn handover modal, and paired queue mechanics.
5. **Phase E (Kimarite Ledger & Replay Highlights):** Wire causal event detector and visual highlight reel.
6. **Phase F (Verification & iOS/Web Polish):** Execute test matrix, calibrate haptics, and confirm 60fps performance on mobile Safari & Chrome.
