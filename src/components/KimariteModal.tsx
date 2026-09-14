import React from 'react';
import { Award, X, CheckCircle2, Lock } from 'lucide-react';
import { KimariteManager, KimariteTechnique } from '../game/KimariteManager';

interface KimariteModalProps {
  isOpen: boolean;
  onClose: () => void;
  kimariteManager: KimariteManager;
}

export const KimariteModal: React.FC<KimariteModalProps> = ({
  isOpen,
  onClose,
  kimariteManager,
}) => {
  if (!isOpen) return null;

  const techniques = kimariteManager.getAll();
  const { unlocked, total } = kimariteManager.getUnlockedCount();

  const categoryLabels: Record<KimariteTechnique['category'], { label: string; color: string }> = {
    FUSION: { label: 'Fusion & Combos', color: '#F39C12' },
    TRICK_SHOT: { label: 'Trick Shots & Spin', color: '#3498DB' },
    DEFENSE: { label: 'Dohyō Defense', color: '#2ECC71' },
    MASTERY: { label: 'Yokozuna Mastery', color: '#9B59B6' },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-[#1C1814] border-2 border-[#5A4535] rounded-2xl shadow-2xl overflow-hidden text-[#EDE2D4]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#3D2E24] bg-[#241E19]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FFD700]/20 to-[#E67E22]/20 border border-[#FFD700]/40 flex items-center justify-center text-xl shadow-inner">
              🥋
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-wide text-white">
                  決まり手 Kimarite Techniques
                </h2>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-[#3E3125] text-[#FFD700] border border-[#5A4535]">
                  {unlocked} / {total} Mastered
                </span>
              </div>
              <p className="text-xs text-[#A89886]">
                Sumo winning throws, rebounds, sidespins, and sacred defense achievements
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#2E241D] hover:bg-[#3D2E24] text-[#A89886] hover:text-white transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* List of Kimarite Cards */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {techniques.map((tech) => {
            const cat = categoryLabels[tech.category];
            const isUnlocked = tech.unlocked;

            return (
              <div
                key={tech.id}
                className={`flex items-start gap-3.5 p-3.5 rounded-xl border transition-all ${
                  isUnlocked
                    ? 'bg-[#2A221B]/90 border-[#6B533E] shadow-md'
                    : 'bg-[#181411]/60 border-[#2A2018] opacity-75'
                }`}
              >
                {/* Icon box */}
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 border ${
                    isUnlocked
                      ? 'bg-gradient-to-br from-[#3D2F23] to-[#251D16] border-[#8C6D4F] shadow-inner'
                      : 'bg-[#1F1914] border-[#33261C] grayscale opacity-60'
                  }`}
                >
                  {tech.icon}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-black text-sm sm:text-base text-white truncate">
                        {tech.title}
                      </span>
                      <span className="text-xs font-bold text-[#D4AC0D] bg-[#2E2214] px-1.5 py-0.5 rounded border border-[#554024]">
                        {tech.nameJp} ({tech.nameRomaji})
                      </span>
                    </div>

                    {isUnlocked ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-[#2ECC71] shrink-0">
                        <CheckCircle2 size={14} /> Mastered
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-[#7F8C8D] shrink-0">
                        <Lock size={13} /> {tech.progress}/{tech.maxProgress}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[#C8B8A6] leading-relaxed mb-2">
                    {tech.description}
                  </p>

                  <div className="flex items-center justify-between">
                    <span
                      className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: `${cat.color}20`,
                        color: cat.color,
                        border: `1px solid ${cat.color}40`,
                      }}
                    >
                      {cat.label}
                    </span>

                    {/* Progress Bar */}
                    <div className="flex items-center gap-2">
                      <div className="w-24 sm:w-32 h-1.5 bg-[#2B2119] rounded-full overflow-hidden border border-[#3E3024]">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isUnlocked ? 'bg-[#2ECC71]' : 'bg-[#E67E22]'
                          }`}
                          style={{
                            width: `${Math.min(100, (tech.progress / tech.maxProgress) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-[#8C7A68]">
                        {Math.round((tech.progress / tech.maxProgress) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#3D2E24] bg-[#241E19] flex items-center justify-between text-xs text-[#A89886]">
          <span>Tip: Master all 8 techniques to prove yourself a Grand Champion!</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#3E3125] hover:bg-[#5A4535] text-white font-bold transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
