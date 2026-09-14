import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Check, Sparkles } from 'lucide-react';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  language?: 'EN' | 'JA';
}

interface TutorialStep {
  id: string;
  badgeEn: string;
  badgeJa: string;
  kanji: string;
  titleEn: string;
  titleJa: string;
  icon: string;
  color: string;
  bodyEn: string;
  bodyJa: string;
  keyPointsEn: string[];
  keyPointsJa: string[];
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'launch',
    badgeEn: 'Step 1 of 5: Tachiai Launch',
    badgeJa: '第1歩：立合い発射',
    kanji: '立合',
    titleEn: 'Tachiai Slingshot Launch',
    titleJa: '立合いスリングショット',
    icon: '🎯',
    color: '#E67E22',
    bodyEn: 'Touch and drag backwards from your loaded fruit rikishi at the bottom pedestal. Aim into the sacred clay Dohyō ring and release to charge forward with full momentum!',
    bodyJa: '土俵手前の台座からフルーツ力士を後ろへ引き、狙いを定めて指を離します。勢いよく土俵へ突進しましょう！',
    keyPointsEn: [
      'Pull further back for higher speed and stronger impact force',
      'The glowing trajectory line forecasts your initial flight path',
      'Release cleanly to propel your fruit onto the clay bowl'
    ],
    keyPointsJa: [
      '大きく引くほど初速と衝撃力が増加',
      '軌道ガイド線で突進コースを予測',
      '指を離して土俵へ勢いよく突入'
    ]
  },
  {
    id: 'spin',
    badgeEn: 'Step 2 of 5: Gyōji Sidespin',
    badgeJa: '第2歩：変化・英語スピン',
    kanji: '変化',
    titleEn: 'English Curve & Sidespin',
    titleJa: 'カーブ・英語スピン',
    icon: '🌀',
    color: '#3498DB',
    bodyEn: 'Bend your shots around defensive fruit obstacles using English sidespin! Toggle Straight, Curve Left, or Curve Right buttons — or drag with a 2nd finger anywhere on screen.',
    bodyJa: '障害物を避けるために変化（カーブスピン）を活用！「左変化」「直進」「右変化」ボタン、または画面を2本目の指でスライドして軌道を曲げられます。',
    keyPointsEn: [
      '↺ Left Curve bends counter-clockwise around rightward barriers',
      '↻ Right Curve bends clockwise into tight tactical gaps',
      'Sidespin clears immediately on your first physical fruit collision'
    ],
    keyPointsJa: [
      '↺ 左変化で時計と逆回りに鋭く旋回',
      '↻ 右変化で障害物の隙間へ回り込み',
      '最初の接触時にスピンが自然に解放'
    ]
  },
  {
    id: 'merges',
    badgeEn: 'Step 3 of 5: Transactional Merges',
    badgeJa: '第3歩：合体進化・連鎖',
    kanji: '合体',
    titleEn: 'Sumo Merging & Combo Hype',
    titleJa: 'ぶつかり合体とコンボ熱狂',
    icon: '💥',
    color: '#F1C40F',
    bodyEn: 'When two fruits of the same tier collide, they fuse into a heavier, higher-ranking sumo rikishi! Chain consecutive merges to build the crowd hype multiplier up to 3.0x.',
    bodyJa: '同じ階級のフルーツ同士が衝突すると、1つ上の重い番付力士へ合体進化！連続合体で観客の熱狂倍率が最大3.0倍まで上昇します。',
    keyPointsEn: [
      '11 unique fruit ranks from Cherry (Jonokuchi) to Yokozuna Pineapple',
      'Same-tier clashes trigger dramatic Tsuppari slap showdowns',
      'Yokozuna synthesis unleashes celebratory gold confetti & stage blast'
    ],
    keyPointsJa: [
      '序ノ口チェリーから横綱パイナップルまで全11階級',
      '同格同士の激突で突っ張りクラッシュが発生',
      '横綱誕生で金吹雪が舞い散る特別演出'
    ]
  },
  {
    id: 'hazards',
    badgeEn: 'Step 4 of 5: Hazards & Salt',
    badgeJa: '第4歩：障害物と清め塩',
    kanji: '清塩',
    titleEn: 'Hazards & Kiyome Salt',
    titleJa: '土俵ハザードと清めの塩',
    icon: '🧂',
    color: '#9B59B6',
    bodyEn: 'Watch out for slippery Ice patches, sticky Wasabi sludge, and wild Chili rockets! Tap the [S] Salt button to cast sacred Kiyome-no-Shio, purifying nearby hazard traps.',
    bodyJa: '滑る氷、ネバネバの山葵（ワサビ）、暴走唐辛子に注意！「清め塩」ボタン（または[S]キー）で塩を撒き、障害物を浄化・消滅させましょう。',
    keyPointsEn: [
      'Wasabi puddles slow fruits down until squashed or salted',
      'Chili peppers rocket across the ring upon direct impact',
      'Salt charges recharge every 6 committed launches'
    ],
    keyPointsJa: [
      '山葵は接触で減速するが、塩で即座に浄化可能',
      '唐辛子は激突すると猛スピードで暴走',
      '清め塩は6回の発射ごとに自動補充'
    ]
  },
  {
    id: 'ringout',
    badgeEn: 'Step 5 of 5: Tawara Rim & Ring-Outs',
    badgeJa: '第5歩：俵・土俵際・金星',
    kanji: '勝星',
    titleEn: 'Straw Bales & Ring-Outs',
    titleJa: '俵・土俵際・押し出し',
    icon: '🌾',
    color: '#2ECC71',
    bodyEn: 'The outer 16 straw bales (Tawara) keep your fruits inside the bowl. Heavy impacts damage the bales — if broken, fruits will plunge off the cliff! Push rival rikishi out to claim Kinboshi victory.',
    bodyJa: '外周の16個の勝負俵が力士の転落を防ぎます。強打で俵が壊れると転落の危険に！ライバル力士を土俵外へ押し出せば「金星」勝利となります。',
    keyPointsEn: [
      'Ring-out triggers strictly when a fruit exits over the boundary rim',
      'Staging and launching through the bottom area is 100% safe',
      'In 2P Versus, pushing out an opponent score bonus points & bout wins'
    ],
    keyPointsJa: [
      '土俵内から外へ押し出された時のみ転落（リングアウト）判定',
      '手前の発射台エリアでは転落しません',
      '2P対戦では相手の力士を押し出すと大量得点獲得'
    ]
  }
];

export const TutorialModal: React.FC<TutorialModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  language = 'EN',
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  if (!isOpen) return null;

  const isJa = language === 'JA';
  const step = TUTORIAL_STEPS[currentStepIndex];
  const isLast = currentStepIndex === TUTORIAL_STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      onComplete();
      onClose();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
  };

  const handleSkip = () => {
    onComplete();
    onClose();
  };

  return (
    <div
      id="tutorial-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in"
    >
      <div
        id="tutorial-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutorial-modal-title"
        className="relative w-full max-w-lg flex flex-col bg-[#1C1814] border-2 border-[#5A4535] rounded-2xl shadow-2xl overflow-hidden text-[#EDE2D4]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#3D2E24] bg-[#241E19]">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-inner font-black"
              style={{ backgroundColor: `${step.color}25`, color: step.color, border: `1px solid ${step.color}60` }}
            >
              {step.kanji}
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#A89886]">
                {isJa ? step.badgeJa : step.badgeEn}
              </div>
              <h2 id="tutorial-modal-title" className="text-lg font-black tracking-wide text-white">
                {isJa ? step.titleJa : step.titleEn}
              </h2>
            </div>
          </div>
          <button
            id="tutorial-close-btn"
            onClick={handleSkip}
            className="p-2 rounded-xl bg-[#2E241D] hover:bg-[#3D2E24] text-[#A89886] hover:text-white transition-colors cursor-pointer"
            aria-label="Close tutorial"
          >
            <X size={20} />
          </button>
        </div>

        {/* Step Visual & Body Content */}
        <div className="p-5 space-y-4 overflow-y-auto max-h-[65vh]">
          {/* Step Hero Visual Card */}
          <div
            className="p-4 rounded-xl border flex items-start gap-4 transition-all"
            style={{
              backgroundColor: `${step.color}12`,
              borderColor: `${step.color}40`,
            }}
          >
            <div
              className="text-4xl p-3 rounded-2xl shrink-0 shadow-lg"
              style={{ backgroundColor: `${step.color}20` }}
            >
              {step.icon}
            </div>
            <div className="space-y-1.5 min-w-0">
              <p className="text-sm text-[#F5EDE3] leading-relaxed">
                {isJa ? step.bodyJa : step.bodyEn}
              </p>
            </div>
          </div>

          {/* Key Rule Bullets */}
          <div className="bg-[#241E19] border border-[#3D2E24] rounded-xl p-4 space-y-2.5">
            <div className="text-xs font-bold uppercase tracking-wider text-[#FFD700] flex items-center gap-1.5">
              <Sparkles size={14} />
              <span>{isJa ? '必勝の極意' : 'Key Sumo Mechanics'}</span>
            </div>
            <ul className="space-y-2 text-xs text-[#D8C7B5]">
              {(isJa ? step.keyPointsJa : step.keyPointsEn).map((point, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span
                    className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                    style={{ backgroundColor: step.color }}
                  />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Step Progress Indicator Dots */}
          <div className="flex items-center justify-center gap-2 pt-2">
            {TUTORIAL_STEPS.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => setCurrentStepIndex(idx)}
                className={`h-2.5 rounded-full transition-all cursor-pointer ${
                  idx === currentStepIndex
                    ? 'w-7 bg-[#FFD700]'
                    : 'w-2.5 bg-[#44362B] hover:bg-[#6B533E]'
                }`}
                aria-label={`Go to step ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="px-5 py-3.5 border-t border-[#3D2E24] bg-[#241E19] flex items-center justify-between">
          <button
            id="tutorial-prev-btn"
            onClick={handlePrev}
            disabled={currentStepIndex === 0}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              currentStepIndex === 0
                ? 'opacity-30 border-transparent text-[#6B5A4B] cursor-not-allowed'
                : 'bg-[#2E241D] hover:bg-[#3D2E24] border-[#4B392C] text-[#D8C7B5]'
            }`}
          >
            <ChevronLeft size={16} />
            <span>{isJa ? '前へ' : 'Previous'}</span>
          </button>

          <button
            id="tutorial-skip-btn"
            onClick={handleSkip}
            className="text-xs text-[#A89886] hover:text-[#FFD700] transition-colors cursor-pointer px-2 py-1"
          >
            {isJa ? 'スキップして開始' : 'Skip Tutorial'}
          </button>

          <button
            id="tutorial-next-btn"
            onClick={handleNext}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#E67E22] hover:bg-[#F39C12] text-white text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            <span>{isLast ? (isJa ? '稽古完了！' : 'Start Playing!') : (isJa ? '次へ' : 'Next Step')}</span>
            {isLast ? <Check size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
};
