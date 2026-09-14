import React from 'react';
import { X, ShieldCheck, Music, Type, Palette, Lock } from 'lucide-react';

interface LegalCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: 'EN' | 'JA';
}

export const LegalCreditsModal: React.FC<LegalCreditsModalProps> = ({
  isOpen,
  onClose,
  language = 'EN',
}) => {
  if (!isOpen) return null;

  const isJa = language === 'JA';

  return (
    <div
      id="legal-credits-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in"
    >
      <div
        id="legal-credits-modal-card"
        className="relative w-full max-w-lg flex flex-col bg-[#1C1814] border-2 border-[#5A4535] rounded-2xl shadow-2xl overflow-hidden text-[#EDE2D4] max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#3D2E24] bg-[#241E19]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2ECC71]/20 border border-[#2ECC71]/50 flex items-center justify-center text-xl text-[#2ECC71]">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-wide text-white">
                {isJa ? '権利表記・ライセンス確認' : 'Ownership & Asset Licenses'}
              </h2>
              <p className="text-xs text-[#A89886]">
                {isJa ? '商用ライセンス・権利クリアランス情報' : 'Commercial rights & procedural asset certification'}
              </p>
            </div>
          </div>
          <button
            id="legal-credits-close-btn"
            onClick={onClose}
            className="p-2 rounded-xl bg-[#2E241D] hover:bg-[#3D2E24] text-[#A89886] hover:text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Audio & Voices */}
          <div className="bg-[#241E19] border border-[#3D2E24] rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#F1C40F]">
              <Music size={16} />
              <span>{isJa ? '行司音声・太鼓・効果音' : 'Procedural Audio & Referee Voices'}</span>
            </div>
            <p className="text-xs text-[#C8B8A6] leading-relaxed">
              {isJa
                ? 'すべての効果音、太鼓の響き（Taiko）、拍子木（Hyoshigi）、および行司の掛け声（「はっけよい」「残った」等）は、Web Audio APIを用いた完全独自の数学的・プロシージャル合成音です。外部の商用録音素材やサードパーティ音声は一切使用していません。'
                : '100% procedural Web Audio API synthesis. Taiko resonant thumps, Hyoshigi wooden clappers, and multi-formant Gyōji referee shouts ("Hakkeyoi!", "Nokotta!") are synthesized dynamically in real-time. Zero third-party audio recordings or royalty burdens.'}
            </p>
          </div>

          {/* Typography */}
          <div className="bg-[#241E19] border border-[#3D2E24] rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#3498DB]">
              <Type size={16} />
              <span>{isJa ? '書体・漢字カリグラフィ' : 'Typography & Calligraphy'}</span>
            </div>
            <p className="text-xs text-[#C8B8A6] leading-relaxed">
              {isJa
                ? 'OSネイティブの日本語・英語システムフォントスタック、およびHTML5 Canvas上のベクター計算による独自毛筆バッジ描画を使用しています。'
                : 'Native OS font stacks (Hiragino Sans, Noto Sans JP, system sans-serif) coupled with procedural 2D vector brush calligraphic stamps rendered on HTML5 Canvas.'}
            </p>
          </div>

          {/* Artwork */}
          <div className="bg-[#241E19] border border-[#3D2E24] rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#E67E22]">
              <Palette size={16} />
              <span>{isJa ? 'グラフィック・イラスト' : 'Visual Artwork & Vector Sprites'}</span>
            </div>
            <p className="text-xs text-[#C8B8A6] leading-relaxed">
              {isJa
                ? 'フルーツ力士、勝負俵、砂土俵、締め込みの回し、清め塩の結晶など、すべてのビジュアル要素はオリジナル数学コードにより描画されています。'
                : 'All fruit rikishi sprites, sacred dohyō clay texturing, straw bales (Tawara), and mawashi physics are mathematically drawn on HTML5 Canvas. MIT licensed original code.'}
            </p>
          </div>

          {/* Privacy & App Store Compliance */}
          <div className="bg-[#241E19] border border-[#3D2E24] rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#2ECC71]">
              <Lock size={16} />
              <span>{isJa ? 'プライバシー・データ通信宣言' : 'App Store Privacy & Zero Telemetry'}</span>
            </div>
            <p className="text-xs text-[#C8B8A6] leading-relaxed">
              {isJa
                ? '完全オフライン動作。外部サーバーへの通信、ユーザー追跡、広告SDK、分析トラッカーは一切組み込まれていません。すべてのセーブデータは端末ローカルに安全に保存されます。'
                : '100% offline-ready. No network tracking, no ad networks, no analytics trackers. All high scores, daily basho records, and preferences are stored exclusively on-device in LocalStorage.'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-[#3D2E24] bg-[#241E19] flex items-center justify-between">
          <span className="text-xs text-[#8A7B6D]">MIT License • 2026 Sumo Fruits</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#3E3125] hover:bg-[#5A4535] text-white text-xs font-bold transition-all cursor-pointer"
          >
            {isJa ? '閉じる' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
