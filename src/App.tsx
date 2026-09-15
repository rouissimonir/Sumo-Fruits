/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { GameEngine, GameStats } from './game/GameEngine';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { TierListModal } from './components/TierListModal';
import { GameOverModal } from './components/GameOverModal';
import { KimariteModal } from './components/KimariteModal';
import { SettingsModal } from './components/SettingsModal';
import { TutorialModal } from './components/TutorialModal';
import { LegalCreditsModal } from './components/LegalCreditsModal';
import { VersusVictoryModal } from './components/VersusVictoryModal';
import { VersusHandoverModal } from './components/VersusHandoverModal';
import { CampaignMap } from './components/campaign/CampaignMap';
import { CampaignResultModal } from './components/campaign/CampaignResultModal';
import { CAMPAIGN_LEVELS } from './content/campaign';
import { sound } from './audio/soundEffects';
import { haptics } from './audio/haptics';
import { App as CapacitorApp } from '@capacitor/app';
import { HelpCircle, Sparkles } from 'lucide-react';
import { ArenaMode, GameModeType } from './types/game';
import { DEFAULT_SETTINGS, GameSettings, loadGameSettings, saveGameSettings } from './types/settings';

export default function App() {
  const engine = useMemo(() => new GameEngine(), []);

  // Persistent Settings
  const [settings, setSettings] = useState<GameSettings>(() => loadGameSettings());

  const [stats, setStats] = useState<GameStats>({
    score: 0,
    highScore: 0,
    isNewHighScore: false,
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
      baleMaxHealth: 3,
    },
    careerStageIndex: 0,
    careerStageCount: 4,
    currentRivalProfile: null,
    hasActiveRival: false,
    rivalIntent: null,
    activeChallengeId: null,
    unlockedKimariteCount: 0,
    totalKimariteCount: 8,
    versus: null,
    arenaCondition: {
      type: 'NONE',
      nameJp: '清浄土俵',
      nameRomaji: 'Standard Clay',
      description: 'Traditional sun-dried sacred clay surface.',
      badgeColor: '#A0522D',
      extraDamping: 0,
      windForceX: 0,
      windForceY: 0,
      windSpeed: 0,
      windAngle: 0,
      legalRadiusRatio: 1,
      legalRadius: 340,
      shotsUntilShrink: 5,
      shrinkCount: 0,
      outOfBoundsTimers: {},
    },
    dailyBasho: null,
    campaign: engine.careerManager.getSnapshot(),
  });

  const [isTierListOpen, setIsTierListOpen] = useState(false);
  const [isKimariteOpen, setIsKimariteOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreditsOpen, setIsCreditsOpen] = useState(false);
  const [isCampaignMapOpen, setIsCampaignMapOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(() => {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    return !localStorage.getItem('sumo_tutorial_completed_v1');
  });
  const [showBottomTip, setShowBottomTip] = useState(true);

  // Sync settings with audio and haptics managers
  useEffect(() => {
    sound.setVolume(settings.sfxVolume);
    sound.setEnabled(!settings.sfxMuted);
    haptics.setEnabled(settings.hapticsEnabled);
    engine.reducedMotion = settings.reducedMotion;
    engine.showTrajectoryGuide = settings.showTrajectoryGuide;
    saveGameSettings(settings);
  }, [engine, settings]);

  useEffect(() => {
    const handleBackground = () => {
      engine.cancelDrag();
      sound.suspend();
      if (!engine.isGameOver && !engine.isPaused) {
        engine.pause();
      }
    };

    const handleForeground = () => {
      if (!settings.sfxMuted) {
        sound.resume();
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        handleBackground();
      } else {
        handleForeground();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', handleBackground);
    window.addEventListener('blur', handleBackground);
    window.addEventListener('focus', handleForeground);

    let capacitorListener: Promise<{ remove: () => Promise<void> }> | null = null;
    try {
      capacitorListener = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        if (!isActive) {
          handleBackground();
        } else {
          handleForeground();
        }
      });
    } catch {
      // Running in standard browser
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', handleBackground);
      window.removeEventListener('blur', handleBackground);
      window.removeEventListener('focus', handleForeground);
      if (capacitorListener) {
        void capacitorListener.then((handle) => handle?.remove?.());
      }
    };
  }, [engine, settings.sfxMuted]);

  const updateSettings = useCallback((partial: Partial<GameSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      saveGameSettings(next);
      return next;
    });
  }, []);

  const handleTutorialComplete = useCallback(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('sumo_tutorial_completed_v1', 'true');
    }
    setIsTutorialOpen(false);
  }, []);

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
    updateSettings({ sfxMuted: !settings.sfxMuted });
  }, [settings.sfxMuted, updateSettings]);

  const handleThrowSalt = useCallback(() => {
    if (engine.isSaltTargeting) {
      engine.throwSalt();
    } else {
      engine.enterSaltTargeting();
    }
  }, [engine]);

  const handleCycleArenaMode = useCallback(() => {
    const modes: ArenaMode[] = ['CIRCULAR', 'ELLIPTICAL', 'WOBBLE'];
    const currIdx = modes.indexOf(stats.arenaMode);
    const nextMode = modes[(currIdx + 1) % modes.length];
    engine.setArenaMode(nextMode);
  }, [engine, stats.arenaMode]);

  const handleSelectGameMode = useCallback((mode: GameModeType, challengeId?: string) => {
    if (mode === 'CAREER') {
      setIsCampaignMapOpen(true);
      return;
    }
    engine.setGameMode(mode, challengeId);
  }, [engine]);

  const handleStartCareerLevel = useCallback((levelId: string) => {
    engine.startCareerLevel(levelId);
    setIsCampaignMapOpen(false);
    setIsSettingsOpen(false);
    setShowBottomTip(false);
  }, [engine]);

  // Keyboard controls for rapid desktop testing.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 's' || e.key === 'S') {
        if (engine.isSaltTargeting) {
          engine.throwSalt();
        } else {
          engine.enterSaltTargeting();
        }
      } else if (e.key === 'Escape') {
        if (engine.isSaltTargeting) {
          engine.cancelSaltTargeting();
        }
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        engine.triggerActiveSkill();
      } else if (e.key === '1') {
        engine.equipSkill('SALT');
      } else if (e.key === '2') {
        engine.equipSkill('PALM_STRIKE');
      } else if (e.key === '3') {
        engine.equipSkill('TAIKO_PULSE');
      } else if (e.key === 'p' || e.key === 'P') {
        engine.togglePause();
      } else if (e.key === 'r' || e.key === 'R') {
        if (e.ctrlKey || e.metaKey) return;
        engine.restart();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [engine]);

  return (
    <main
      id="sumo-fruits-app"
      className={`relative w-full h-dvh overflow-hidden bg-[#14120E] font-sans select-none ${
        settings.highContrast ? 'contrast-125 saturate-125' : ''
      }`}
    >
      {/* HUD Layer */}
      <HUD
        stats={stats}
        onRestart={handleRestart}
        onTogglePause={handleTogglePause}
        onOpenTierList={() => setIsTierListOpen(true)}
        onOpenKimarite={() => setIsKimariteOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onThrowSalt={handleThrowSalt}
        onTriggerSkill={() => engine.triggerActiveSkill()}
        onEquipSkill={(sk) => engine.equipSkill(sk)}
        onCycleSkill={() => engine.cycleEquippedSkill()}
        onCycleArenaMode={handleCycleArenaMode}
        onSelectGameMode={handleSelectGameMode}
        onToggleTabletop={() => engine.toggleVersusTabletopInversion()}
        soundEnabled={!settings.sfxMuted}
        onToggleSound={handleToggleSound}
      />

      {/* Main Physics Game Canvas */}
      <GameCanvas engine={engine} />

      {/* Floating Opening Instruction Banner */}
      {showBottomTip && (
        <aside
          id="tutorial-tip"
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-[#1C1814]/95 text-[#EDE2D4] border border-[#3E342B] px-4 py-2 rounded-full shadow-2xl text-xs max-w-[92vw] sm:max-w-lg pointer-events-auto pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]"
        >
          <Sparkles size={16} className="text-[#FFD700] shrink-0" />
          <span className="truncate">
            Pull & slingshot fruits. Match weights to fuse! Tap <b>[S]</b> for Kiyome-no-Shio salt.
          </span>
          <button
            onClick={() => setIsTutorialOpen(true)}
            className="text-[10px] uppercase font-bold text-[#FFD700] hover:underline ml-1 shrink-0 cursor-pointer"
          >
            Guide
          </button>
          <button
            onClick={() => setShowBottomTip(false)}
            className="text-[10px] uppercase font-bold text-[#A89886] hover:text-white ml-2 shrink-0 cursor-pointer"
          >
            ✕
          </button>
        </aside>
      )}

      {/* First-Run Interactive Tutorial Modal */}
      <TutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        onComplete={handleTutorialComplete}
        language={settings.language}
      />

      {/* Ownership & Commercial Legal Credits Modal */}
      <LegalCreditsModal
        isOpen={isCreditsOpen}
        onClose={() => setIsCreditsOpen(false)}
        language={settings.language}
      />

      {/* Modals */}
      <TierListModal
        isOpen={isTierListOpen}
        onClose={() => setIsTierListOpen(false)}
        highestTierReached={stats.highestTierReached}
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
        settings={settings}
        onUpdateSettings={updateSettings}
        onTogglePause={handleTogglePause}
        onRestart={handleRestart}
        onSelectGameMode={handleSelectGameMode}
        onSelectArenaMode={(mode) => engine.setArenaMode(mode)}
        onSelectArenaCondition={(cond) => engine.setArenaCondition(cond)}
        onOpenTierList={() => setIsTierListOpen(true)}
        onOpenKimarite={() => setIsKimariteOpen(true)}
        onOpenTutorial={() => setIsTutorialOpen(true)}
        onOpenCredits={() => setIsCreditsOpen(true)}
        onToggleVersusPassAndPlay={() => engine.toggleVersusPassAndPlay()}
      />

      <GameOverModal
        isOpen={stats.isGameOver && stats.gameMode !== 'VERSUS' && stats.gameMode !== 'CAREER'}
        score={stats.score}
        highScore={stats.highScore}
        isNewHighScore={stats.isNewHighScore}
        reason={stats.gameOverReason}
        highestTierReached={stats.highestTierReached}
        onRestart={handleRestart}
      />

      <CampaignMap
        isOpen={isCampaignMapOpen}
        campaign={stats.campaign}
        onClose={() => setIsCampaignMapOpen(false)}
        onStart={handleStartCareerLevel}
        onEquipReward={(rewardId) => engine.equipCampaignReward(rewardId)}
      />

      {stats.gameMode === 'CAREER' && (
        <CampaignResultModal
          campaign={stats.campaign}
          score={stats.score}
          onRetry={() => engine.restart()}
          onNext={() => {
            const next = CAMPAIGN_LEVELS[stats.campaign.activeLevelIndex + 1];
            if (next) handleStartCareerLevel(next.id);
          }}
          onEquipAndNext={(rewardId) => {
            engine.equipCampaignReward(rewardId);
            const next = CAMPAIGN_LEVELS[stats.campaign.activeLevelIndex + 1];
            if (next) handleStartCareerLevel(next.id);
          }}
          onMap={() => {
            engine.dismissCareerResult();
            setIsCampaignMapOpen(true);
          }}
        />
      )}

      {/* Versus Handover Transition Barrier */}
      {stats.versus && (
        <VersusHandoverModal
          stats={stats}
          onConfirmReady={() => engine.confirmVersusHandoverReady()}
          onToggleTabletop={() => engine.toggleVersusTabletopInversion()}
          onTogglePassAndPlay={() => engine.toggleVersusPassAndPlay()}
        />
      )}

      {/* Versus Victory Emperor Cup Screen */}
      {stats.versus && (
        <VersusVictoryModal
          versus={stats.versus}
          onRematch={handleRestart}
          onReturnToClassic={() => handleSelectGameMode('CLASSIC')}
        />
      )}
    </main>
  );
}
