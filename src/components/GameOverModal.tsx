import React from 'react';
import { RotateCcw, Award, Trophy } from 'lucide-react';
import { FRUIT_CATALOG } from '../types/game';

interface GameOverModalProps {
  isOpen: boolean;
  score: number;
  highScore?: number;
  isNewHighScore?: boolean;
  reason: string;
  highestTierReached: number;
  onRestart: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  score,
  highScore = 0,
  isNewHighScore = false,
  reason,
  highestTierReached,
  onRestart,
}) => {
  if (!isOpen) return null;

  const topFruit = FRUIT_CATALOG[highestTierReached - 1];

  return (
    <div
      id="game-over-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-300"
    >
      <div
        id="game-over-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-over-modal-title"
        className="relative w-full max-w-md bg-[#1C1814] border-2 border-[#E74C3C] rounded-2xl shadow-2xl p-6 text-center text-[#EDE2D4]"
      >
        {/* New High Score Banner Celebration */}
        {isNewHighScore && score > 0 && (
          <div className="mb-3 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-[#F1C40F] to-[#E67E22] text-black font-black text-xs uppercase tracking-wider shadow-lg animate-bounce">
            <Trophy size={14} className="text-black" />
            <span>New Personal Best Record!</span>
          </div>
        )}

        <div className="w-16 h-16 rounded-full bg-[#E74C3C]/20 border-2 border-[#E74C3C] mx-auto flex items-center justify-center mb-3">
          <Trophy className="text-[#FFD700]" size={32} />
        </div>

        <h2 id="game-over-modal-title" className="text-2xl font-black text-white tracking-tight uppercase">
          Match Concluded!
        </h2>
        <p className="text-xs text-[#E74C3C] font-semibold mt-1 mb-5">
          {reason || 'The round has finished.'}
        </p>

        {/* Stats card */}
        <div className="bg-[#241E19] border border-[#3E342B] rounded-xl p-4 mb-6 flex flex-col gap-3">
          <div className="flex justify-between items-center border-b border-[#3E342B] pb-2">
            <span className="text-xs uppercase font-bold text-[#A89886]">
              Final Score
            </span>
            <span className="text-2xl font-black text-[#FFD700]">
              {score.toLocaleString()}
            </span>
          </div>

          {highScore > 0 && (
            <div className="flex justify-between items-center border-b border-[#3E342B] pb-2">
              <span className="text-xs uppercase font-bold text-[#A89886] flex items-center gap-1">
                <Trophy size={12} className="text-[#FFD700]" /> High Score
              </span>
              <span className="text-base font-bold text-[#E0D4C5]">
                {highScore.toLocaleString()}
              </span>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-xs uppercase font-bold text-[#A89886]">
              Highest Weight Class
            </span>
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full border border-black/40"
                style={{ backgroundColor: topFruit.color }}
              />
              <span className="font-bold text-sm text-white">
                {topFruit.name} (Tier {topFruit.tier})
              </span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          id="game-over-rematch-btn"
          onClick={onRestart}
          className="w-full flex items-center justify-center gap-2 bg-[#E74C3C] hover:bg-[#C0392B] text-white py-3.5 px-6 rounded-xl font-black text-base shadow-lg transition-all active:scale-95 cursor-pointer"
        >
          <RotateCcw size={18} />
          <span>Enter Dohyō Again</span>
        </button>
      </div>
    </div>
  );
};
