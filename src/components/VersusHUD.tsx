import React from 'react';
import { Sparkles, Swords, Award, RotateCcw, Zap, RotateCw } from 'lucide-react';
import { GameStats } from '../game/GameEngine';
import { FRUIT_CATALOG, SpinMode } from '../types/game';

interface VersusHUDProps {
  stats: GameStats;
  onSelectSpinMode: (mode: SpinMode) => void;
  onThrowSalt: () => void;
  onRestartVersus: () => void;
  onToggleTabletop?: () => void;
}

export const VersusHUD: React.FC<VersusHUDProps> = ({
  stats,
  onSelectSpinMode,
  onThrowSalt,
  onRestartVersus,
  onToggleTabletop,
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
    p1SpinMode,
    p2SpinMode,
    p1NextTiers,
    p2NextTiers,
    tugOfWarMassP1,
    tugOfWarMassP2,
  } = versus;

  const combinedMass = tugOfWarMassP1 + tugOfWarMassP2;
  const p1Ratio = combinedMass <= 0 ? 50 : Math.round((tugOfWarMassP1 / combinedMass) * 100);
  const p2Ratio = 100 - p1Ratio;

  const neededWins = Math.ceil(maxRounds / 2);

  const renderStars = (wins: number) => {
    return Array.from({ length: neededWins }).map((_, i) => (
      <span
        key={i}
        className={`text-base sm:text-lg transition-transform ${
          i < wins ? 'text-[#FFD700] scale-110 drop-shadow-[0_0_6px_rgba(255,215,0,0.8)]' : 'text-[#4A3D31] opacity-40'
        }`}
      >
        ★
      </span>
    ));
  };

  const getFruitInfo = (tier: number) => {
    return FRUIT_CATALOG[tier - 1] || FRUIT_CATALOG[0];
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 pt-1 sm:pt-2 pb-1 text-[#EDE2D4] pointer-events-auto">
      {/* Main Dual Player Versus Card */}
      <div className="relative bg-[#1A1612]/95 border-2 border-[#5A4535] rounded-2xl shadow-2xl p-2 sm:p-3 backdrop-blur-md overflow-hidden">
        {/* Subtle Background Dual Gradients */}
        <div className="absolute inset-0 pointer-events-none flex">
          <div className={`w-1/2 bg-gradient-to-r from-[#E74C3C]/10 to-transparent transition-opacity duration-300 ${playerTurn === 1 ? 'opacity-100' : 'opacity-30'}`} />
          <div className={`w-1/2 bg-gradient-to-l from-[#3498DB]/10 to-transparent transition-opacity duration-300 ${playerTurn === 2 ? 'opacity-100' : 'opacity-30'}`} />
        </div>

        {/* Top Bout & Tug of War Dominance Bar */}
        <div className="relative mb-2.5 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider px-1">
            <div className="flex items-center gap-1 text-[#E74C3C]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E74C3C] animate-pulse" />
              <span>東方 HIGASHI (P1)</span>
              <span className="text-[10px] text-[#A89886] font-normal">({p1Ratio}%)</span>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#2A211B] border border-[#6B533E] text-[#FFD700] text-[11px] shadow-sm">
                <Swords size={13} className="text-[#FFD700]" />
                <span>BOUT {currentBout} OF {maxRounds} (FIRST TO {neededWins})</span>
              </div>
              {onToggleTabletop && (
                <button
                  id="versus-hud-tabletop-btn"
                  onClick={onToggleTabletop}
                  title={`Tabletop 180° Inversion: ${versus.tabletopInversion ? 'ON' : 'OFF'}`}
                  className={`p-1 rounded-full border transition-all cursor-pointer ${
                    versus.tabletopInversion
                      ? 'bg-[#3498DB] text-white border-white/50 shadow'
                      : 'bg-[#1F1914] text-[#8A7B6D] border-[#3E3025] hover:text-white'
                  }`}
                >
                  <RotateCw size={12} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 text-[#3498DB]">
              <span className="text-[10px] text-[#A89886] font-normal">({p2Ratio}%)</span>
              <span>西方 NISHI (P2)</span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#3498DB] animate-pulse" />
            </div>
          </div>

          {/* Tug of War Dynamic Ring Dominance Bar */}
          <div className="w-full h-2.5 bg-[#120F0C] rounded-full overflow-hidden flex border border-[#3E3125] shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-[#C0392B] to-[#E74C3C] transition-all duration-300 relative"
              style={{ width: `${p1Ratio}%` }}
            >
              {p1Ratio > 25 && (
                <div className="absolute right-1 top-0 bottom-0 flex items-center text-[8px] font-black text-white pr-1">
                  東
                </div>
              )}
            </div>
            <div
              className="h-full bg-gradient-to-l from-[#2980B9] to-[#3498DB] transition-all duration-300 relative"
              style={{ width: `${p2Ratio}%` }}
            >
              {p2Ratio > 25 && (
                <div className="absolute left-1 top-0 bottom-0 flex items-center text-[8px] font-black text-white pl-1">
                  西
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dual Player Panels */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4 relative z-10">
          {/* Player 1 (East 東) Panel */}
          <div
            id="versus-p1-card"
            className={`rounded-xl p-2 sm:p-2.5 border transition-all duration-200 ${
              playerTurn === 1
                ? 'bg-[#2E1513]/90 border-[#E74C3C] shadow-[0_0_15px_rgba(231,76,60,0.35)] ring-2 ring-[#E74C3C]/50'
                : 'bg-[#1D1714]/80 border-[#3D2B22] opacity-75'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-lg bg-[#E74C3C] text-white font-black text-xs flex items-center justify-center shadow-md">
                  東
                </div>
                <div>
                  <div className="text-xs font-black text-white flex items-center gap-1">
                    Player 1
                    {playerTurn === 1 && (
                      <span className="px-1.5 py-0.2 rounded bg-[#E74C3C] text-white text-[9px] font-black animate-pulse">
                        YOUR SHOT
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-[#A89886]">East Yokozuna</div>
                </div>
              </div>

              <div className="flex items-center gap-0.5">{renderStars(p1RoundsWon)}</div>
            </div>

            {/* Score & Next Fruit */}
            <div className="flex items-center justify-between bg-[#140F0D] rounded-lg px-2 py-1.5 border border-[#3E2522] mb-1.5">
              <div>
                <div className="text-[9px] text-[#8A7B6D] uppercase font-bold">Score</div>
                <div className="text-base font-black text-[#FFD700]">{p1Score.toLocaleString()}</div>
              </div>

              {/* Next Fruit Queue */}
              <div className="flex items-center gap-1">
                <span className="text-[9px] text-[#8A7B6D] font-bold mr-1">NEXT:</span>
                {p1NextTiers.map((t, idx) => {
                  const f = getFruitInfo(t);
                  return (
                    <div
                      key={idx}
                      className="w-5 h-5 rounded-full border border-white/20 flex items-center justify-center text-[10px] shadow-sm font-bold text-white"
                      style={{ backgroundColor: f.color }}
                      title={`${f.name} (Tier ${t})`}
                    >
                      {t}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* P1 Controls (Active turn only) */}
            {playerTurn === 1 && (
              <div className="space-y-1">
                <div className="grid grid-cols-3 gap-1">
                  <button
                    id="p1-spin-left"
                    onClick={() => onSelectSpinMode('LEFT')}
                    className={`py-1 px-1 rounded text-[10px] font-bold border transition-all cursor-pointer text-center ${
                      p1SpinMode === 'LEFT'
                        ? 'bg-[#E74C3C] border-white text-white shadow-sm'
                        : 'bg-[#221614] border-[#4A2520] text-[#D0C0B0] hover:text-white'
                    }`}
                  >
                    ↺ Curve L
                  </button>
                  <button
                    id="p1-spin-straight"
                    onClick={() => onSelectSpinMode('STRAIGHT')}
                    className={`py-1 px-1 rounded text-[10px] font-bold border transition-all cursor-pointer text-center ${
                      p1SpinMode === 'STRAIGHT'
                        ? 'bg-[#E74C3C] border-white text-white shadow-sm'
                        : 'bg-[#221614] border-[#4A2520] text-[#D0C0B0] hover:text-white'
                    }`}
                  >
                    Straight
                  </button>
                  <button
                    id="p1-spin-right"
                    onClick={() => onSelectSpinMode('RIGHT')}
                    className={`py-1 px-1 rounded text-[10px] font-bold border transition-all cursor-pointer text-center ${
                      p1SpinMode === 'RIGHT'
                        ? 'bg-[#E74C3C] border-white text-white shadow-sm'
                        : 'bg-[#221614] border-[#4A2520] text-[#D0C0B0] hover:text-white'
                    }`}
                  >
                    Curve R ↻
                  </button>
                </div>

                <button
                  id="p1-salt-btn"
                  onClick={onThrowSalt}
                  disabled={p1SaltCharges < 1}
                  className={`w-full py-1 px-2 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    p1SaltCharges > 0
                      ? 'bg-gradient-to-r from-[#E74C3C] to-[#C0392B] text-white border-[#FF9988] shadow-md hover:brightness-110 active:scale-98'
                      : 'bg-[#1F1715] text-[#7A6B60] border-[#382824] cursor-not-allowed opacity-60'
                  }`}
                >
                  <span>🧂 Kiyome Salt</span>
                  <span className="text-[10px] bg-black/40 px-1.5 py-0.2 rounded-full">
                    {p1SaltCharges > 0 ? 'READY' : 'CHARGING'}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Player 2 (West 西) Panel */}
          <div
            id="versus-p2-card"
            className={`rounded-xl p-2 sm:p-2.5 border transition-all duration-200 ${
              playerTurn === 2
                ? 'bg-[#132230]/90 border-[#3498DB] shadow-[0_0_15px_rgba(52,152,219,0.35)] ring-2 ring-[#3498DB]/50'
                : 'bg-[#1D1714]/80 border-[#3D2B22] opacity-75'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-lg bg-[#3498DB] text-white font-black text-xs flex items-center justify-center shadow-md">
                  西
                </div>
                <div>
                  <div className="text-xs font-black text-white flex items-center gap-1">
                    Player 2
                    {playerTurn === 2 && (
                      <span className="px-1.5 py-0.2 rounded bg-[#3498DB] text-white text-[9px] font-black animate-pulse">
                        YOUR SHOT
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-[#A89886]">West Yokozuna</div>
                </div>
              </div>

              <div className="flex items-center gap-0.5">{renderStars(p2RoundsWon)}</div>
            </div>

            {/* Score & Next Fruit */}
            <div className="flex items-center justify-between bg-[#0C151C] rounded-lg px-2 py-1.5 border border-[#1E374A] mb-1.5">
              <div>
                <div className="text-[9px] text-[#8A7B6D] uppercase font-bold">Score</div>
                <div className="text-base font-black text-[#FFD700]">{p2Score.toLocaleString()}</div>
              </div>

              {/* Next Fruit Queue */}
              <div className="flex items-center gap-1">
                <span className="text-[9px] text-[#8A7B6D] font-bold mr-1">NEXT:</span>
                {p2NextTiers.map((t, idx) => {
                  const f = getFruitInfo(t);
                  return (
                    <div
                      key={idx}
                      className="w-5 h-5 rounded-full border border-white/20 flex items-center justify-center text-[10px] shadow-sm font-bold text-white"
                      style={{ backgroundColor: f.color }}
                      title={`${f.name} (Tier ${t})`}
                    >
                      {t}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* P2 Controls (Active turn only) */}
            {playerTurn === 2 && (
              <div className="space-y-1">
                <div className="grid grid-cols-3 gap-1">
                  <button
                    id="p2-spin-left"
                    onClick={() => onSelectSpinMode('LEFT')}
                    className={`py-1 px-1 rounded text-[10px] font-bold border transition-all cursor-pointer text-center ${
                      p2SpinMode === 'LEFT'
                        ? 'bg-[#3498DB] border-white text-white shadow-sm'
                        : 'bg-[#131F2A] border-[#224059] text-[#D0C0B0] hover:text-white'
                    }`}
                  >
                    ↺ Curve L
                  </button>
                  <button
                    id="p2-spin-straight"
                    onClick={() => onSelectSpinMode('STRAIGHT')}
                    className={`py-1 px-1 rounded text-[10px] font-bold border transition-all cursor-pointer text-center ${
                      p2SpinMode === 'STRAIGHT'
                        ? 'bg-[#3498DB] border-white text-white shadow-sm'
                        : 'bg-[#131F2A] border-[#224059] text-[#D0C0B0] hover:text-white'
                    }`}
                  >
                    Straight
                  </button>
                  <button
                    id="p2-spin-right"
                    onClick={() => onSelectSpinMode('RIGHT')}
                    className={`py-1 px-1 rounded text-[10px] font-bold border transition-all cursor-pointer text-center ${
                      p2SpinMode === 'RIGHT'
                        ? 'bg-[#3498DB] border-white text-white shadow-sm'
                        : 'bg-[#131F2A] border-[#224059] text-[#D0C0B0] hover:text-white'
                    }`}
                  >
                    Curve R ↻
                  </button>
                </div>

                <button
                  id="p2-salt-btn"
                  onClick={onThrowSalt}
                  disabled={p2SaltCharges < 1}
                  className={`w-full py-1 px-2 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    p2SaltCharges > 0
                      ? 'bg-gradient-to-r from-[#3498DB] to-[#2980B9] text-white border-[#88CCFF] shadow-md hover:brightness-110 active:scale-98'
                      : 'bg-[#131B22] text-[#7A6B60] border-[#223545] cursor-not-allowed opacity-60'
                  }`}
                >
                  <span>🧂 Kiyome Salt</span>
                  <span className="text-[10px] bg-black/40 px-1.5 py-0.2 rounded-full">
                    {p2SaltCharges > 0 ? 'READY' : 'CHARGING'}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
