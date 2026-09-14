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
  Sliders,
  Sparkles,
  Compass,
  Trophy,
  Settings,
} from 'lucide-react';
import { GameStats } from '../game/GameEngine';
import { FRUIT_CATALOG, GameModeType, SpinMode } from '../types/game';
import { VersusHUD } from './VersusHUD';
import { CONDITION_METADATA } from '../game/ArenaConditionManager';

interface HUDProps {
  stats: GameStats;
  onRestart: () => void;
  onTogglePause: () => void;
  onOpenTierList: () => void;
  onOpenTuner: () => void;
  onOpenKimarite: () => void;
  onOpenSettings: () => void;
  onThrowSalt: () => void;
  onCycleArenaMode: () => void;
  onSelectGameMode?: (mode: GameModeType, challengeId?: string) => void;
  onSelectSpinMode?: (mode: SpinMode) => void;
  onToggleTabletop?: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  stats,
  onRestart,
  onTogglePause,
  onOpenTierList,
  onOpenTuner,
  onOpenKimarite,
  onOpenSettings,
  onThrowSalt,
  onCycleArenaMode,
  onSelectGameMode,
  onSelectSpinMode,
  onToggleTabletop,
  soundEnabled,
  onToggleSound,
}) => {
  const next1 = FRUIT_CATALOG[stats.nextTiers[0] - 1];
  const next2 = FRUIT_CATALOG[stats.nextTiers[1] - 1];

  const isOverflowWarning = stats.isOverflowing;
  const isFever = stats.isFever;
  const isVersus = stats.gameMode === 'VERSUS';

  return (
    <header className="absolute inset-x-0 top-0 pointer-events-none pt-[max(env(safe-area-inset-top,0px),44px)] sm:pt-4 px-2 sm:px-4 flex flex-col gap-1.5 sm:gap-2 z-20">
      {/* Top Bar: Primary Stats, Hype / Fever, and Combat Salt + Settings */}
      <div className="flex items-center justify-between gap-1.5 sm:gap-3 w-full">
        {!isVersus ? (
          /* Score, High Score & Lives Box */
          <div className="flex items-center gap-2 sm:gap-3 bg-[#1C1814]/90 backdrop-blur-md border border-[#3E342B] px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl shadow-lg pointer-events-auto shrink-0">
            <div>
              <div className="flex items-center gap-1">
                <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-[#A89886]">
                  Score
                </span>
                {stats.highScore > 0 && (
                  <span className="text-[8px] sm:text-[9px] font-mono text-[#D4AF37] opacity-80 flex items-center gap-0.5">
                    <Trophy size={9} className="text-[#FFD700]" />
                    {stats.highScore.toLocaleString()}
                  </span>
                )}
              </div>
              <div className="text-base sm:text-2xl font-black tracking-tight text-[#FFD700] flex items-center gap-1.5">
                <span>{stats.score.toLocaleString()}</span>
                {stats.isNewHighScore && stats.score > 0 && (
                  <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider bg-[#FFD700] text-black px-1 py-0.2 rounded font-mono shadow-sm animate-pulse">
                    NEW
                  </span>
                )}
              </div>
            </div>

            <div className="h-6 sm:h-7 w-px bg-[#3E342B]" />

            {/* Lives (3 Wrestlers) */}
            <div>
              <div className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-[#A89886]">
                Rikishi
              </div>
              <div className="flex items-center gap-0.5 sm:gap-1 mt-0.5">
                {[0, 1, 2].map((idx) => {
                  const active = idx < stats.lives;
                  return (
                    <Heart
                      key={idx}
                      size={14}
                      className={`transition-all duration-300 sm:w-4 sm:h-4 ${
                        active
                          ? 'text-[#E74C3C] fill-[#E74C3C] drop-shadow-[0_0_6px_rgba(231,76,60,0.6)]'
                          : 'text-[#4A3D31] fill-transparent'
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-[#1C1814]/90 backdrop-blur-md border border-[#E74C3C]/60 px-3 py-1.5 rounded-xl shadow-lg pointer-events-auto shrink-0">
            <span className="text-base">🥋</span>
            <div>
              <div className="text-[9px] font-black uppercase tracking-wider text-[#E74C3C]">
                2P Local Showdown
              </div>
              <div className="text-xs font-black text-white">East (P1) vs West (P2)</div>
            </div>
          </div>
        )}

        {/* Center: Crowd Hype & Fever Meter (Solo Mode only) */}
        {!isVersus ? (
          <div className="flex items-center gap-1.5 sm:gap-2 bg-[#1C1814]/90 backdrop-blur-md border border-[#3E342B] px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-xl shadow-lg pointer-events-auto shrink-0">
            {stats.festivalReadyShots > 0 ? (
              <div className="flex items-center gap-1.5 sm:gap-2 animate-pulse text-[#FFD700]">
                <Sparkles size={16} className="text-[#FFD700] animate-spin sm:w-[18px] sm:h-[18px]" />
                <div className="flex flex-col">
                  <span className="text-[9px] sm:text-[10px] uppercase font-black tracking-widest text-[#FFD700]">
                    ⚡ FESTIVAL 2X ⚡
                  </span>
                  <span className="text-[10px] sm:text-xs font-mono font-bold text-white">
                    {stats.festivalReadyShots} shot{stats.festivalReadyShots > 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            ) : isFever ? (
              <div className="flex items-center gap-1.5 sm:gap-2 animate-pulse text-[#FFD700]">
                <Flame size={16} className="text-[#E74C3C] animate-bounce sm:w-[18px] sm:h-[18px]" />
                <div className="flex flex-col">
                  <span className="text-[9px] sm:text-[10px] uppercase font-black tracking-widest text-[#FFD700]">
                    ⚡ FEVER 2X ⚡
                  </span>
                  <span className="text-[10px] sm:text-xs font-mono font-bold text-white">
                    {stats.feverTimer.toFixed(1)}s
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1 w-20 sm:w-32">
                <div className="flex justify-between items-center text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">
                  <span className="text-[#A89886] flex items-center gap-1">
                    <Flame size={11} className="text-[#E67E22]" /> Hype
                  </span>
                  <span className="text-[#F1C40F] font-mono">{Math.round(stats.crowdHype)}%</span>
                </div>
                <div className="w-full h-1.5 sm:h-2 bg-[#2D241C] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#F39C12] to-[#E74C3C] transition-all duration-200 rounded-full"
                    style={{ width: `${Math.min(100, stats.crowdHype)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Right: Salt Button + Settings / Desktop Menu */}
        <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto shrink-0">
          {/* Salt Throw Button (Solo Mode) */}
          {!isVersus && (
            <button
              id="hud-salt-btn"
              onClick={onThrowSalt}
              disabled={stats.saltCharges <= 0}
              title={
                stats.saltCharges > 0
                  ? 'Throw Kiyome-no-Shio Salt [S] (Brakes fruits & purifies hazards)'
                  : `Kiyome-no-Shio Recharging (${stats.saltLaunchCount}/6 shots or ring-out knockout)`
              }
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer border ${
                stats.saltCharges > 0
                  ? 'bg-[#1F2937] hover:bg-[#374151] text-white border-[#4B5563]'
                  : 'bg-[#181512] text-[#6B7280] border-[#2C241C] cursor-not-allowed opacity-75'
              }`}
            >
              <Sparkles size={14} className={stats.saltCharges > 0 ? 'text-[#60A5FA]' : 'text-gray-500'} />
              <span className="inline text-[11px] sm:text-xs">Salt</span>
              <span className="text-[10px] font-mono font-black bg-[#111827] px-1 py-0.5 rounded text-[#93C5FD]">
                {stats.saltCharges > 0 ? stats.saltCharges : `${stats.saltLaunchCount}/6`}
              </span>
            </button>
          )}

          {/* Desktop-only action items in top row */}
          <div className="hidden sm:flex items-center gap-1.5">
            {/* Game Mode Selector */}
            {onSelectGameMode && (
              <button
                id="hud-game-mode-btn"
                onClick={() => {
                  const modes: GameModeType[] = ['CLASSIC', 'VERSUS', 'CAREER', 'CHALLENGE', 'DAILY'];
                  const nextIdx = (modes.indexOf(stats.gameMode) + 1) % modes.length;
                  const nextMode = modes[nextIdx];
                  onSelectGameMode(nextMode, nextMode === 'CHALLENGE' ? 'BROKEN_TAWARA' : undefined);
                }}
                title={`Game Mode: ${stats.gameMode}. Click to switch between Classic, Versus, Career, Challenges, and Daily Basho.`}
                className={`flex items-center gap-1 border px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold shadow-md transition-all active:scale-95 cursor-pointer ${
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
              </button>
            )}

            {/* Arena Mode Toggle */}
            <button
              id="hud-arena-mode-btn"
              onClick={onCycleArenaMode}
              title="Toggle Dohyō Arena Mode (Circular, Elliptical, Wobble)"
              className="flex items-center gap-1 bg-[#1C1814]/90 hover:bg-[#2D241C] text-[#E0D4C5] border border-[#3E342B] px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Compass size={14} className="text-[#3498DB]" />
              <span className="text-[10px] uppercase font-bold text-white">
                {stats.arenaMode}
              </span>
            </button>

            {/* Kimarite Techniques Collection Button */}
            <button
              id="hud-kimarite-btn"
              onClick={onOpenKimarite}
              title="Kimarite Techniques Collection (Winning Sumo Throws & Combos)"
              className="flex items-center gap-1.5 bg-[#1C1814]/90 hover:bg-[#2D241C] text-[#FFD700] border border-[#5A4535] px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <span className="text-sm">🥋</span>
              <span className="text-[10px] uppercase font-bold tracking-wider">
                {stats.unlockedKimariteCount ?? 0}/{stats.totalKimariteCount ?? 8}
              </span>
            </button>

            {/* Roster Catalog */}
            <button
              id="hud-tier-btn"
              onClick={onOpenTierList}
              title="11 Fruit Tiers Catalog"
              className="p-1.5 sm:p-2 bg-[#1C1814]/90 hover:bg-[#2D241C] text-[#E0D4C5] border border-[#3E342B] rounded-lg shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <BookOpen size={16} />
            </button>

            {/* Sound Toggle */}
            <button
              id="hud-sound-btn"
              onClick={onToggleSound}
              title={soundEnabled ? 'Mute Audio' : 'Unmute Audio'}
              className="p-1.5 sm:p-2 bg-[#1C1814]/90 hover:bg-[#2D241C] text-[#E0D4C5] border border-[#3E342B] rounded-lg shadow-md transition-all active:scale-95 cursor-pointer"
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} className="text-[#E74C3C]" />}
            </button>

            {/* Pause Toggle */}
            <button
              id="hud-pause-btn"
              onClick={onTogglePause}
              title={stats.isPaused ? 'Resume' : 'Pause'}
              className="p-1.5 sm:p-2 bg-[#1C1814]/90 hover:bg-[#2D241C] text-[#E0D4C5] border border-[#3E342B] rounded-lg shadow-md transition-all active:scale-95 cursor-pointer"
            >
              {stats.isPaused ? <Play size={16} /> : <Pause size={16} />}
            </button>

            {/* Restart */}
            <button
              id="hud-restart-btn"
              onClick={onRestart}
              title="Restart Match"
              className="p-1.5 sm:p-2 bg-[#1C1814]/90 hover:bg-[#2D241C] text-[#E0D4C5] border border-[#3E342B] rounded-lg shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <RotateCcw size={16} />
            </button>
          </div>

          {/* Dedicated Settings Button (Always visible on mobile, also available on desktop) */}
          <button
            id="hud-settings-btn"
            onClick={onOpenSettings}
            title="Settings & Match Menu"
            className="p-1.5 sm:p-2 bg-[#1C1814]/90 hover:bg-[#2D241C] text-[#E0D4C5] hover:text-[#FFD700] border border-[#5A4535] rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
          >
            <Settings size={18} className="transition-transform duration-300 hover:rotate-45" />
          </button>
        </div>
      </div>

      {/* Row 2: Either 2P Versus HUD OR Solo Next Fruit Queue & Sidespin */}
      {isVersus ? (
        <VersusHUD
          stats={stats}
          onSelectSpinMode={onSelectSpinMode || (() => {})}
          onThrowSalt={onThrowSalt}
          onRestartVersus={onRestart}
          onToggleTabletop={onToggleTabletop}
        />
      ) : (
        <div className="flex items-center justify-between gap-1.5 sm:gap-2 w-full">
          {/* Upcoming Wrestlers Queue */}
          <div className="flex items-center gap-1.5 bg-[#1C1814]/90 backdrop-blur-md border border-[#3E342B] px-2.5 sm:px-3 py-1 rounded-xl shadow-lg pointer-events-auto shrink-0">
            <div className="text-[9px] sm:text-[10px] uppercase font-bold text-[#A89886] tracking-wider">
              Next:
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Next 1 */}
              <div
                className="flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 rounded-lg border border-[#44382E]"
                style={{ backgroundColor: `${next1.color}25` }}
              >
                <div
                  className="w-3.5 h-3.5 rounded-full border border-black/50 shadow-sm flex items-center justify-center text-[8px] font-black text-white"
                  style={{ backgroundColor: next1.color }}
                >
                  {next1.tier}
                </div>
                <span className="text-[11px] sm:text-xs font-bold text-[#EDE2D4]">
                  T{next1.tier} {next1.name}
                </span>
              </div>

              {/* Next 2 */}
              <div
                className="flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 rounded-lg border border-[#44382E] opacity-80"
                style={{ backgroundColor: `${next2.color}20` }}
              >
                <div
                  className="w-3 h-3 rounded-full border border-black/50 shadow-sm flex items-center justify-center text-[7px] font-black text-white"
                  style={{ backgroundColor: next2.color }}
                >
                  {next2.tier}
                </div>
                <span className="text-[10px] sm:text-[11px] font-medium text-[#D1C3B2]">
                  T{next2.tier} {next2.name}
                </span>
              </div>
            </div>
          </div>

          {/* Right side of Row 2: English Sidespin curve control + Career Bout Tag or Combo Banner */}
          <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
            {/* Spin Bias Selector (English Curve: Left, Straight, Right) */}
            {onSelectSpinMode && (
              <div
                id="hud-spin-mode-selector"
                className="flex items-center bg-[#1C1814]/90 backdrop-blur-md border border-[#3E342B] p-0.5 rounded-xl shadow-lg"
              >
                <button
                  id="hud-spin-left-btn"
                  type="button"
                  onClick={() => onSelectSpinMode(stats.selectedSpinMode === 'LEFT' ? 'STRAIGHT' : 'LEFT')}
                  title="Left English Curve (Counter-Clockwise Magnus Spin). Shortcut: [Q] or drag right"
                  className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer flex items-center gap-0.5 ${
                    stats.selectedSpinMode === 'LEFT'
                      ? 'bg-[#E74C3C] text-white shadow-sm ring-1 ring-[#FF7675]'
                      : 'text-[#A89886] hover:text-white hover:bg-[#2D241C]'
                  }`}
                >
                  <span>↺</span>
                  <span className="hidden xs:inline">Left</span>
                </button>

                <button
                  id="hud-spin-straight-btn"
                  type="button"
                  onClick={() => onSelectSpinMode('STRAIGHT')}
                  title="Direct Straight Shot (No side English bias). Shortcut: [W]"
                  className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer flex items-center gap-0.5 ${
                    stats.selectedSpinMode === 'STRAIGHT'
                      ? 'bg-[#2ECC71] text-white shadow-sm ring-1 ring-[#58D68D]'
                      : 'text-[#A89886] hover:text-white hover:bg-[#2D241C]'
                  }`}
                >
                  <span>↑</span>
                  <span className="hidden xs:inline">Direct</span>
                </button>

                <button
                  id="hud-spin-right-btn"
                  type="button"
                  onClick={() => onSelectSpinMode(stats.selectedSpinMode === 'RIGHT' ? 'STRAIGHT' : 'RIGHT')}
                  title="Right English Curve (Clockwise Magnus Spin). Shortcut: [E] or drag left"
                  className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer flex items-center gap-0.5 ${
                    stats.selectedSpinMode === 'RIGHT'
                      ? 'bg-[#3498DB] text-white shadow-sm ring-1 ring-[#5DADE2]'
                      : 'text-[#A89886] hover:text-white hover:bg-[#2D241C]'
                  }`}
                >
                  <span className="hidden xs:inline">Right</span>
                  <span>↻</span>
                </button>
              </div>
            )}

            {/* Daily Basho Badge */}
            {stats.gameMode === 'DAILY' && stats.dailyBasho && (
              <div className="flex items-center gap-1.5 bg-[#1C1814]/90 backdrop-blur-md border border-[#10B981] px-2.5 py-1 rounded-xl shadow-lg">
                <span className="text-xs">📅</span>
                <span className="text-[10px] font-black text-[#10B981] tracking-wider">
                  Day #{stats.dailyBasho.dayNumber}
                </span>
              </div>
            )}

            {/* Arena Condition Pill (if condition active) */}
            {stats.arenaCondition && stats.arenaCondition.type !== 'NONE' && (
              <div className="flex items-center gap-1.5 bg-[#1C1814]/90 backdrop-blur-md border border-[#E67E22] px-2.5 py-1 rounded-xl shadow-lg">
                <span className="text-xs">{CONDITION_METADATA[stats.arenaCondition.type].icon}</span>
                <span className="text-[10px] font-black text-[#FFD700] tracking-wider">
                  {CONDITION_METADATA[stats.arenaCondition.type].nameJp}
                </span>
              </div>
            )}

            {/* Career Stage & Rival Banner (if Career Mode) */}
            {stats.gameMode === 'CAREER' && stats.currentRivalProfile && (
              <div className="flex items-center gap-1.5 sm:gap-2 bg-[#1C1814]/90 backdrop-blur-md border border-[#E67E22] px-2.5 py-1 rounded-xl shadow-lg">
                <div
                  className="w-2.5 h-2.5 rounded-full border border-black/40 shadow-sm shrink-0"
                  style={{ backgroundColor: stats.currentRivalProfile.color }}
                />
                <span className="text-[10px] font-black text-[#F39C12] tracking-wider">
                  Bout {stats.careerStageIndex + 1}/{stats.careerStageCount}
                </span>
              </div>
            )}

            {/* Combo Streak Multiplier */}
            {stats.comboCount >= 2 && (
              <div className="flex items-center gap-1.5 bg-[#E67E22] text-white px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full font-black text-[11px] sm:text-xs shadow-lg animate-bounce border border-white/40">
                <Flame size={13} className="text-[#FFD700]" />
                <span>
                  {stats.comboCount}x COMBO! ({stats.comboMultiplier.toFixed(1)}x)
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Overflow Alarm Banner (when bowl capacity exceeded & protruding) */}
      {!isVersus && isOverflowWarning && (
        <div className="self-center flex items-center gap-2.5 bg-[#E74C3C] text-white px-4 py-1.5 rounded-full font-bold text-xs sm:text-sm shadow-xl animate-pulse pointer-events-auto border-2 border-white mt-1">
          <AlertTriangle size={18} />
          <span>
            CAPACITY OVERFLOW! Warning: {Math.max(0, 2.0 - stats.overflowTimer).toFixed(1)}s
          </span>
        </div>
      )}
    </header>
  );
};
