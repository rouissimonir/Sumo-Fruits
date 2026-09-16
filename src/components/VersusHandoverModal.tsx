import React from 'react';
import { Swords, RotateCw, CheckCircle2, ShieldAlert, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GameStats } from '../game/GameEngine';
import { FRUIT_CATALOG } from '../types/game';

interface VersusHandoverModalProps {
  stats: GameStats;
  onConfirmReady: () => void;
  onToggleTabletop: () => void;
  onTogglePassAndPlay?: () => void;
}

export const VersusHandoverModal: React.FC<VersusHandoverModalProps> = ({
  stats,
  onConfirmReady,
  onToggleTabletop,
  onTogglePassAndPlay,
}) => {
  const versus = stats.versus;
  const isOpen = !(!versus || !versus.isHandoverPending || versus.isMatchOver || stats.isGameOver);

  const isP1 = versus?.playerTurn === 1;
  const playerName = isP1 ? 'Player 1 (East 東方)' : 'Player 2 (West 西方)';
  const playerSub = isP1 ? 'HIGASHI • EAST YOKOZUNA' : 'NISHI • WEST YOKOZUNA';
  const playerColor = isP1 ? '#E74C3C' : '#3498DB';
  const playerBg = isP1 ? 'bg-[#2E1513]' : 'bg-[#132230]';
  const playerBorder = isP1 ? 'border-[#E74C3C]' : 'border-[#3498DB]';
  const playerEmblem = isP1 ? '東' : '西';

  const nextTier = versus ? (isP1 ? versus.p1NextTiers[0] : versus.p2NextTiers[0]) : 1;
  const fruitInfo = FRUIT_CATALOG[nextTier - 1] || FRUIT_CATALOG[0];
  const saltCharges = versus ? (isP1 ? versus.p1SaltCharges : versus.p2SaltCharges) : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md text-[#EDE2D4]"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="versus-handover-title"
            initial={{ scale: 0.84, opacity: 0, y: 22 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.88, opacity: 0, y: 16 }}
            transition={{ type: 'spring', stiffness: 380, damping: 26 }}
            className={`relative w-full max-w-md ${playerBg} border-2 ${playerBorder} rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 text-center space-y-5`}
          >
            {/* Decorative Glow */}
            <div
              className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-30"
              style={{ backgroundColor: playerColor }}
            />

            {/* Turn Handover Header */}
            <div className="relative space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 border border-[#5A4535] text-xs font-black uppercase tracking-widest text-[#FFD700]">
                <Swords size={14} className="text-[#FFD700]" />
                <span>交代 • TURN HANDOVER</span>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <motion.div
                  initial={{ scale: 0, rotate: -15 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 450, damping: 16, delay: 0.05 }}
                  className="w-14 h-14 rounded-2xl text-white font-black text-2xl flex items-center justify-center shadow-lg border-2 border-white/20"
                  style={{ backgroundColor: playerColor }}
                >
                  {playerEmblem}
                </motion.div>
              <div className="text-left">
                <h2 id="versus-handover-title" className="text-2xl sm:text-3xl font-black text-white tracking-wide leading-tight">
                  {playerName}
                </h2>
                <p className="text-[11px] font-bold text-[#A89886] tracking-wider uppercase">
                  {playerSub}
                </p>
              </div>
            </div>
          </div>

          {/* Next Loaded Rikishi Preview Card */}
          <div className="bg-[#181410]/90 border border-[#3E3025] rounded-2xl p-4 text-left space-y-2.5">
            <div className="text-[10px] font-black uppercase tracking-wider text-[#A89886]">
              Loaded Rikishi Ready for Tachiai:
            </div>

            <div className="flex items-center gap-3 bg-[#100C0A] p-2.5 rounded-xl border border-[#2E2018]">
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                className="w-12 h-12 rounded-full border-2 border-white/30 flex items-center justify-center text-lg font-black text-white shadow-md shrink-0"
                style={{ backgroundColor: fruitInfo.color }}
              >
                {nextTier}
              </motion.div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-black text-white text-sm truncate">{fruitInfo.name}</span>
                  <span className="text-xs text-[#FFD700] font-bold">Tier {fruitInfo.tier} Rikishi</span>
                </div>
                <div className="text-[11px] text-[#A89886] mt-0.5">
                  Mass: <span className="text-white font-bold">{fruitInfo.mass}</span> • Radius: <span className="text-white font-bold">{fruitInfo.radius}px</span>
                </div>
              </div>
            </div>

            {/* Salt Status Badge */}
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#140F0D] border border-[#2B1D16] text-xs">
              <span className="text-[#8A7B6D] font-bold flex items-center gap-1">
                <span>🧂</span> Kiyome Salt:
              </span>
              <span
                className={`font-black ${
                  saltCharges > 0 ? 'text-[#2ECC71]' : 'text-[#E67E22]'
                }`}
              >
                {saltCharges > 0 ? 'CHARGED & READY' : 'CHARGING'}
              </span>
            </div>
          </div>

          {/* Tabletop Inversion Toggle */}
          <div className="flex items-center justify-between px-3 py-2 bg-black/30 rounded-xl border border-[#3E3025]">
            <div className="text-left">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <RotateCw size={13} className="text-[#3498DB]" />
                <span>Tabletop 180° Flip</span>
              </div>
              <div className="text-[10px] text-[#8A7B6D]">
                Rotate view for face-to-face device play
              </div>
            </div>
            <motion.button
              id="tabletop-toggle-btn"
              whileTap={{ scale: 0.94 }}
              onClick={onToggleTabletop}
              className={`px-3 py-1 rounded-lg text-xs font-black transition-colors cursor-pointer ${
                versus.tabletopInversion
                  ? 'bg-[#3498DB] text-white shadow-md'
                  : 'bg-[#2A201A] text-[#8A7B6D] hover:text-white border border-[#443226]'
              }`}
            >
              {versus.tabletopInversion ? 'ACTIVE 180°' : 'OFF'}
            </motion.button>
          </div>

          {/* Confirmation Ready Button */}
          <motion.button
            id="versus-handover-ready-btn"
            whileTap={{ scale: 0.96 }}
            whileHover={{ scale: 1.02 }}
            onClick={onConfirmReady}
            className="w-full py-3.5 px-4 rounded-2xl text-white font-black text-base transition-colors shadow-xl cursor-pointer flex items-center justify-center gap-2"
            style={{
              backgroundColor: playerColor,
              boxShadow: `0 4px 20px ${playerColor}55`,
            }}
          >
            <CheckCircle2 size={18} />
            <span>I'M READY • はじめ!</span>
          </motion.button>

          {onTogglePassAndPlay && (
            <button
              id="versus-disable-handover-btn"
              onClick={() => {
                onTogglePassAndPlay();
                onConfirmReady();
              }}
              className="text-[11px] text-[#A89886] hover:text-[#FFD700] transition-colors underline cursor-pointer block w-full text-center"
            >
              Switch to Seamless Continuous Turns (Never Pause)
            </button>
          )}
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
};

