import React, { useEffect, useMemo, useState } from 'react';
import { Lock, Star, Trophy, X } from 'lucide-react';
import { CAMPAIGN_CHAPTERS, CAMPAIGN_LEVELS, getCampaignTechniqueText } from '../../content/campaign';
import { CampaignSnapshot } from '../../types/campaign';

interface Props {
  isOpen: boolean;
  campaign: CampaignSnapshot;
  onClose: () => void;
  onStart: (levelId: string) => void;
}

export const CampaignMap: React.FC<Props> = ({ isOpen, campaign, onClose, onStart }) => {
  const defaultId = CAMPAIGN_LEVELS[Math.min(campaign.highestUnlockedIndex, CAMPAIGN_LEVELS.length - 1)].id;
  const [selectedId, setSelectedId] = useState(defaultId);
  const selected = useMemo(() => CAMPAIGN_LEVELS.find((level) => level.id === selectedId) ?? CAMPAIGN_LEVELS[0], [selectedId]);
  useEffect(() => {
    if (isOpen) setSelectedId(CAMPAIGN_LEVELS[Math.min(campaign.highestUnlockedIndex, CAMPAIGN_LEVELS.length - 1)].id);
  }, [isOpen, campaign.highestUnlockedIndex]);
  if (!isOpen) return null;
  const unlocked = selected.index <= campaign.highestUnlockedIndex;

  return (
    <div className="fixed inset-0 z-[70] bg-[#100E0B]/95 backdrop-blur-lg overflow-y-auto px-3 pt-[max(env(safe-area-inset-top),16px)] pb-[max(env(safe-area-inset-bottom),16px)]">
      <div className="mx-auto max-w-3xl">
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-2xl border border-[#5A4535] bg-[#1C1814]/95 px-4 py-3 shadow-xl">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#E67E22]">Road to Yokozuna</div>
            <h2 className="text-xl font-black text-white">Career Basho</h2>
          </div>
          <button onClick={onClose} aria-label="Close campaign" className="rounded-xl border border-[#49382C] bg-[#2A211B] p-2 text-[#D7C6B3]"><X size={20}/></button>
        </div>

        <div className="mt-3 rounded-2xl border border-[#5A4535] bg-[#201914] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]">Bout {selected.index + 1} · Chapter {selected.chapter}</div>
              <h3 className="mt-1 text-lg font-black text-white">{selected.title}</h3>
              <p className="text-xs text-[#AFA08F]">{selected.subtitle}</p>
            </div>
            <div className="flex gap-0.5 text-[#FFD700]" aria-label={`${campaign.stampsByLevel[selected.id] ?? 0} stamps earned`}>
              {[0,1,2].map((i) => <Star key={i} size={17} className={i < (campaign.stampsByLevel[selected.id] ?? 0) ? 'fill-[#FFD700]' : 'text-[#4A3B30]'}/>) }
            </div>
          </div>
          <div className="mt-3 rounded-xl border border-[#49382C] bg-[#15110E] p-3">
            <div className="text-[10px] font-black uppercase tracking-wider text-[#E67E22]">Main objective</div>
            <div className="mt-1 font-bold text-white">{selected.objectiveText}</div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-[#C9B9A6]">
              <span>🎯 Technique: {getCampaignTechniqueText(selected)}</span>
              <span>⭐ Mastery: {selected.masteryText}</span>
              <span>🏹 {selected.shotLimit} shots</span>
              <span>❤️ {selected.lives} rikishi</span>
            </div>
          </div>
          <button disabled={!unlocked} onClick={() => onStart(selected.id)} className="mt-3 w-full rounded-xl bg-[#E74C3C] py-3 font-black text-white shadow-lg disabled:cursor-not-allowed disabled:bg-[#3A3028] disabled:text-[#75685C]">
            {unlocked ? 'Enter Dohyō' : 'Complete the previous bout'}
          </button>
        </div>

        {CAMPAIGN_CHAPTERS.map((chapterTitle, chapterIndex) => (
          <section key={chapterTitle} className="mt-4">
            <div className="mb-2 flex items-center gap-2 px-1">
              <Trophy size={15} className="text-[#D4AF37]"/>
              <h3 className="text-sm font-black text-white">Chapter {chapterIndex + 1}: {chapterTitle}</h3>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {CAMPAIGN_LEVELS.filter((level) => level.chapter === chapterIndex + 1).map((level) => {
                const isUnlocked = level.index <= campaign.highestUnlockedIndex;
                const isSelected = level.id === selected.id;
                const stamps = campaign.stampsByLevel[level.id] ?? 0;
                return (
                  <button key={level.id} disabled={!isUnlocked} onClick={() => setSelectedId(level.id)} className={`min-h-20 rounded-xl border p-2 text-left transition ${isSelected ? 'border-[#FFD700] bg-[#6B3F1D]' : isUnlocked ? 'border-[#4B392C] bg-[#251D17]' : 'border-[#2B241E] bg-[#171411] opacity-55'}`}>
                    <div className="flex items-center justify-between"><span className="text-xs font-black text-white">{level.index + 1}</span>{isUnlocked ? <span className="text-[9px] text-[#FFD700]">{'★'.repeat(stamps)}{'☆'.repeat(3-stamps)}</span> : <Lock size={12} className="text-[#75685C]"/>}</div>
                    <div className="mt-2 line-clamp-2 text-[10px] font-bold leading-tight text-[#D9CCBC]">{level.title}</div>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};
