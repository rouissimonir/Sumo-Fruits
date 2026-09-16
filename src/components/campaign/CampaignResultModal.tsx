import React from 'react';
import { Gift, Map, RotateCcw, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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

export const CampaignResultModal: React.FC<Props> = ({
  campaign,
  score,
  onRetry,
  onNext,
  onEquipAndNext,
  onMap,
}) => {
  const result = campaign.result;
  const isVisible = !!(result && campaign.activeLevelId);
  const won = result?.status === 'WON';
  const level = CAMPAIGN_LEVELS[campaign.activeLevelIndex] || CAMPAIGN_LEVELS[0];
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
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ scale: 0.82, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.88, opacity: 0, y: 16 }}
            transition={{ type: 'spring', stiffness: 380, damping: 26 }}
            className={`w-full max-w-sm rounded-2xl border-2 bg-[#1C1814] p-5 text-center shadow-2xl ${
              won ? 'border-[#D4AF37] shadow-[0_0_40px_rgba(212,175,55,0.25)]' : 'border-[#E74C3C] shadow-[0_0_40px_rgba(231,76,60,0.25)]'
            }`}
          >
            {/* Animated Header Badge */}
            <motion.div
              initial={{ scale: 0, rotate: won ? -15 : 15 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 450, damping: 18, delay: 0.08 }}
              className="text-4xl"
            >
              {won ? '🏆' : '🥋'}
            </motion.div>

          <div className={`mt-2 text-[10px] font-black uppercase tracking-[0.2em] ${won ? 'text-[#FFD700]' : 'text-[#E74C3C]'}`}>
            Bout {campaign.activeLevelIndex + 1}
          </div>

          <motion.h2
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="mt-1 text-2xl font-black text-white"
          >
            {won ? 'Victory!' : 'Bout Lost'}
          </motion.h2>

          <p className="mt-1 text-sm text-[#BAAA98]">{result.reason}</p>

          <div className="mt-4 rounded-xl border border-[#44362B] bg-[#241E19] p-3">
            <div className="flex justify-between text-xs text-[#A89886]">
              <span>{level.title}</span>
              <strong className="text-[#FFD700]">{score.toLocaleString()} pts</strong>
            </div>

            {/* Staggered Stars Celebration */}
            {won && (
              <div className="mt-3 flex justify-center gap-3">
                {[0, 1, 2].map((i) => {
                  const earned = i < result.earnedStamps;
                  return (
                    <motion.div
                      key={i}
                      initial={{ scale: 0, rotate: -25 }}
                      animate={earned ? { scale: [0, 1.35, 1], rotate: 0 } : { scale: 1, rotate: 0 }}
                      transition={{
                        delay: 0.22 + i * 0.14,
                        type: 'spring',
                        stiffness: 420,
                        damping: 14,
                      }}
                    >
                      <Star
                        size={30}
                        className={
                          earned
                            ? 'fill-[#FFD700] text-[#FFD700] drop-shadow-[0_0_10px_rgba(255,215,0,0.7)]'
                            : 'text-[#4A3D31]'
                        }
                      />
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Unlocked Reward Banner */}
            {won && reward && (
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.45, type: 'spring', stiffness: 350, damping: 20 }}
                className="mt-3 flex items-center gap-3 rounded-xl border border-[#D4AF37]/45 bg-[#D4AF37]/10 p-2.5 text-left"
              >
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-lg text-2xl shadow-md"
                  style={{ backgroundColor: reward.previewColor }}
                >
                  {reward.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-[#FFD700]">
                    <Gift size={11} />
                    {result.unlockedRewardId ? 'Prize unlocked' : 'Prize owned'}
                  </span>
                  <strong className="block truncate text-sm text-white">{reward.name}</strong>
                  <span className="block text-[10px] leading-tight text-[#CDBDAA]">{reward.description}</span>
                </span>
              </motion.div>
            )}

            {won && reward && nextPrize && nextPrizeLevel && (
              <div className="mt-2 flex items-center justify-between rounded-lg border border-[#49382C] bg-[#15110E] px-2.5 py-2 text-left">
                <span className="min-w-0">
                  <span className="block text-[8px] font-black uppercase tracking-wider text-[#A89886]">Next prize</span>
                  <strong className="block truncate text-[11px] text-white">
                    {nextPrize.icon} {nextPrize.name}
                  </strong>
                </span>
                <span className="shrink-0 pl-2 text-[9px] font-bold text-[#D4AF37]">
                  BOUT {nextPrizeLevel.index + 1}
                </span>
              </div>
            )}
          </div>

          {/* Primary & Secondary Action Buttons with Tactile Spring Presses */}
          {won && hasNext && reward && !rewardEquipped ? (
            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => onEquipAndNext(reward.id)}
              className="mt-4 w-full cursor-pointer rounded-xl bg-[#D4AF37] py-3 font-black text-[#24170A] shadow-lg transition-colors hover:bg-[#E5C148]"
            >
              Equip &amp; Continue
            </motion.button>
          ) : won && hasNext ? (
            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.02 }}
              onClick={onNext}
              className="mt-4 w-full cursor-pointer rounded-xl bg-[#E74C3C] py-3 font-black text-white shadow-lg transition-colors hover:bg-[#F05A4A]"
            >
              Next Bout
            </motion.button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.02 }}
              onClick={onRetry}
              className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#E74C3C] py-3 font-black text-white shadow-lg transition-colors hover:bg-[#F05A4A]"
            >
              <RotateCcw size={17} />
              Retry
            </motion.button>
          )}

          {won && hasNext && reward && !rewardEquipped && (
            <button
              onClick={onNext}
              className="mt-2 cursor-pointer text-[11px] font-bold text-[#BAAA98] underline underline-offset-2 transition-colors hover:text-white"
            >
              Continue without equipping
            </button>
          )}

          <div className="mt-2 grid grid-cols-2 gap-2">
            {won && hasNext && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onRetry}
                className="cursor-pointer rounded-xl border border-[#49382C] bg-[#282019] py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#382B22]"
              >
                Replay
              </motion.button>
            )}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onMap}
              className={`flex cursor-pointer items-center justify-center gap-1 rounded-xl border border-[#49382C] bg-[#282019] py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#382B22] ${
                !won || !hasNext ? 'col-span-2' : ''
              }`}
            >
              <Map size={15} />
              Career Map
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
};

