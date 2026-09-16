import React from 'react';
import { RotateCw, Volume2, VolumeX, Settings, RotateCcw, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { GameStats } from '../game/GameEngine';
import { FRUIT_CATALOG } from '../types/game';

interface VersusHUDProps {
  stats: GameStats;
  onThrowSalt: () => void;
  onToggleTabletop?: () => void;
  onOpenSettings?: () => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  onRestart?: () => void;
}

export const VersusHUD: React.FC<VersusHUDProps> = ({
  stats,
  onThrowSalt,
  onToggleTabletop,
  onOpenSettings,
  soundEnabled = true,
  onToggleSound,
  onRestart,
}) => {
  const versus = stats.versus;
  if (!versus) return null;

  const {
    playerTurn,
    p1Score,
    p2Score,
    p1RoundsWon,
    p2RoundsWon,
    currentBout,
    maxRounds,
    p1SaltCharges,
    p2SaltCharges,
    p1SaltLaunchCount,
    p2SaltLaunchCount,
    p1NextTiers,
    p2NextTiers,
    tugOfWarMassP1,
    tugOfWarMassP2,
    tabletopInversion,
  } = versus;

  const combinedMass = tugOfWarMassP1 + tugOfWarMassP2;
  const p1Ratio = combinedMass <= 0 ? 50 : Math.round((tugOfWarMassP1 / combinedMass) * 100);
  const p2Ratio = 100 - p1Ratio;
  const neededWins = Math.ceil(maxRounds / 2);

  const isP1Turn = playerTurn === 1;
  const isP2Turn = playerTurn === 2;

  const renderStars = (wins: number, color: string) => (
    <div className="flex items-center gap-0.5" title={`${wins} of ${neededWins} bout victories`}>
      {Array.from({ length: neededWins }).map((_, index) => (
        <span
          key={index}
          className={`text-xs sm:text-sm font-black transition-colors ${
            index < wins ? 'text-[#FFD700] drop-shadow-[0_0_6px_rgba(255,215,0,0.8)]' : 'text-[#3E3025]'
          }`}
          aria-hidden="true"
        >
          ★
        </span>
      ))}
    </div>
  );

  return (
    <section
      className="w-full max-w-4xl mx-auto pointer-events-auto select-none font-sans"
      aria-label="Two-Player Local Sumo Showdown"
    >
      <div className="min-w-0 overflow-hidden bg-[#14100D]/95 border border-[#443325] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.7)] backdrop-blur-md p-1.5 sm:p-2.5 transition-all">
        {/* Mobile: status row above two equal player cards. Desktop: one 3-column row. */}
        <div className="grid min-w-0 grid-cols-2 items-stretch gap-1.5 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center sm:gap-3">
          {/* ================= PLAYER 1 (EAST 東) ================= */}
          <motion.div
            animate={isP1Turn ? { scale: [1, 1.01, 1] } : { scale: 1 }}
            transition={{ duration: 0.3 }}
            className={`relative order-2 min-w-0 rounded-xl p-2 transition-all duration-300 sm:order-1 sm:p-2.5 ${
              isP1Turn
                ? 'bg-gradient-to-r from-[#381411] to-[#201210] border-2 border-[#E74C3C] shadow-[0_0_18px_rgba(231,76,60,0.35)]'
                : 'bg-[#181310]/70 border border-[#302118] opacity-75'
            }`}
          >
            {/* Header: Identity & Turn Badge */}
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <div
                  className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-black text-white shrink-0 ${
                    isP1Turn ? 'bg-[#E74C3C] shadow-[0_0_8px_rgba(231,76,60,0.8)]' : 'bg-[#4A201A]'
                  }`}
                >
                  東
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] sm:text-xs font-black uppercase tracking-wide text-[#E74C3C] truncate">
                    P1 East
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {isP1Turn && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#E74C3C] text-[8px] sm:text-[9px] font-black text-white uppercase tracking-wider animate-pulse shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    Turn
                  </span>
                )}
                {renderStars(p1RoundsWon, '#E74C3C')}
              </div>
            </div>

            {/* Score */}
            <div className="mt-1 flex items-baseline justify-between">
              <motion.div
                key={p1Score}
                initial={{ scale: 1.15 }}
                animate={{ scale: 1 }}
                className="text-base sm:text-2xl font-black text-[#FFD700] tracking-tight truncate leading-none"
              >
                {p1Score.toLocaleString()}
              </motion.div>
              <span className="text-[9px] sm:text-[10px] uppercase font-bold text-[#8A7B6D]">PTS</span>
            </div>

            {/* Queue & Salt Footer */}
            <div className="mt-2 pt-1.5 border-t border-[#3A241A]/70 flex items-center justify-between gap-1">
              {/* Loaded & Next Rikishi Preview */}
              <div className="flex items-center gap-1">
                <span className="text-[8px] sm:text-[9px] font-bold text-[#A89886] uppercase hidden min-[380px]:inline">
                  Next:
                </span>
                <div className="flex items-center gap-1">
                  {p1NextTiers.slice(0, 2).map((tier, idx) => {
                    const fruit = FRUIT_CATALOG[tier - 1] || FRUIT_CATALOG[0];
                    return (
                      <span
                        key={`p1-next-${tier}-${idx}`}
                        className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full border border-white/30 text-[9px] sm:text-[10px] font-black text-white shadow-sm"
                        style={{ backgroundColor: fruit.color }}
                        title={`P1 Tier ${tier}: ${fruit.name}`}
                      >
                        {tier}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* P1 Salt Button */}
              <motion.button
                id="p1-salt-btn"
                whileTap={isP1Turn && p1SaltCharges > 0 ? { scale: 0.94 } : undefined}
                onClick={isP1Turn ? onThrowSalt : undefined}
                disabled={!isP1Turn || p1SaltCharges < 1}
                title={
                  !isP1Turn
                    ? "Player 1's turn required to throw salt"
                    : p1SaltCharges > 0
                    ? 'Throw Kiyome Salt'
                    : `Recharging salt (${p1SaltLaunchCount}/5 shots)`
                }
                className={`h-6 sm:h-7 px-2 rounded-lg text-[9px] sm:text-[10px] font-black transition-all flex items-center gap-1 ${
                  isP1Turn && p1SaltCharges > 0
                    ? 'bg-[#E74C3C] text-white shadow-[0_0_8px_rgba(231,76,60,0.6)] cursor-pointer border border-white/40'
                    : 'bg-[#201712] text-[#6E6053] border border-[#36271D] cursor-not-allowed opacity-60'
                }`}
              >
                <span>🧂</span>
                <span>{p1SaltCharges > 0 ? 'SALT' : `${p1SaltLaunchCount}/5`}</span>
              </motion.button>
            </div>
          </motion.div>

          {/* ================= CENTER MATCH STATUS & CONTROLS ================= */}
          <div className="order-1 col-span-2 flex min-w-0 items-center justify-between gap-2 px-1 py-0.5 text-center sm:order-2 sm:col-span-1 sm:min-w-[130px] sm:flex-col sm:justify-center sm:gap-1.5 sm:px-2 sm:py-0">
            {/* Bout tracker badge */}
            <div className="inline-flex shrink-0 flex-col items-center">
              <div className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#FFD700]">
                Bout {currentBout}/{maxRounds}
              </div>
              <div className="text-[8px] sm:text-[9px] font-bold text-[#8A7B6D] uppercase">
                First to {neededWins}
              </div>
            </div>

            {/* Live Ring Dominance Tug-of-War Bar with Spring Transitions */}
            <div className="min-w-0 flex-1 space-y-0.5 sm:w-full sm:flex-none" title="Dohyō ring mass balance">
              <div className="flex justify-between text-[8px] font-black text-[#8A7B6D]">
                <span className="text-[#E74C3C]">{p1Ratio}% 東</span>
                <span className="text-[#3498DB]">西 {p2Ratio}%</span>
              </div>
              <div className="h-1.5 sm:h-2 w-full bg-[#1A120D] rounded-full overflow-hidden flex border border-[#3E2D20]">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#C0392B] to-[#E74C3C]"
                  initial={false}
                  animate={{ width: `${p1Ratio}%` }}
                  transition={{ type: 'spring', stiffness: 220, damping: 26 }}
                />
                <motion.div
                  className="h-full bg-gradient-to-r from-[#2980B9] to-[#3498DB]"
                  initial={false}
                  animate={{ width: `${p2Ratio}%` }}
                  transition={{ type: 'spring', stiffness: 220, damping: 26 }}
                />
              </div>
            </div>

            {/* Action Buttons: Tabletop 180° Flip, Sound, Settings */}
            <div className="flex shrink-0 items-center gap-1 pt-0.5">
              {onToggleTabletop && (
                <motion.button
                  id="versus-tabletop-btn"
                  whileTap={{ scale: 0.92 }}
                  onClick={onToggleTabletop}
                  title={`Tabletop 180° Flip: ${tabletopInversion ? 'ACTIVE' : 'OFF'}`}
                  className={`h-6 w-6 sm:h-7 sm:w-7 flex items-center justify-center rounded-lg border transition-all cursor-pointer ${
                    tabletopInversion
                      ? 'bg-[#3498DB] text-white border-white/60 shadow-[0_0_8px_rgba(52,152,219,0.7)]'
                      : 'bg-[#1C1612] text-[#8A7B6D] hover:text-white border-[#3A2A1E]'
                  }`}
                >
                  <RotateCw size={12} className={tabletopInversion ? 'rotate-180' : ''} />
                </motion.button>
              )}

              {onToggleSound && (
                <motion.button
                  id="versus-sound-btn"
                  whileTap={{ scale: 0.92 }}
                  onClick={onToggleSound}
                  title={soundEnabled ? 'Mute Sound' : 'Unmute Sound'}
                  className="h-6 w-6 sm:h-7 sm:w-7 flex items-center justify-center rounded-lg bg-[#1C1612] text-[#8A7B6D] hover:text-white border border-[#3A2A1E] transition-all cursor-pointer"
                >
                  {soundEnabled ? <Volume2 size={12} /> : <VolumeX size={12} className="text-[#E74C3C]" />}
                </motion.button>
              )}

              {onRestart && (
                <motion.button
                  id="versus-restart-btn"
                  whileTap={{ scale: 0.92 }}
                  onClick={onRestart}
                  title="Restart 1v1 Showdown"
                  className="h-6 w-6 sm:h-7 sm:w-7 flex items-center justify-center rounded-lg bg-[#1C1612] text-[#8A7B6D] hover:text-[#FFD700] border border-[#3A2A1E] transition-all cursor-pointer"
                >
                  <RotateCcw size={12} />
                </motion.button>
              )}

              {onOpenSettings && (
                <motion.button
                  id="versus-settings-btn"
                  whileTap={{ scale: 0.92 }}
                  onClick={onOpenSettings}
                  title="Match Settings & Rules"
                  className="h-6 w-6 sm:h-7 sm:w-7 flex items-center justify-center rounded-lg bg-[#1C1612] text-[#8A7B6D] hover:text-[#FFD700] border border-[#3A2A1E] transition-all cursor-pointer"
                >
                  <Settings size={12} />
                </motion.button>
              )}
            </div>
          </div>

          {/* ================= PLAYER 2 (WEST 西) ================= */}
          <motion.div
            animate={isP2Turn ? { scale: [1, 1.01, 1] } : { scale: 1 }}
            transition={{ duration: 0.3 }}
            className={`relative order-3 min-w-0 rounded-xl p-2 transition-all duration-300 sm:p-2.5 ${
              isP2Turn
                ? 'bg-gradient-to-l from-[#122438] to-[#121920] border-2 border-[#3498DB] shadow-[0_0_18px_rgba(52,152,219,0.35)]'
                : 'bg-[#12161D]/70 border border-[#1C2630] opacity-75'
            }`}
          >
            {/* Header: Identity & Turn Badge */}
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5 shrink-0">
                {renderStars(p2RoundsWon, '#3498DB')}
                {isP2Turn && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#3498DB] text-[8px] sm:text-[9px] font-black text-white uppercase tracking-wider animate-pulse shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    Turn
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 min-w-0 justify-end">
                <div className="min-w-0 text-right">
                  <div className="text-[10px] sm:text-xs font-black uppercase tracking-wide text-[#3498DB] truncate">
                    P2 West
                  </div>
                </div>
                <div
                  className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-black text-white shrink-0 ${
                    isP2Turn ? 'bg-[#3498DB] shadow-[0_0_8px_rgba(52,152,219,0.8)]' : 'bg-[#182C40]'
                  }`}
                >
                  西
                </div>
              </div>
            </div>

            {/* Score */}
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-[9px] sm:text-[10px] uppercase font-bold text-[#8A7B6D]">PTS</span>
              <motion.div
                key={p2Score}
                initial={{ scale: 1.15 }}
                animate={{ scale: 1 }}
                className="text-base sm:text-2xl font-black text-[#FFD700] tracking-tight truncate leading-none"
              >
                {p2Score.toLocaleString()}
              </motion.div>
            </div>

            {/* Queue & Salt Footer */}
            <div className="mt-2 pt-1.5 border-t border-[#1C2B3A]/70 flex items-center justify-between gap-1">
              {/* P2 Salt Button */}
              <motion.button
                id="p2-salt-btn"
                whileTap={isP2Turn && p2SaltCharges > 0 ? { scale: 0.94 } : undefined}
                onClick={isP2Turn ? onThrowSalt : undefined}
                disabled={!isP2Turn || p2SaltCharges < 1}
                title={
                  !isP2Turn
                    ? "Player 2's turn required to throw salt"
                    : p2SaltCharges > 0
                    ? 'Throw Kiyome Salt'
                    : `Recharging salt (${p2SaltLaunchCount}/5 shots)`
                }
                className={`h-6 sm:h-7 px-2 rounded-lg text-[9px] sm:text-[10px] font-black transition-all flex items-center gap-1 ${
                  isP2Turn && p2SaltCharges > 0
                    ? 'bg-[#3498DB] text-white shadow-[0_0_8px_rgba(52,152,219,0.6)] cursor-pointer border border-white/40'
                    : 'bg-[#141A22] text-[#556372] border border-[#222E3A] cursor-not-allowed opacity-60'
                }`}
              >
                <span>🧂</span>
                <span>{p2SaltCharges > 0 ? 'SALT' : `${p2SaltLaunchCount}/5`}</span>
              </motion.button>

              {/* Loaded & Next Rikishi Preview */}
              <div className="flex items-center gap-1">
                <span className="text-[8px] sm:text-[9px] font-bold text-[#A89886] uppercase hidden min-[380px]:inline">
                  Next:
                </span>
                <div className="flex items-center gap-1">
                  {p2NextTiers.slice(0, 2).map((tier, idx) => {
                    const fruit = FRUIT_CATALOG[tier - 1] || FRUIT_CATALOG[0];
                    return (
                      <span
                        key={`p2-next-${tier}-${idx}`}
                        className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full border border-white/30 text-[9px] sm:text-[10px] font-black text-white shadow-sm"
                        style={{ backgroundColor: fruit.color }}
                        title={`P2 Tier ${tier}: ${fruit.name}`}
                      >
                        {tier}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
