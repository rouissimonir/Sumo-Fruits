/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { GameEngine, GameStats } from './game/GameEngine';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { TierListModal } from './components/TierListModal';
import { GodotExporterModal } from './components/GodotExporterModal';
import { ParameterTuner } from './components/ParameterTuner';
import { GameOverModal } from './components/GameOverModal';
import { KimariteModal } from './components/KimariteModal';
import { SettingsModal } from './components/SettingsModal';
import { sound } from './audio/soundEffects';
import { HelpCircle, Sparkles } from 'lucide-react';
import { ArenaMode, GameModeType, SpinMode } from './types/game';

export default function App() {
  const engine = useMemo(() => new GameEngine(), []);

  const [stats, setStats] = useState<GameStats>({
    score: 0,
    lives: 3,
    occupancy: 0,
    overflowTimer: 0,
    isOverflowing: false,
    isPaused: false,
    isGameOver: false,
    gameOverReason: '',
    nextTiers: [1, 2],
    currentLoadedTier: 1,
    highestTierReached: 1,
    arenaMode: 'CIRCULAR',
    gameMode: 'CLASSIC',
    saltCharges: 1,
    maxSaltCharges: 1,
    saltLaunchCount: 0,
    isSaltTargeting: false,
    comboCount: 0,
    comboMultiplier: 1,
    crowdHype: 0,
    isFever: false,
    feverTimer: 0,
    festivalReadyShots: 0,
    activeRefereeCall: null,
    activeRibbons: [],
    strawBales: [],
    tuning: {
      slopeK: 0.55,
      escapeSpeed: 220,
      rimDamping: 0.65,
      clashDuration: 0.5,
      shockwaveImpulse: 380,
      restitution: 0.78,
    },
    careerStageIndex: 0,
    careerStageCount: 5,
    currentRivalProfile: null,
    hasActiveRival: false,
    rivalIntent: null,
    activeChallengeId: null,
    launcherSpin: 0,
    selectedSpinMode: 'STRAIGHT',
    unlockedKimariteCount: 0,
    totalKimariteCount: 8,
  });

  const [isTierListOpen, setIsTierListOpen] = useState(false);
  const [isGodotModalOpen, setIsGodotModalOpen] = useState(false);
  const [isTunerOpen, setIsTunerOpen] = useState(false);
  const [isKimariteOpen, setIsKimariteOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showTutorial, setShowTutorial] = useState(true);

  useEffect(() => {
    engine.onStatsChange = (newStats) => {
      setStats({ ...newStats });
    };

    return () => {
      engine.onStatsChange = null;
    };
  }, [engine]);

  const handleRestart = useCallback(() => {
    engine.restart();
  }, [engine]);

  const handleTogglePause = useCallback(() => {
    engine.togglePause();
  }, [engine]);

  const handleToggleSound = useCallback(() => {
    const enabled = sound.toggleMute();
    setSoundEnabled(enabled);
  }, []);

  const handleThrowSalt = useCallback(() => {
    engine.throwSalt();
  }, [engine]);

  const handleCycleArenaMode = useCallback(() => {
    const modes: ArenaMode[] = ['CIRCULAR', 'ELLIPTICAL', 'WOBBLE'];
    const currIdx = modes.indexOf(stats.arenaMode);
    const nextMode = modes[(currIdx + 1) % modes.length];
    engine.setArenaMode(nextMode);
  }, [engine, stats.arenaMode]);

  const handleSelectGameMode = useCallback((mode: GameModeType, challengeId?: string) => {
    engine.setGameMode(mode, challengeId);
  }, [engine]);

  const handleSelectSpinMode = useCallback((mode: SpinMode) => {
    engine.setSpinMode(mode);
  }, [engine]);

  // Keyboard controls for rapid gameplay (S = Salt throw, Space = Pause, Q/W/E = Curve Spin)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 's' || e.key === 'S') {
        engine.throwSalt();
      } else if (e.key === 'p' || e.key === 'P') {
        engine.togglePause();
      } else if (e.key === 'r' || e.key === 'R') {
        if (e.ctrlKey || e.metaKey) return;
        engine.restart();
      } else if (e.key === 'q' || e.key === 'Q') {
        engine.setSpinMode(engine.selectedSpinMode === 'LEFT' ? 'STRAIGHT' : 'LEFT');
      } else if (e.key === 'w' || e.key === 'W') {
        engine.setSpinMode('STRAIGHT');
      } else if (e.key === 'e' || e.key === 'E') {
        engine.setSpinMode(engine.selectedSpinMode === 'RIGHT' ? 'STRAIGHT' : 'RIGHT');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [engine]);

  return (
    <main
      id="sumo-fruits-app"
      className="relative w-screen h-screen overflow-hidden bg-[#14120E] font-sans select-none"
    >
      {/* HUD Layer */}
      <HUD
        stats={stats}
        onRestart={handleRestart}
        onTogglePause={handleTogglePause}
        onOpenTierList={() => setIsTierListOpen(true)}
        onOpenGodotFiles={() => setIsGodotModalOpen(true)}
        onOpenTuner={() => setIsTunerOpen(true)}
        onOpenKimarite={() => setIsKimariteOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onThrowSalt={handleThrowSalt}
        onCycleArenaMode={handleCycleArenaMode}
        onSelectGameMode={handleSelectGameMode}
        onSelectSpinMode={handleSelectSpinMode}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
      />

      {/* Main Physics Game Canvas */}
      <GameCanvas engine={engine} />

      {/* Floating Opening Instruction Banner */}
      {showTutorial && (
        <aside
          id="tutorial-tip"
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-[#1C1814]/95 text-[#EDE2D4] border border-[#3E342B] px-4 py-2 rounded-full shadow-2xl text-xs max-w-[92vw] sm:max-w-lg pointer-events-auto"
        >
          <Sparkles size={16} className="text-[#FFD700] shrink-0" />
          <span className="truncate">
            Pull & slingshot fruits. Match weights to fuse! Press <b>[S]</b> for Kiyome-no-Shio salt.
          </span>
          <button
            onClick={() => setShowTutorial(false)}
            className="text-[10px] uppercase font-bold text-[#A89886] hover:text-white ml-2 shrink-0 cursor-pointer"
          >
            Got it
          </button>
        </aside>
      )}

      {/* Modals */}
      <TierListModal
        isOpen={isTierListOpen}
        onClose={() => setIsTierListOpen(false)}
        highestTierReached={stats.highestTierReached}
      />

      <GodotExporterModal
        isOpen={isGodotModalOpen}
        onClose={() => setIsGodotModalOpen(false)}
      />

      <ParameterTuner
        isOpen={isTunerOpen}
        onClose={() => setIsTunerOpen(false)}
        engine={engine}
        currentMode={stats.arenaMode}
        tuning={stats.tuning}
      />

      <KimariteModal
        isOpen={isKimariteOpen}
        onClose={() => setIsKimariteOpen(false)}
        kimariteManager={engine.kimariteManager}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        stats={stats}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        onTogglePause={handleTogglePause}
        onRestart={handleRestart}
        onSelectGameMode={handleSelectGameMode}
        onSelectArenaMode={(mode) => engine.setArenaMode(mode)}
        onSelectSpinMode={handleSelectSpinMode}
        onOpenTierList={() => setIsTierListOpen(true)}
        onOpenKimarite={() => setIsKimariteOpen(true)}
        onOpenTuner={() => setIsTunerOpen(true)}
        onOpenGodotFiles={() => setIsGodotModalOpen(true)}
      />

      <GameOverModal
        isOpen={stats.isGameOver}
        score={stats.score}
        highScore={stats.highScore}
        isNewHighScore={stats.isNewHighScore}
        reason={stats.gameOverReason}
        highestTierReached={stats.highestTierReached}
        onRestart={handleRestart}
      />
    </main>
  );
}
