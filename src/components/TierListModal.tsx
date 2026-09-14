import React, { useState } from 'react';
import { X, Award, Shield, Weight, Sparkles, AlertTriangle, Flame, Snowflake, Skull } from 'lucide-react';
import { FRUIT_CATALOG } from '../types/game';

interface TierListModalProps {
  isOpen: boolean;
  onClose: () => void;
  highestTierReached: number;
}

export const TierListModal: React.FC<TierListModalProps> = ({
  isOpen,
  onClose,
  highestTierReached,
}) => {
  const [activeTab, setActiveTab] = useState<'ROSTER' | 'HAZARDS'>('ROSTER');

  if (!isOpen) return null;

  return (
    <div
      id="tier-list-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div
        id="tier-list-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tier-list-modal-title"
        className="relative w-full max-w-3xl max-h-[85vh] bg-[#1C1814] border border-[#3E342B] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-[#EDE2D4]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#3E342B] bg-[#241E19]">
          <div className="flex items-center gap-2.5">
            <Award className="text-[#FFD700]" size={24} />
            <div>
              <h2 id="tier-list-modal-title" className="text-lg font-black tracking-tight text-[#FFD700]">
                {activeTab === 'ROSTER' ? 'Sumo Fruit Roster (11 Tiers)' : 'Dohyō Hazards & Rivals Guide'}
              </h2>
              <p className="text-xs text-[#A89886]">
                {activeTab === 'ROSTER'
                  ? 'Colliding matching wrestlers merges them into the next weight class!'
                  : 'Master how to counter, defeat, and ring-out Dohyō obstacles.'}
              </p>
            </div>
          </div>
          <button
            id="tier-modal-close-btn"
            onClick={onClose}
            aria-label="Close roster and hazard guide"
            className="p-1.5 rounded-lg text-[#A89886] hover:text-white hover:bg-[#3E342B] transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-[#3E342B] bg-[#181512] px-6 pt-2 gap-2">
          <button
            id="tab-roster-btn"
            onClick={() => setActiveTab('ROSTER')}
            className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-colors cursor-pointer border-b-2 ${
              activeTab === 'ROSTER'
                ? 'bg-[#241E19] text-[#FFD700] border-[#FFD700]'
                : 'text-[#A89886] hover:text-white border-transparent'
            }`}
          >
            Sumo Roster (11 Tiers)
          </button>
          <button
            id="tab-hazards-btn"
            onClick={() => setActiveTab('HAZARDS')}
            className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
              activeTab === 'HAZARDS'
                ? 'bg-[#241E19] text-[#2ECC71] border-[#2ECC71]'
                : 'text-[#A89886] hover:text-white border-transparent'
            }`}
          >
            <AlertTriangle size={13} className="text-[#2ECC71]" />
            Hazards & Defeat Guide
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {activeTab === 'ROSTER' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FRUIT_CATALOG.map((fruit) => {
                const isUnlocked = fruit.tier <= highestTierReached;
                const isYokozuna = fruit.tier === 11;
                const mergePoints = 10 * Math.pow(2, fruit.tier - 1);

                return (
                  <div
                    key={fruit.tier}
                    className={`p-3.5 rounded-xl border transition-all flex items-center gap-3.5 ${
                      isYokozuna
                        ? 'bg-gradient-to-r from-[#FFD700]/15 to-[#FFB38A]/10 border-[#FFD700]/50'
                        : isUnlocked
                        ? 'bg-[#251F19] border-[#3E342B]'
                        : 'bg-[#181512] border-[#2B231B] opacity-60'
                    }`}
                  >
                    {/* Fruit Icon Preview */}
                    <div
                      className="relative w-12 h-12 rounded-full flex items-center justify-center shrink-0 border-2 border-black/50 shadow-inner"
                      style={{ backgroundColor: fruit.color }}
                    >
                      {/* Mawashi band */}
                      <div
                        className="absolute inset-x-0 h-3 border-y border-black/30"
                        style={{
                          backgroundColor: fruit.mawashiColor,
                          top: '50%',
                          transform: 'translateY(-50%)',
                        }}
                      />
                      {isYokozuna && (
                        <Sparkles
                          size={16}
                          className="text-[#FFD700] absolute -top-1 -right-1 drop-shadow"
                        />
                      )}
                      <span className="relative z-10 text-xs font-black text-white drop-shadow">
                        T{fruit.tier}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-black text-sm text-white truncate">
                          {fruit.name}
                        </span>
                        <span className="text-[11px] font-bold text-[#FFD700]">
                          +{mergePoints.toLocaleString()} pts
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-1 mt-1 text-[10px] text-[#A89886]">
                        <div className="flex items-center gap-1">
                          <Weight size={11} className="text-[#3498DB]" />
                          <span>Mass {fruit.mass}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Shield size={11} className="text-[#2ECC71]" />
                          <span>Res {(fruit.resistance * 100).toFixed(0)}%</span>
                        </div>
                        <div>
                          <span>Bnc {Math.round(fruit.restitution * 100)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Wasabi Sludge Feature Card */}
              <div className="p-4 rounded-xl border border-[#2ECC71]/50 bg-[#162719] flex flex-col sm:flex-row gap-4">
                <div className="w-14 h-14 rounded-full bg-[#27AE60] border-2 border-[#1E8449] flex items-center justify-center shrink-0 shadow-lg text-white font-black text-xs relative">
                  <div className="w-8 h-8 rounded-full bg-[#2ECC71] flex items-center justify-center">
                    <span className="text-sm">WASABI</span>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-black text-[#2ECC71]">
                      Wasabi Sludge (Green Mound Enemy)
                    </h3>
                    <span className="text-xs font-mono font-bold bg-[#1B4D27] text-[#A9DFBF] px-2 py-0.5 rounded">
                      3 HP • 180 Pts
                    </span>
                  </div>
                  <p className="text-xs text-[#C8E6C9] leading-relaxed">
                    <strong>What it does:</strong> A sticky, viscous sludge that obstructs movement and traps your wrestlers when they make contact.
                  </p>
                  <div className="bg-[#0E1A11] p-2.5 rounded-lg border border-[#27AE60]/30 space-y-1.5 text-xs text-[#E8F8F5]">
                    <div className="font-bold text-[#A9DFBF] uppercase tracking-wider text-[10px]">
                      How to Defeat It:
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-[11px] text-[#C8E6C9]">
                      <li>
                        <strong>Strike 3 Times:</strong> Launch your Sumo Fruits directly into it. Heavier wrestlers (Tier 4+) or high-speed launches deal 2 damage!
                      </li>
                      <li>
                        <strong>Yorikiri (Push Out):</strong> Ram the sludge toward the straw rim to push it out of the Dohyō bowl for bonus points!
                      </li>
                      <li>
                        <strong>Kiyome-no-Shio Salt [S]:</strong> Press the Salt button or [S] key to cast purifying sacred salt and instantly dissolve it.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Other Hazards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Chili Pepper */}
                <div className="p-3.5 rounded-xl border border-[#E74C3C]/40 bg-[#251717] flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#E74C3C] border border-[#922B21] flex items-center justify-center shrink-0 text-white">
                    <Flame size={20} />
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm text-[#F1948A]">Fiery Chili</span>
                      <span className="text-[10px] text-[#E67E22] font-mono">Rocket Boost</span>
                    </div>
                    <p className="text-[11px] text-[#D7BDE2] leading-tight">
                      Explosive rocket boost! Knocks colliding wrestlers forward with rapid acceleration.
                    </p>
                  </div>
                </div>

                {/* Ice Cube */}
                <div className="p-3.5 rounded-xl border border-[#3498DB]/40 bg-[#15202B] flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#3498DB] border border-[#2980B9] flex items-center justify-center shrink-0 text-white">
                    <Snowflake size={20} />
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm text-[#85C1E9]">Ice Cube</span>
                      <span className="text-[10px] text-[#5DADE2] font-mono">Zero Friction</span>
                    </div>
                    <p className="text-[11px] text-[#AED6F1] leading-tight">
                      Slides effortlessly across the Dohyō bowl slopes. Dissolves under sacred salt.
                    </p>
                  </div>
                </div>

                {/* Rival Tengu */}
                <div className="p-3.5 rounded-xl border border-[#9B59B6]/40 bg-[#21152B] flex items-start gap-3 sm:col-span-2">
                  <div className="w-10 h-10 rounded-full bg-[#8E44AD] border border-[#5B2C6F] flex items-center justify-center shrink-0 text-white">
                    <Skull size={20} />
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm text-[#D7BDE2]">Rival Tengu Rikishi (Boss)</span>
                      <span className="text-[10px] text-[#F39C12] font-mono">Kinboshi Defeat</span>
                    </div>
                    <p className="text-[11px] text-[#D2B4DE] leading-tight">
                      Spawns during Career Mode. Aggressively charges toward your highest tier fruits. Push him out of the ring for a glorious Kinboshi victory and Banzuke promotion!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 border-t border-[#3E342B] bg-[#241E19] text-xs text-[#A89886] flex justify-between items-center">
          <span>Tiers 1–3 spawnable from the slingshot pedestal.</span>
          <span className="font-bold text-[#FFD700]">
            Tier 11 Yokozuna triggers Hazard Cleansing!
          </span>
        </div>
      </div>
    </div>
  );
};
