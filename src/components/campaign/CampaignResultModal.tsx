import React from 'react';
import { ChevronRight, Gift, Map, RotateCcw, Sparkles, Star } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { CAMPAIGN_LEVELS } from '../../content/campaign';
import { CampaignSnapshot } from '../../types/campaign';
import { REWARD_DEFINITIONS, RewardId } from '../../types/rewards';

interface Props {
  campaign: CampaignSnapshot;
  score: number;
  onRetry: () => void;
  onNext: () => void;
  onEquipAndNext: (rewardId: RewardId) => void;
  onMap: () => void;
}

function MawashiMedallion({ mawashiColor, accentColor }: { mawashiColor: string; accentColor: string }): React.ReactElement {
  return (
    <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-full border-2 bg-[#0C1727] shadow-[0_0_30px_rgba(246,196,83,0.48)]" style={{ borderColor: accentColor }}>
      <div className="absolute inset-2 rounded-full border" style={{ borderColor: accentColor }} />
      <div className="relative h-9 w-16 rounded-[45%] border-[5px] shadow-inner" style={{ borderColor: accentColor, backgroundColor: mawashiColor }}>
        <div className="absolute left-1/2 top-5 h-8 w-5 -translate-x-1/2 rounded-b-md border-x-2 border-b-2" style={{ borderColor: accentColor, backgroundColor: mawashiColor }} />
      </div>
    </div>
  );
}

export const CampaignResultModal: React.FC<Props> = ({ campaign, score, onRetry, onNext, onEquipAndNext, onMap }) => {
  const result = campaign.result;
  const isVisible = !!(result && campaign.activeLevelId);
  const won = result?.status === 'WON';
  const level = CAMPAIGN_LEVELS[campaign.activeLevelIndex] || CAMPAIGN_LEVELS[0];
  const hasNext = campaign.activeLevelIndex < CAMPAIGN_LEVELS.length - 1;
  const rewardId = won ? level.rewardId : undefined;
  const reward = rewardId ? REWARD_DEFINITIONS[rewardId] : null;
  const rewardEquipped = reward ? campaign.equippedRewards[reward.slot] === reward.id : false;
  const isFreshReward = !!result?.unlockedRewardId && result.unlockedRewardId === rewardId;
  const nextPrizeLevel = won
    ? CAMPAIGN_LEVELS.slice(campaign.activeLevelIndex + 1).find((candidate) => candidate.rewardId && !campaign.unlockedRewardIds.includes(candidate.rewardId))
    : undefined;
  const nextPrize = nextPrizeLevel?.rewardId ? REWARD_DEFINITIONS[nextPrizeLevel.rewardId] : null;

  const LostResult = () => (
    <div className="p-5">
      <div className="text-4xl">🥋</div>
      <div className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#E74C3C]">Bout {campaign.activeLevelIndex + 1}</div>
      <h2 className="mt-1 text-2xl font-black text-white">Bout Lost</h2>
      <p className="mt-1 text-sm text-[#BAAA98]">{result?.reason}</p>
      <motion.button whileTap={{ scale: 0.95 }} onClick={onRetry} className="mt-5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#E74C3C] py-3 font-black text-white shadow-lg"><RotateCcw size={17} /> Retry</motion.button>
      <motion.button whileTap={{ scale: 0.95 }} onClick={onMap} className="mt-2 flex w-full cursor-pointer items-center justify-center gap-1 rounded-xl border border-[#49382C] bg-[#282019] py-2.5 text-xs font-bold text-white"><Map size={15} /> Career Map</motion.button>
    </div>
  );

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }} className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <motion.div role="dialog" aria-modal="true" initial={{ scale: 0.82, opacity: 0, y: 24 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.88, opacity: 0, y: 16 }} transition={{ type: 'spring', stiffness: 380, damping: 26 }} className={'w-full max-w-sm overflow-hidden rounded-2xl border-2 bg-[#1C1814] text-center shadow-2xl ' + (won ? 'border-[#D4AF37] shadow-[0_0_40px_rgba(212,175,55,0.25)]' : 'border-[#E74C3C] shadow-[0_0_40px_rgba(231,76,60,0.25)]')}>
            {won && reward ? (
              <>
                <div className="relative overflow-hidden border-b border-[#D4AF37]/45 bg-[radial-gradient(circle_at_50%_120%,#5E3816_0%,#25170F_48%,#130F0C_100%)] px-5 pb-5 pt-4">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#FFE09A] to-transparent" />
                  <div className="flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#F6C453]"><Sparkles size={13} /> Road to Yokozuna <Sparkles size={13} /></div>
                  <div className="mt-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#D6C3A9]">Bout {campaign.activeLevelIndex + 1} cleared</div>
                  <h2 className="mt-1 text-2xl font-black tracking-tight text-[#FFF5DF]">Climb to Yokozuna</h2>
                  <p className="mt-1 text-xs text-[#CDBDAA]">{level.title} · {score.toLocaleString()} pts</p>
                  <motion.div initial={{ scale: 0.55, opacity: 0, rotate: -10 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 330, damping: 18, delay: 0.14 }} className="mt-4"><MawashiMedallion mawashiColor={reward.mawashiColor ?? reward.previewColor} accentColor={reward.accentColor} /></motion.div>
                </div>
                <div className="p-4">
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }} className="rounded-2xl border border-[#D4AF37]/55 bg-[#15110E] p-3">
                    <div className="flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#FFD700]"><Gift size={13} /> {isFreshReward ? 'New prize unlocked' : 'Prize owned'}</div>
                    <div className="mt-1 text-lg font-black text-white">{reward.name}</div>
                    <p className="mx-auto mt-1 max-w-[17rem] text-[11px] leading-snug text-[#CDBDAA]">{reward.description}</p>
                  </motion.div>
                  <div className="mt-3 rounded-xl border border-[#44362B] bg-[#241E19] p-3">
                    <div className="flex justify-between text-xs text-[#A89886]"><span>Victory stamps</span><strong className="text-[#FFD700]">{result?.earnedStamps ?? 0}/3</strong></div>
                    <div className="mt-2 flex justify-center gap-3">{[0, 1, 2].map((index) => <Star key={index} size={27} className={index < (result?.earnedStamps ?? 0) ? 'fill-[#FFD700] text-[#FFD700] drop-shadow-[0_0_8px_rgba(255,215,0,0.7)]' : 'text-[#4A3D31]'} />)}</div>
                    {nextPrize && nextPrizeLevel && <div className="mt-3 flex items-center justify-between rounded-lg border border-[#49382C] bg-[#15110E] px-2.5 py-2 text-left"><span className="min-w-0"><span className="block text-[8px] font-black uppercase tracking-wider text-[#A89886]">Next prize</span><strong className="block truncate text-[11px] text-white">{nextPrize.icon} {nextPrize.name}</strong></span><span className="shrink-0 pl-2 text-[9px] font-bold text-[#D4AF37]">BOUT {nextPrizeLevel.index + 1}</span></div>}
                  </div>
                  {hasNext && !rewardEquipped ? <motion.button whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02 }} onClick={() => onEquipAndNext(reward.id)} className="mt-4 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-[#D4AF37] py-3 font-black text-[#24170A] shadow-lg transition-colors hover:bg-[#E5C148]">Equip &amp; Continue <ChevronRight size={17} /></motion.button> : hasNext ? <motion.button whileTap={{ scale: 0.95 }} onClick={onNext} className="mt-4 w-full cursor-pointer rounded-xl bg-[#E74C3C] py-3 font-black text-white shadow-lg">Next Bout</motion.button> : null}
                  {hasNext && !rewardEquipped && <button onClick={onNext} className="mt-2 cursor-pointer text-[11px] font-bold text-[#BAAA98] underline underline-offset-2 hover:text-white">Continue without equipping</button>}
                  <div className="mt-3 grid grid-cols-2 gap-2"><motion.button whileTap={{ scale: 0.95 }} onClick={onRetry} className="cursor-pointer rounded-xl border border-[#49382C] bg-[#282019] py-2.5 text-xs font-bold text-white">Replay</motion.button><motion.button whileTap={{ scale: 0.95 }} onClick={onMap} className="flex cursor-pointer items-center justify-center gap-1 rounded-xl border border-[#49382C] bg-[#282019] py-2.5 text-xs font-bold text-white"><Map size={15} /> Career Map</motion.button></div>
                </div>
              </>
            ) : <LostResult />}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
