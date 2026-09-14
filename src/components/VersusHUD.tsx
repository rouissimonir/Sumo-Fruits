import React from 'react';
import { RotateCw } from 'lucide-react';
import { GameStats } from '../game/GameEngine';
import { FRUIT_CATALOG } from '../types/game';

interface VersusHUDProps {
  stats: GameStats;
  onThrowSalt: () => void;
  onToggleTabletop?: () => void;
}

export const VersusHUD: React.FC<VersusHUDProps> = ({
  stats,
  onThrowSalt,
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
    p1NextTiers,
    p2NextTiers,
    tugOfWarMassP1,
    tugOfWarMassP2,
  } = versus;

  const combinedMass = tugOfWarMassP1 + tugOfWarMassP2;
  const p1Ratio = combinedMass <= 0 ? 50 : Math.round((tugOfWarMassP1 / combinedMass) * 100);
  const p2Ratio = 100 - p1Ratio;
  const neededWins = Math.ceil(maxRounds / 2);
  const activeQueue = playerTurn === 1 ? p1NextTiers : p2NextTiers;
  const activeSaltCharges = playerTurn === 1 ? p1SaltCharges : p2SaltCharges;
  const activeColor = playerTurn === 1 ? '#E74C3C' : '#3498DB';

  const renderWins = (wins: number) =>
    Array.from({ length: neededWins }).map((_, index) => (
      <span
        key={index}
        className={index < wins ? 'text-[#FFD700]' : 'text-[#4A3D31]'}
        aria-hidden="true"
      >
        ★
      </span>
    ));

  return (
    <section className="w-full max-w-3xl mx-auto pointer-events-auto" aria-label="Two-player match status">
      <div className="bg-[#1A1612]/95 border border-[#5A4535] rounded-xl shadow-xl px-2 py-1.5 sm:px-3 sm:py-2 backdrop-blur-md">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className={`min-w-0 ${playerTurn === 1 ? 'opacity-100' : 'opacity-60'}`}>
            <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wide text-[#E74C3C]">
              <span>東 P1</span>
              <span className="flex text-[9px]">{renderWins(p1RoundsWon)}</span>
            </div>
            <div className="text-base sm:text-lg leading-none font-black text-[#FFD700] truncate">
              {p1Score.toLocaleString()}
            </div>
          </div>

          <div className="text-center leading-tight">
            <div className="text-[9px] font-black uppercase tracking-wider text-[#FFD700]">
              Bout {currentBout}/{maxRounds}
            </div>
            <div className="text-[8px] font-bold uppercase text-[#A89886]">
              First to {neededWins}
            </div>
          </div>

          <div className={`min-w-0 text-right ${playerTurn === 2 ? 'opacity-100' : 'opacity-60'}`}>
            <div className="flex items-center justify-end gap-1 text-[9px] font-black uppercase tracking-wide text-[#3498DB]">
              <span className="flex text-[9px]">{renderWins(p2RoundsWon)}</span>
              <span>P2 西</span>
            </div>
            <div className="text-base sm:text-lg leading-none font-black text-[#FFD700] truncate">
              {p2Score.toLocaleString()}
            </div>
          </div>
        </div>

        <div
          className="mt-1 h-1.5 bg-[#120F0C] rounded-full overflow-hidden flex"
          aria-label={`Ring control: Player 1 ${p1Ratio} percent, Player 2 ${p2Ratio} percent`}
        >
          <div className="h-full bg-[#E74C3C] transition-[width] duration-300" style={{ width: `${p1Ratio}%` }} />
          <div className="h-full bg-[#3498DB] transition-[width] duration-300" style={{ width: `${p2Ratio}%` }} />
        </div>

        <div className="mt-1.5 flex min-w-0 items-center gap-1.5">
          <div
            className="shrink-0 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wide text-white"
            style={{ backgroundColor: activeColor }}
          >
            {playerTurn === 1 ? 'P1 East turn' : 'P2 West turn'}
          </div>

          <div className="flex min-w-0 flex-1 items-center justify-center gap-1 text-[8px] font-bold uppercase text-[#8A7B6D]">
            <span>Next</span>
            {activeQueue.map((tier, index) => {
              const fruit = FRUIT_CATALOG[tier - 1] || FRUIT_CATALOG[0];
              return (
                <span
                  key={`${tier}-${index}`}
                  className="flex h-5 w-5 items-center justify-center rounded-full border border-white/25 text-[9px] font-black text-white shadow-sm"
                  style={{ backgroundColor: fruit.color }}
                  title={`${fruit.name}, tier ${tier}`}
                >
                  {tier}
                </span>
              );
            })}
          </div>

          <button
            id="versus-salt-btn"
            onClick={onThrowSalt}
            disabled={activeSaltCharges < 1}
            title={activeSaltCharges > 0 ? 'Throw Kiyome salt' : 'Kiyome salt is charging'}
            className={`h-7 shrink-0 rounded-lg border px-2 text-[10px] font-black transition-all active:scale-95 ${
              activeSaltCharges > 0
                ? 'border-white/35 text-white cursor-pointer'
                : 'border-[#3E342B] bg-[#181512] text-[#6B625A] cursor-not-allowed'
            }`}
            style={activeSaltCharges > 0 ? { backgroundColor: activeColor } : undefined}
          >
            🧂 {activeSaltCharges > 0 ? '1' : '0'}
          </button>

          {onToggleTabletop && (
            <button
              id="versus-hud-tabletop-btn"
              onClick={onToggleTabletop}
              title={`Tabletop rotation: ${versus.tabletopInversion ? 'on' : 'off'}`}
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-all cursor-pointer ${
                versus.tabletopInversion
                  ? 'bg-[#3498DB] text-white border-white/50'
                  : 'bg-[#1F1914] text-[#8A7B6D] border-[#3E3025]'
              }`}
            >
              <RotateCw size={12} />
            </button>
          )}
        </div>
      </div>
    </section>
  );
};
