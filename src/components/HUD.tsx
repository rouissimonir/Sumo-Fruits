import React from 'react';
import {
  Volume2,
  VolumeX,
  RotateCcw,
  BookOpen,
  Pause,
  Play,
  Heart,
  AlertTriangle,
  Flame,
  Sparkles,
  Compass,
  Trophy,
  Settings,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GameStats } from '../game/GameEngine';
import { FRUIT_CATALOG, GameModeType } from '../types/game';
import { VersusHUD } from './VersusHUD';
import { CONDITION_METADATA } from '../game/ArenaConditionManager';
import { SKILL_DEFINITIONS, SkillType } from '../types/skills';

interface HUDProps {
  stats: GameStats;
  onRestart: () => void;
  onTogglePause: () => void;
  onOpenTierList: () => void;
  onOpenKimarite: () => void;
  onOpenSettings: () => void;
  onThrowSalt: () => void;
  onTriggerSkill?: () => void;
  onEquipSkill?: (skill: SkillType) => void;
  onCycleSkill?: () => void;
  onCycleArenaMode: () => void;
  onSelectGameMode?: (mode: GameModeType, challengeId?: string) => void;
  onToggleTabletop?: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  stats,
  onRestart,
  onTogglePause,
  onOpenTierList,
  onOpenKimarite,
  onOpenSettings,
  onThrowSalt,
  onTriggerSkill,
  onEquipSkill,
  onCycleSkill,
  onCycleArenaMode,
  onSelectGameMode,
  onToggleTabletop,
  soundEnabled,
  onToggleSound,
}) => {
  const next1 = FRUIT_CATALOG[stats.nextTiers[0] - 1];
  const next2 = FRUIT_CATALOG[stats.nextTiers[1] - 1];

  const isOverflowWarning = stats.isOverflowing;
  const isFever = stats.isFever;
  const isVersus = stats.gameMode === 'VERSUS';

  const skillState = stats.skillState;
  const currentSkill = skillState?.equipped ?? 'SALT';
  const currentDef = SKILL_DEFINITIONS[currentSkill] ?? SKILL_DEFINITIONS.SALT;
  const isArmed = skillState?.isArmed ?? false;
  const hasCharge = skillState ? skillState.charge > 0 : stats.saltCharges > 0;
  const rechargeProgress = skillState ? skillState.rechargeProgress : stats.saltLaunchCount;
  const unlockedSkills = skillState?.unlockedSkills ?? ['SALT'];

  if (isVersus) {
    return (
      <header className="absolute inset-x-0 top-0 min-w-0 pointer-events-none pt-[max(env(safe-area-inset-top,0px),8px)] sm:pt-3 px-1.5 sm:px-4 z-20">
        <VersusHUD
          stats={stats}
          onThrowSalt={onThrowSalt}
          onToggleTabletop={onToggleTabletop}
          onOpenSettings={onOpenSettings}
          soundEnabled={soundEnabled}
          onToggleSound={onToggleSound}
          onRestart={onRestart}
        />
      </header>
    );
  }

  return (
    <header className="absolute inset-x-0 top-0 min-w-0 pointer-events-none pt-[max(env(safe-area-inset-top,0px),44px)] sm:pt-4 px-1.5 sm:px-4 flex flex-col gap-1.5 sm:gap-2 z-20">
      {/* Top Bar: Primary Stats, Hype / Fever, and Combat Salt + Settings */}
      <div className="flex min-w-0 items-center gap-1.5 sm:gap-3 w-full">
        {/* Score, High Score & Lives Box */}
        <div className="flex min-w-0 flex-1 sm:flex-none items-center justify-between gap-1.5 sm:gap-3 bg-[#1C1814]/90 backdrop-blur-md border border-[#3E342B] px-2 py-1.5 sm:px-3.5 sm:py-2 rounded-xl shadow-lg pointer-events-auto">
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-[8px] sm:text-[10px] uppercase font-bold tracking-wide sm:tracking-wider text-[#A89886]">
                  Score
                </span>
                {stats.highScore > 0 && (
                  <span className="text-[8px] sm:text-[9px] font-mono text-[#D4AF37] opacity-80 flex items-center gap-0.5 truncate">
                    <Trophy size={9} className="text-[#FFD700]" />
                    {stats.highScore.toLocaleString()}
                  </span>
                )}
              </div>
              <div className="text-lg sm:text-2xl font-black leading-none tracking-tight text-[#FFD700] flex items-center gap-1">
                <motion.span
                  key={stats.score}
                  initial={{ scale: 1.18 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 450, damping: 20 }}
                  className="truncate inline-block"
                >
                  {stats.score.toLocaleString()}
                </motion.span>
                {stats.isNewHighScore && stats.score > 0 && (
                  <motion.span
                    initial={{ scale: 0.8 }}
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                    className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider bg-[#FFD700] text-black px-1 py-0.2 rounded font-mono shadow-sm"
                  >
                    NEW
                  </motion.span>
                )}
              </div>
            </div>

            <div className="h-6 sm:h-7 w-px bg-[#3E342B] shrink-0" />

            {/* Lives (3 Wrestlers) */}
            <div className="shrink-0">
              <div className="hidden sm:block text-[10px] uppercase font-bold tracking-wider text-[#A89886]">
                Rikishi
              </div>
              <div className="flex items-center gap-0 sm:gap-1 sm:mt-0.5" aria-label={`${stats.lives} rikishi remaining`}>
                {[0, 1, 2].map((idx) => {
                  const active = idx < stats.lives;
                  return (
                    <motion.div
                      key={idx}
                      animate={active ? { scale: [1, 1.15, 1] } : { scale: 0.85, opacity: 0.4 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Heart
                        size={12}
                        className={`transition-colors duration-300 sm:w-4 sm:h-4 ${
                          active
                            ? 'text-[#E74C3C] fill-[#E74C3C] drop-shadow-[0_0_6px_rgba(231,76,60,0.6)]'
                            : 'text-[#4A3D31] fill-transparent'
                        }`}
                      />
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>

        {/* Center: Crowd Hype & Fever Meter (Solo Mode) */}
        <div className="flex h-10 w-[76px] sm:h-auto sm:w-auto items-center justify-center overflow-hidden bg-[#1C1814]/90 backdrop-blur-md border border-[#3E342B] px-2 py-1.5 sm:px-4 sm:py-2 rounded-xl shadow-lg pointer-events-auto shrink-0">
            {stats.festivalReadyShots > 0 ? (
              <div className="flex items-center gap-1 sm:gap-2 animate-pulse text-[#FFD700]">
                <Sparkles size={13} className="text-[#FFD700] animate-spin sm:w-[18px] sm:h-[18px]" />
                <div className="flex flex-col">
                  <span className="text-[9px] sm:text-[10px] uppercase font-black tracking-widest text-[#FFD700]">
                    <span className="sm:hidden">2X</span><span className="hidden sm:inline">⚡ FESTIVAL 2X ⚡</span>
                  </span>
                  <span className="text-[10px] sm:text-xs font-mono font-bold text-white">
                    {stats.festivalReadyShots} shot{stats.festivalReadyShots > 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            ) : isFever ? (
              <div className="flex items-center gap-1 sm:gap-2 animate-pulse text-[#FFD700]">
                <Flame size={13} className="text-[#E74C3C] animate-bounce sm:w-[18px] sm:h-[18px]" />
                <div className="flex flex-col">
                  <span className="text-[9px] sm:text-[10px] uppercase font-black tracking-widest text-[#FFD700]">
                    <span className="sm:hidden">2X</span><span className="hidden sm:inline">⚡ FEVER 2X ⚡</span>
                  </span>
                  <span className="text-[10px] sm:text-xs font-mono font-bold text-white">
                    {stats.feverTimer.toFixed(1)}s
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1 w-full sm:w-32">
                <div className="flex justify-between items-center text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">
                  <span className="text-[#A89886] flex items-center gap-1">
                    <Flame size={11} className="text-[#E67E22]" />
                    {stats.comboCount >= 2 ? `${stats.comboCount} Chain` : 'Hype'}
                  </span>
                  <span className="text-[#F1C40F] font-mono">
                    {stats.comboCount >= 2
                      ? `×${stats.comboMultiplier.toFixed(1)}`
                      : `${Math.round(stats.crowdHype)}%`}
                  </span>
                </div>
                <div className="w-full h-1.5 sm:h-2 bg-[#2D241C] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-[#F39C12] to-[#E74C3C] rounded-full"
                    initial={false}
                    animate={{ width: `${Math.min(100, stats.crowdHype)}%` }}
                    transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                  />
                </div>
              </div>
            )}
          </div>

        {/* Right: Shared Skill Slot + Settings / Desktop Menu */}
        <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto shrink-0">
          {/* Shared Skill Slot (Solo Mode) */}
          {!isVersus && (
            <div className="flex items-center gap-1 bg-[#14120E]/90 border border-[#2D241C] p-1 rounded-xl shadow-md">
              {/* Skill Switcher (if more than 1 unlocked) */}
              {unlockedSkills.length > 1 && (
                <div className="flex items-center gap-0.5">
                  {unlockedSkills.map((sk) => {
                    const def = SKILL_DEFINITIONS[sk];
                    const isSelected = sk === currentSkill;
                    return (
                      <motion.button
                        key={sk}
                        id={`hud-skill-select-${sk.toLowerCase()}`}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => onEquipSkill?.(sk)}
                        title={`Switch to ${def.name}: ${def.description}`}
                        className={`h-7 px-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#E67E22] text-white shadow'
                            : 'bg-[#1F1B16] text-[#A89886] hover:text-white hover:bg-[#2A231C]'
                        }`}
                      >
                        <span>{def.icon}</span>
                      </motion.button>
                    );
                  })}
                </div>
              )}

              {/* Main Skill Action Button */}
              <motion.button
                id="hud-skill-btn"
                whileTap={{ scale: 0.94 }}
                whileHover={{ scale: 1.02 }}
                onClick={() => {
                  if (currentSkill === 'SALT') {
                    onThrowSalt();
                  } else {
                    onTriggerSkill ? onTriggerSkill() : onThrowSalt();
                  }
                }}
                disabled={!hasCharge && !isArmed}
                title={
                  currentSkill === 'SALT' && stats.isSaltTargeting
                    ? 'Salt Targeting Active: Click on Dohyō to cast, click here or press [S] to confirm, or press [Esc] to cancel'
                    : hasCharge
                    ? currentSkill === 'SALT'
                      ? 'Throw Kiyome-no-Shio Salt [S] (Brakes fruits & purifies hazards)'
                      : `${currentDef.name} [Space]: ${currentDef.description} (Click to ${isArmed ? 'disarm' : 'arm next launch'})`
                    : `${currentDef.name} Recharging (${rechargeProgress}/6 shots or ring-out knockout)`
                }
                className={`flex h-8 sm:h-auto items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 sm:py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                  currentSkill === 'SALT' && stats.isSaltTargeting
                    ? 'bg-[#1E3A8A] text-white border-[#60A5FA] ring-2 ring-[#93C5FD] shadow-lg animate-pulse'
                    : isArmed
                    ? 'bg-[#E67E22] text-white border-[#F39C12] animate-pulse shadow-lg'
                    : hasCharge
                    ? 'bg-[#1F2937] hover:bg-[#374151] text-white border-[#4B5563]'
                    : 'bg-[#181512] text-[#6B7280] border-[#2C241C] cursor-not-allowed opacity-75'
                }`}
              >
                <span>{currentDef.icon}</span>
                <span className="hidden sm:inline text-xs">{currentDef.name}</span>
                {currentSkill === 'SALT' && stats.isSaltTargeting ? (
                  <span className="text-[10px] font-mono font-black bg-[#2563EB] px-1 py-0.5 rounded text-white animate-pulse">
                    AIMING [S]
                  </span>
                ) : isArmed ? (
                  <span className="text-[10px] font-mono font-black bg-[#935116] px-1 py-0.5 rounded text-white">
                    ARMED
                  </span>
                ) : (
                  <span className="text-[10px] font-mono font-black bg-[#111827] px-1 py-0.5 rounded text-[#93C5FD]">
                    {hasCharge ? 'READY' : `${rechargeProgress}/6`}
                  </span>
                )}
              </motion.button>
            </div>
          )}

          {/* Desktop-only action items in top row */}
          <div className="hidden sm:flex items-center gap-1.5">
            {/* Game Mode Selector */}
            {onSelectGameMode && (
              <motion.button
                id="hud-game-mode-btn"
                whileTap={{ scale: 0.94 }}
                onClick={() => {
                  const modes: GameModeType[] = ['CLASSIC', 'VERSUS', 'CAREER', 'CHALLENGE', 'DAILY'];
                  const nextIdx = (modes.indexOf(stats.gameMode) + 1) % modes.length;
                  const nextMode = modes[nextIdx];
                  onSelectGameMode(nextMode, nextMode === 'CHALLENGE' ? 'BROKEN_TAWARA' : undefined);
                }}
                title={`Game Mode: ${stats.gameMode}. Click to switch between Classic, Versus, Career, Challenges, and Daily Basho.`}
                className={`flex items-center gap-1 border px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold shadow-md transition-all cursor-pointer ${
                  stats.gameMode === 'VERSUS'
                    ? 'bg-[#E74C3C]/30 hover:bg-[#E74C3C]/50 text-[#FF9988] border-[#E74C3C]'
                    : stats.gameMode === 'CAREER'
                    ? 'bg-[#B7791F]/30 hover:bg-[#B7791F]/50 text-[#FFD700] border-[#B7791F]'
                    : stats.gameMode === 'CHALLENGE'
                    ? 'bg-[#9B59B6]/30 hover:bg-[#9B59B6]/50 text-[#D2B4DE] border-[#9B59B6]'
                    : stats.gameMode === 'DAILY'
                    ? 'bg-[#2980B9]/30 hover:bg-[#2980B9]/50 text-[#AED6F1] border-[#2980B9]'
                    : 'bg-[#1C1814]/90 hover:bg-[#2D241C] text-[#E0D4C5] border-[#3E342B]'
                }`}
              >
                <Trophy size={14} className={stats.gameMode === 'VERSUS' ? 'text-[#E74C3C]' : stats.gameMode === 'CAREER' ? 'text-[#FFD700]' : stats.gameMode === 'CHALLENGE' ? 'text-[#AF7AC5]' : 'text-[#A89886]'} />
                <span className="text-[10px] uppercase font-bold">
                  {stats.gameMode === 'VERSUS' ? '2P Versus' : stats.gameMode === 'CAREER' ? `Banzuke ${stats.careerStageIndex + 1}/${stats.careerStageCount}` : stats.gameMode === 'CHALLENGE' ? 'Challenge' : stats.gameMode === 'DAILY' ? 'Daily Basho' : 'Classic'}
                </span>
              </motion.button>
            )}

            {/* Arena Mode Toggle */}
            <motion.button
              id="hud-arena-mode-btn"
              whileTap={{ scale: 0.94 }}
              onClick={onCycleArenaMode}
              title="Toggle Dohyō Arena Mode (Circular, Elliptical, Wobble)"
              className="flex items-center gap-1 bg-[#1C1814]/90 hover:bg-[#2D241C] text-[#E0D4C5] border border-[#3E342B] px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold shadow-md transition-all cursor-pointer"
            >
              <Compass size={14} className="text-[#3498DB]" />
              <span className="text-[10px] uppercase font-bold text-white">
                {stats.arenaMode}
              </span>
            </motion.button>

            {/* Kimarite Techniques Collection Button */}
            <motion.button
              id="hud-kimarite-btn"
              whileTap={{ scale: 0.94 }}
              onClick={onOpenKimarite}
              title="Kimarite Techniques Collection (Winning Sumo Throws & Combos)"
              className="flex items-center gap-1.5 bg-[#1C1814]/90 hover:bg-[#2D241C] text-[#FFD700] border border-[#5A4535] px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold shadow-md transition-all cursor-pointer"
            >
              <span className="text-sm">🥋</span>
              <span className="text-[10px] uppercase font-bold tracking-wider">
                {stats.unlockedKimariteCount ?? 0}/{stats.totalKimariteCount ?? 8}
              </span>
            </motion.button>

            {/* Roster Catalog */}
            <motion.button
              id="hud-tier-btn"
              whileTap={{ scale: 0.94 }}
              onClick={onOpenTierList}
              title="11 Fruit Tiers Catalog"
              className="p-1.5 sm:p-2 bg-[#1C1814]/90 hover:bg-[#2D241C] text-[#E0D4C5] border border-[#3E342B] rounded-lg shadow-md transition-all cursor-pointer"
            >
              <BookOpen size={16} />
            </motion.button>

            {/* Sound Toggle */}
            <motion.button
              id="hud-sound-btn"
              whileTap={{ scale: 0.94 }}
              onClick={onToggleSound}
              title={soundEnabled ? 'Mute Audio' : 'Unmute Audio'}
              className="p-1.5 sm:p-2 bg-[#1C1814]/90 hover:bg-[#2D241C] text-[#E0D4C5] border border-[#3E342B] rounded-lg shadow-md transition-all cursor-pointer"
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} className="text-[#E74C3C]" />}
            </motion.button>

            {/* Pause Toggle */}
            <motion.button
              id="hud-pause-btn"
              whileTap={{ scale: 0.94 }}
              onClick={onTogglePause}
              title={stats.isPaused ? 'Resume' : 'Pause'}
              className="p-1.5 sm:p-2 bg-[#1C1814]/90 hover:bg-[#2D241C] text-[#E0D4C5] border border-[#3E342B] rounded-lg shadow-md transition-all cursor-pointer"
            >
              {stats.isPaused ? <Play size={16} /> : <Pause size={16} />}
            </motion.button>

            {/* Restart */}
            <motion.button
              id="hud-restart-btn"
              whileTap={{ scale: 0.94 }}
              onClick={onRestart}
              title="Restart Match"
              className="p-1.5 sm:p-2 bg-[#1C1814]/90 hover:bg-[#2D241C] text-[#E0D4C5] border border-[#3E342B] rounded-lg shadow-md transition-all cursor-pointer"
            >
              <RotateCcw size={16} />
            </motion.button>
          </div>

          {/* Dedicated Settings Button (Always visible on mobile, also available on desktop) */}
          <motion.button
            id="hud-settings-btn"
            whileTap={{ scale: 0.92 }}
            whileHover={{ scale: 1.05 }}
            onClick={onOpenSettings}
            title="Settings & Match Menu"
            className="h-10 w-10 sm:h-auto sm:w-auto p-0 sm:p-2 bg-[#1C1814]/90 hover:bg-[#2D241C] text-[#E0D4C5] hover:text-[#FFD700] border border-[#5A4535] rounded-xl shadow-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"
          >
            <Settings size={18} className="transition-transform duration-300 hover:rotate-45" />
          </motion.button>
        </div>
      </div>

      {/* Row 2: Solo upcoming-fruit queue */}
      <div className="flex min-w-0 items-center gap-1.5 sm:gap-2 w-full">
        {/* Upcoming Wrestlers Queue */}
        <div className="flex min-w-0 flex-1 items-center gap-1.5 bg-[#1C1814]/90 backdrop-blur-md border border-[#3E342B] px-1.5 sm:px-3 py-1 rounded-xl shadow-lg pointer-events-auto">
          <div className="hidden min-[360px]:block text-[9px] sm:text-[10px] uppercase font-bold text-[#A89886] tracking-wider shrink-0">
            Next:
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
            {/* Next 1 */}
            <div
              className="flex min-w-0 flex-1 items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 rounded-lg border border-[#44382E]"
              style={{ backgroundColor: `${next1.color}25` }}
            >
              <div
                className="w-3.5 h-3.5 rounded-full border border-black/50 shadow-sm flex items-center justify-center text-[8px] font-black text-white"
                style={{ backgroundColor: next1.color }}
              >
                {next1.tier}
              </div>
              <span className="truncate text-[10px] sm:text-xs font-bold text-[#EDE2D4]">
                {next1.name}
              </span>
            </div>

            {/* Next 2 */}
            <div
              className="flex shrink-0 items-center gap-1 sm:gap-1.5 px-1 sm:px-2 py-0.5 rounded-lg border border-[#44382E] opacity-80"
              style={{ backgroundColor: `${next2.color}20` }}
            >
              <div
                className="w-3 h-3 rounded-full border border-black/50 shadow-sm flex items-center justify-center text-[7px] font-black text-white"
                style={{ backgroundColor: next2.color }}
              >
                {next2.tier}
              </div>
              <span className="hidden sm:inline text-[11px] font-medium text-[#D1C3B2]">
                {next2.name}
              </span>
            </div>
          </div>
        </div>

        {/* Context badges; advanced controls live in Settings on compact screens. */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 pointer-events-auto">
          {/* Daily Basho Badge */}
          {stats.gameMode === 'DAILY' && stats.dailyBasho && (
            <div className="hidden sm:flex items-center gap-1.5 bg-[#1C1814]/90 backdrop-blur-md border border-[#10B981] px-2.5 py-1 rounded-xl shadow-lg">
              <span className="text-xs">📅</span>
              <span className="text-[10px] font-black text-[#10B981] tracking-wider">
                Day #{stats.dailyBasho.dayNumber}
              </span>
            </div>
          )}

          {/* Arena Condition Pill (if condition active) */}
          {stats.arenaCondition && stats.arenaCondition.type !== 'NONE' && (
            <div className="hidden sm:flex items-center gap-1.5 bg-[#1C1814]/90 backdrop-blur-md border border-[#E67E22] px-2.5 py-1 rounded-xl shadow-lg">
              <span className="text-xs">{CONDITION_METADATA[stats.arenaCondition.type].icon}</span>
              <span className="text-[10px] font-black text-[#FFD700] tracking-wider">
                {CONDITION_METADATA[stats.arenaCondition.type].nameJp}
              </span>
            </div>
          )}

          {/* Career Stage & Rival Banner (if Career Mode) */}
          {stats.gameMode === 'CAREER' && stats.currentRivalProfile && (
            <div className="hidden sm:flex items-center gap-1.5 sm:gap-2 bg-[#1C1814]/90 backdrop-blur-md border border-[#E67E22] px-2.5 py-1 rounded-xl shadow-lg">
              <div
                className="w-2.5 h-2.5 rounded-full border border-black/40 shadow-sm shrink-0"
                style={{ backgroundColor: stats.currentRivalProfile.color }}
              />
              <span className="text-[10px] font-black text-[#F39C12] tracking-wider">
                Bout {stats.careerStageIndex + 1}/{stats.careerStageCount}
              </span>
            </div>
          )}
        </div>
      </div>

      {stats.gameMode === 'CAREER' && stats.campaign.activeLevelId && !stats.campaign.result && (
        <div className="pointer-events-auto flex w-full items-center gap-2 rounded-xl border border-[#D4AF37]/70 bg-[#1C1814]/95 px-2.5 py-1.5 shadow-lg">
          <div className="min-w-0 flex-1">
            <div className="truncate text-[9px] font-black uppercase tracking-wider text-[#E67E22]">
              Bout {stats.campaign.activeLevelIndex + 1} · {stats.campaign.title}
            </div>
            <div className="truncate text-[11px] font-bold text-white">{stats.campaign.objectiveText}</div>
          </div>
          <div className="shrink-0 text-right font-mono text-[10px] font-black text-[#FFD700]">
            <div>{stats.campaign.progress}/{stats.campaign.target}</div>
            <div className="text-[9px] text-[#B9A996]">SHOT {stats.campaign.shotsUsed}/{stats.campaign.shotLimit}</div>
          </div>
        </div>
      )}

      {/* Overflow Alarm Banner (when bowl capacity exceeded & protruding) */}
      <AnimatePresence>
        {isOverflowWarning && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: [1, 1.04, 1] }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="self-center flex items-center gap-2.5 bg-[#E74C3C] text-white px-4 py-1.5 rounded-full font-bold text-xs sm:text-sm shadow-xl pointer-events-auto border-2 border-white mt-1"
          >
            <AlertTriangle size={18} className="animate-bounce" />
            <span>
              CAPACITY OVERFLOW! Warning: {Math.max(0, 2.0 - stats.overflowTimer).toFixed(1)}s
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
