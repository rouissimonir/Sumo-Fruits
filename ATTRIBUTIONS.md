# Sumo Fruits: The Bumper Bowl — Asset Ownership & Commercial Licensing Confirmation

This document confirms the ownership, commercial licenses, and origin of all media, audio, visual, and code assets utilized in **Sumo Fruits: The Bumper Bowl**.

---

### 1. 🎵 Referee Voices, Sound Effects & Music
* **Source & Origin**: 100% bespoke procedural audio synthesis built directly into `src/audio/soundEffects.ts`.
* **Technology**: Real-time Web Audio API (`AudioContext`, `OscillatorNode`, `BiquadFilterNode`, `GainNode`, `AudioBufferSourceNode` procedural white/pink noise generation).
* **Components**:
  * **Taiko Drums (太鼓)**: Procedurally synthesized dual-frequency sine sweep + bandpass filtered punch transient.
  * **Hyoshigi Wooden Clappers (拍子木)**: Procedural high-frequency triangle transient pairs (1760Hz / 2240Hz).
  * **Gyōji Referee Voice Calls (行司音声)**: Procedural multi-formant vowel resonant filter synthesis (*"Hakkeyoi!"*, *"Nokotta!"*, *"Shobu Ari!"*, *"Kinboshi!"*, *"Tawara Breached!"*).
  * **Sumo Clashes, Bumps & Merges (ぶつかり合体)**: Procedural pitch-scaled harmonic oscillator clusters.
* **Licensing**: 100% original bespoke code authored for this game. No third-party proprietary voice samples or copyrighted music recordings are included.
* **Commercial Status**: Fully cleared for commercial deployment and global App Store distribution.

---

### 2. 🔤 Typography, Calligraphy & Fonts
* **Japanese Kanji Calligraphy**: Native system Japanese typography stacks (`-apple-system`, `Hiragino Sans`, `Hiragino Kaku Gothic ProN`, `Noto Sans JP`, `Yu Gothic`, `sans-serif`) coupled with procedural HTML5 Canvas path rendering for Japanese brush calligraphy badges (`立合い`, `残った`, `金星`, `押し出し`, `俵割れ`).
* **Latin Display & Body Fonts**: Modern system sans-serif hierarchy with high contrast and WCAG AA compliance.
* **Licensing**: Standard platform system fonts. No external paid or proprietary font licensing required.

---

### 3. 🎨 Art, Sprites & Visual Graphics
* **Source & Origin**: 100% procedurally drawn vector canvas geometry (`src/components/GameCanvas.tsx`).
* **Visual Elements**:
  * Rikishi fruit bodies, procedural eyes, dynamic squash/stretch deformation, and tracking pupil angles.
  * Sacred Dohyō clay ring, sand grains, and woven straw bales (Tawara).
  * Mawashi loincloth ropes and procedural Verlet-physics tassels.
  * Kiyome-no-shio salt crystals, flame bursts, water splashes, and victory confetti.
* **Licensing**: 100% bespoke code authored for this project.

---

### 4. 📦 Dependencies & Privacy Declaration
* **Dependencies**: Standard open-source frameworks (React, Vite, Tailwind CSS, Lucide React, and Capacitor). Each dependency retains its own license.
* **Data Transmission**: 100% offline-first arcade simulation.
* **Privacy & Telemetry**: Zero external tracking, zero ad networks, zero analytics SDKs, and zero telemetry. All player data (scores, daily basho, unlocked kimarite, career ranks, settings) persists strictly inside local client storage.
