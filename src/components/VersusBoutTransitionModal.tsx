import React from 'react';
import { ArrowRight, Swords, Trophy } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { VersusState } from '../types/game';

interface VersusBoutTransitionModalProps {
  versus: VersusState;
  onContinue: () => void;
}

export const VersusBoutTransitionModal: React.FC<VersusBoutTransitionModalProps> = ({
  versus,
  onContinue,
}) => {
  const result = versus.lastBoutResult;
  const isOpen = versus.boutTransitionPending && !versus.isMatchOver && result !== null;
  const winnerIsP1 = result?.winner === 1;
  const winnerColor = winnerIsP1 ? '#E74C3C' : '#3498DB';
  const winnerLabel = winnerIsP1 ? 'P1 EAST • 東' : 'P2 WEST • 西';

  return (
    <AnimatePresence>
      {isOpen && result && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/72 p-4 text-[#EDE2D4] backdrop-blur-sm"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="versus-bout-result-title"
            initial={{ scale: 0.88, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 12 }}
            transition={{ type: 'spring', stiffness: 360, damping: 27 }}
            className="relative w-full max-w-sm overflow-hidden rounded-3xl border-2 bg-[#18130F] p-5 text-center shadow-2xl sm:p-7"
            style={{ borderColor: winnerColor, boxShadow: `0 0 36px ${winnerColor}45` }}
          >
            <div
              className="pointer-events-none absolute -top-24 left-1/2 h-52 w-52 -translate-x-1/2 rounded-full opacity-25 blur-3xl"
              style={{ backgroundColor: winnerColor }}
            />

            <div className="relative space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#FFD700]/60 bg-[#2A211B] text-[#FFD700] shadow-lg">
                <Trophy size={28} />
              </div>

              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.24em] text-[#FFD700]">
                  勝負あり • Bout {result.bout} complete
                </div>
                <h2 id="versus-bout-result-title" className="mt-2 text-2xl font-black text-white">
                  {winnerLabel} wins
                </h2>
                <p className="mt-1 text-sm font-bold" style={{ color: winnerColor }}>
                  {result.methodJp} • {result.method}
                </p>
              </div>

              <div className="rounded-2xl border border-[#3E3025] bg-black/35 p-4">
                <div className="mb-3 text-[10px] font-black uppercase tracking-widest text-[#9E8C7A]">
                  Best of {versus.maxRounds} • First to {Math.ceil(versus.maxRounds / 2)}
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <div>
                    <div className="text-xs font-black text-[#E74C3C]">P1 EAST</div>
                    <div className="text-3xl font-black text-white">{versus.p1RoundsWon}</div>
                  </div>
                  <Swords size={20} className="text-[#6F5B4A]" />
                  <div>
                    <div className="text-xs font-black text-[#3498DB]">P2 WEST</div>
                    <div className="text-3xl font-black text-white">{versus.p2RoundsWon}</div>
                  </div>
                </div>
              </div>

              <p className="text-xs leading-relaxed text-[#A89886]">
                The dohyō resets between bouts. Match wins and bout history stay saved.
              </p>

              <motion.button
                id="versus-next-bout-btn"
                whileTap={{ scale: 0.96 }}
                onClick={onContinue}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl py-3.5 text-base font-black text-white shadow-xl"
                style={{ backgroundColor: winnerColor }}
              >
                <span>START BOUT {versus.currentBout}</span>
                <ArrowRight size={19} />
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
