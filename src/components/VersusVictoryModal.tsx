import React from 'react';
import { Trophy, RotateCcw, Play, Swords, Award, Sparkles } from 'lucide-react';
import { VersusState } from '../types/game';

interface VersusVictoryModalProps {
  versus: VersusState;
  onRematch: () => void;
  onReturnToClassic: () => void;
}

export const VersusVictoryModal: React.FC<VersusVictoryModalProps> = ({
  versus,
  onRematch,
  onReturnToClassic,
}) => {
  if (!versus.isMatchOver || !versus.matchWinner) return null;

  const isP1 = versus.matchWinner === 1;
  const winnerName = isP1 ? 'Player 1 (East 東)' : 'Player 2 (West 西)';
  const winnerColor = isP1 ? '#E74C3C' : '#3498DB';
  const winnerScore = isP1 ? versus.p1Score : versus.p2Score;
  const loserScore = isP1 ? versus.p2Score : versus.p1Score;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in text-[#EDE2D4]">
      <div className="relative w-full max-w-lg bg-[#1C1814] border-2 border-[#5A4535] rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 text-center space-y-5">
        {/* Decorative Top Glow */}
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full blur-3xl pointer-events-none opacity-40"
          style={{ backgroundColor: winnerColor }}
        />

        {/* Emperor's Cup Trophy Icon & Banners */}
        <div className="relative space-y-2">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-[#2A211B] border-2 border-[#FFD700] flex items-center justify-center text-4xl shadow-[0_0_30px_rgba(255,215,0,0.4)] animate-bounce">
            🏆
          </div>

          <div className="inline-block px-4 py-1 rounded-full bg-[#3D2C1E] border border-[#FFD700]/60 text-xs font-black tracking-widest uppercase text-[#FFD700]">
            天皇賜杯 • EMPEROR'S CUP CHAMPION
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-wide">
            {winnerName} WINS!
          </h2>
          <p className="text-xs text-[#A89886]">
            Dominating the sacred Dohyō in {versus.boutHistory.length} hard-fought bouts!
          </p>
        </div>

        {/* Final Bout Score Card */}
        <div className="bg-[#241E19] border border-[#3E3025] rounded-2xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3 divide-x divide-[#3E3025]">
            <div className="text-center">
              <div className="text-xs text-[#E74C3C] font-black uppercase flex items-center justify-center gap-1">
                <span>東方 HIGASHI (P1)</span>
                {isP1 && <span>👑</span>}
              </div>
              <div className="text-2xl font-black text-white mt-0.5">{versus.p1RoundsWon} Wins</div>
              <div className="text-xs text-[#A89886]">{versus.p1Score.toLocaleString()} pts</div>
            </div>

            <div className="text-center pl-3">
              <div className="text-xs text-[#3498DB] font-black uppercase flex items-center justify-center gap-1">
                <span>西方 NISHI (P2)</span>
                {!isP1 && <span>👑</span>}
              </div>
              <div className="text-2xl font-black text-white mt-0.5">{versus.p2RoundsWon} Wins</div>
              <div className="text-xs text-[#A89886]">{versus.p2Score.toLocaleString()} pts</div>
            </div>
          </div>

          {/* Bout History Breakdown */}
          {versus.boutHistory.length > 0 && (
            <div className="border-t border-[#382B21] pt-3 space-y-1.5 text-left">
              <div className="text-[10px] font-black uppercase tracking-wider text-[#A89886]">
                Decisive Bouts & Kimarite (決まり手):
              </div>
              <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                {versus.boutHistory.map((bout, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-xs bg-[#1C1713] px-2.5 py-1.5 rounded-lg border border-[#34271E]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#FFD700]">Bout {bout.bout}:</span>
                      <span
                        className={`font-black ${
                          bout.winner === 1 ? 'text-[#E74C3C]' : 'text-[#3498DB]'
                        }`}
                      >
                        {bout.winner === 1 ? 'P1 (東)' : 'P2 (西)'} Won
                      </span>
                    </div>
                    <div className="text-[11px] text-[#D0C0B0]">
                      <span className="text-[#F1C40F] mr-1">{bout.methodJp}</span>
                      <span className="text-[#8A7B6D]">({bout.method})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            id="versus-rematch-btn"
            onClick={onRematch}
            className="py-3 px-4 rounded-xl bg-gradient-to-r from-[#D35400] to-[#E67E22] hover:from-[#E67E22] hover:to-[#F39C12] text-white font-black text-sm transition-all shadow-lg hover:shadow-[#E67E22]/30 active:scale-98 cursor-pointer flex items-center justify-center gap-2"
          >
            <RotateCcw size={16} />
            <span>Rematch Bout (再戦)</span>
          </button>

          <button
            id="versus-classic-btn"
            onClick={onReturnToClassic}
            className="py-3 px-4 rounded-xl bg-[#2C231C] hover:bg-[#3D3027] border border-[#5A4535] text-white font-bold text-sm transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2"
          >
            <Play size={16} />
            <span>Back to Classic</span>
          </button>
        </div>
      </div>
    </div>
  );
};
