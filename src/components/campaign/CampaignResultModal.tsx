import React from 'react';
import { Gift, Map, RotateCcw, Star } from 'lucide-react';
import { CAMPAIGN_LEVELS } from '../../content/campaign';
import { CampaignSnapshot } from '../../types/campaign';
import { REWARD_DEFINITIONS, RewardId } from '../../types/rewards';

interface Props { campaign: CampaignSnapshot; score: number; onRetry: () => void; onNext: () => void; onEquipAndNext: (rewardId: RewardId) => void; onMap: () => void; }

export const CampaignResultModal: React.FC<Props> = ({ campaign, score, onRetry, onNext, onEquipAndNext, onMap }) => {
  const result = campaign.result;
  if (!result || !campaign.activeLevelId) return null;
  const won = result.status === 'WON';
  const level = CAMPAIGN_LEVELS[campaign.activeLevelIndex];
  const hasNext = campaign.activeLevelIndex < CAMPAIGN_LEVELS.length - 1;
  const rewardId = won ? level.rewardId : undefined;
  const reward = rewardId ? REWARD_DEFINITIONS[rewardId] : null;
  const rewardEquipped = reward ? campaign.equippedRewards[reward.slot] === reward.id : false;
  const nextPrizeLevel = won
    ? CAMPAIGN_LEVELS.slice(campaign.activeLevelIndex + 1).find((candidate) =>
        candidate.rewardId && !campaign.unlockedRewardIds.includes(candidate.rewardId)
      )
    : undefined;
  const nextPrize = nextPrizeLevel?.rewardId ? REWARD_DEFINITIONS[nextPrizeLevel.rewardId] : null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
      <div role="dialog" aria-modal="true" className={`w-full max-w-sm rounded-2xl border-2 bg-[#1C1814] p-5 text-center shadow-2xl ${won ? 'border-[#D4AF37]' : 'border-[#E74C3C]'}`}>
        <div className="text-4xl">{won ? '🏆' : '🥋'}</div>
        <div className={`mt-2 text-[10px] font-black uppercase tracking-[0.2em] ${won ? 'text-[#FFD700]' : 'text-[#E74C3C]'}`}>Bout {campaign.activeLevelIndex + 1}</div>
        <h2 className="mt-1 text-2xl font-black text-white">{won ? 'Victory!' : 'Bout Lost'}</h2>
        <p className="mt-1 text-sm text-[#BAAA98]">{result.reason}</p>
        <div className="mt-4 rounded-xl border border-[#44362B] bg-[#241E19] p-3">
          <div className="flex justify-between text-xs text-[#A89886]"><span>{level.title}</span><strong className="text-[#FFD700]">{score.toLocaleString()} pts</strong></div>
          {won && <div className="mt-3 flex justify-center gap-2">{[0,1,2].map((i) => <Star key={i} size={28} className={i < result.earnedStamps ? 'fill-[#FFD700] text-[#FFD700]' : 'text-[#4A3D31]'}/>)}</div>}
          {won && reward && <div className="mt-3 flex items-center gap-3 rounded-xl border border-[#D4AF37]/45 bg-[#D4AF37]/10 p-2.5 text-left">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg text-2xl" style={{ backgroundColor: reward.previewColor }}>{reward.icon}</span>
            <span className="min-w-0 flex-1"><span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-[#FFD700]"><Gift size={11}/>{result.unlockedRewardId ? 'Prize unlocked' : 'Prize owned'}</span><strong className="block truncate text-sm text-white">{reward.name}</strong><span className="block text-[10px] leading-tight text-[#CDBDAA]">{reward.description}</span></span>
          </div>}
          {won && reward && nextPrize && nextPrizeLevel && <div className="mt-2 flex items-center justify-between rounded-lg border border-[#49382C] bg-[#15110E] px-2.5 py-2 text-left">
            <span className="min-w-0"><span className="block text-[8px] font-black uppercase tracking-wider text-[#A89886]">Next prize</span><strong className="block truncate text-[11px] text-white">{nextPrize.icon} {nextPrize.name}</strong></span>
            <span className="shrink-0 pl-2 text-[9px] font-bold text-[#D4AF37]">BOUT {nextPrizeLevel.index + 1}</span>
          </div>}
        </div>
        {won && hasNext && reward && !rewardEquipped ? <button onClick={() => onEquipAndNext(reward.id)} className="mt-4 w-full rounded-xl bg-[#D4AF37] py-3 font-black text-[#24170A]">Equip &amp; Continue</button> : won && hasNext ? <button onClick={onNext} className="mt-4 w-full rounded-xl bg-[#E74C3C] py-3 font-black text-white">Next Bout</button> : <button onClick={onRetry} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#E74C3C] py-3 font-black text-white"><RotateCcw size={17}/>Retry</button>}
        {won && hasNext && reward && !rewardEquipped && <button onClick={onNext} className="mt-2 text-[11px] font-bold text-[#BAAA98] underline underline-offset-2">Continue without equipping</button>}
        <div className="mt-2 grid grid-cols-2 gap-2">
          {won && hasNext && <button onClick={onRetry} className="rounded-xl border border-[#49382C] bg-[#282019] py-2.5 text-xs font-bold text-white">Replay</button>}
          <button onClick={onMap} className={`flex items-center justify-center gap-1 rounded-xl border border-[#49382C] bg-[#282019] py-2.5 text-xs font-bold text-white ${!won || !hasNext ? 'col-span-2' : ''}`}><Map size={15}/>Career Map</button>
        </div>
      </div>
    </div>
  );
};
