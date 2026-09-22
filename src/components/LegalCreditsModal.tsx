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
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-credits-modal-title"
        className="relative w-full max-w-lg flex flex-col bg-[#1C1814] border-2 border-[#5A4535] rounded-2xl shadow-2xl overflow-hidden text-[#EDE2D4] max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#3D2E24] bg-[#241E19]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2ECC71]/20 border border-[#2ECC71]/50 flex items-center justify-center text-xl text-[#2ECC71]">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 id="legal-credits-modal-title" className="text-lg font-black tracking-wide text-white">
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
                  ? '太鼓、拍子木、衝突音、行司の掛け声はリアルタイムで合成しています。BGM：Shamisen music III収録「New spring」（ループ版）、作者：Shamisen music。ゲーム用BGMとしてライセンスに基づき使用しています。'
                  : 'Taiko, wooden clappers, impacts and referee calls are synthesized in real time. Background music: New spring (loop), from Shamisen music III by Shamisen music, used as licensed game background music.'}
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
                : 'All fruit rikishi sprites, sacred dohyō clay texturing, straw bales (Tawara), and mawashi physics are original procedural artwork drawn on HTML5 Canvas.'}
            </p>
          </div>

          {/* Trademarks & Cultural Authenticity */}
          <div className="bg-[#241E19] border border-[#3D2E24] rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#9B59B6]">
              <ShieldCheck size={16} />
              <span>{isJa ? '伝統文化・商標クリアランス (Apple 5.2 準拠)' : 'Cultural Heritage & Trademarks (Apple Guideline 5.2)'}</span>
            </div>
            <p className="text-xs text-[#C8B8A6] leading-relaxed">
              {isJa
                ? '本作に登場する大相撲用語（横綱、大関、行司、軍配、土俵、俵、水引幕、四股名、および「はっけよい」「残った」などの掛け声）は、数百年以上の歴史を有する日本の伝統神事・国技文化に基づくパブリックドメインの概念です。特定の商業団体や日本相撲協会の登録商標を侵害するものではなく、商業提携を示すものではありません。'
                : 'All sumo references—including ranks (Yokozuna, Ozeki, Sekiwake, Komusubi, Maegashira), referee terminology (Hakkeyoi, Nokotta, Gyoji, Gunbai), arena architecture (Dohyo, Tawara, Shimenawa, Salt), and 8 Kimarite techniques—are centuries-old traditional Japanese cultural concepts belonging to the public domain. Sumo Fruits is an independent artistic arcade game with zero unauthorized trademarks or proprietary corporate logos.'}
            </p>
          </div>

          {/* Privacy & App Store Compliance */}
          <div className="bg-[#241E19] border border-[#3D2E24] rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#2ECC71]">
              <Lock size={16} />
              <span>{isJa ? 'プライバシーポリシー・完全オフライン動作 (Apple 5.1.1 & 4.2)' : 'Privacy Policy & Zero Telemetry (Apple Guidelines 5.1.1 & 4.2)'}</span>
            </div>
            <div className="text-xs text-[#C8B8A6] space-y-1.5 leading-relaxed">
              <p>
                {isJa
                  ? '【データ収集ゼロ】本作はユーザーの個人情報、位置情報、端末識別子を一切収集・送信しません。広告ネットワークSDKや外部分析トラッカーは一切含まれていません。'
                  : '【Zero Data Collection】Sumo Fruits collects, stores, and transmits zero personal data, location data, or device identifiers. There are no advertising SDKs, third-party analytics, or behavioral trackers.'}
              </p>
              <p>
                {isJa
                  ? '【機内モード・完全オフライン対応】すべての物理演算、サウンド合成、巡業AIは端末ローカルで完結します。機内モードやネットワーク未接続環境でも全ての機能を制限なく楽しめます。'
                  : '【100% Offline / Airplane Mode Ready】All physics calculations, procedural audio synthesis, and career AI run completely on-device with zero backend dependencies. Fully playable in Airplane Mode.'}
              </p>
              <a
                href="https://github.com/rouissimonir/Sumo-Fruits/blob/main/PRIVACY.md"
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center rounded-lg border border-[#2ECC71]/50 bg-[#17251C] px-3 py-2 font-bold text-[#7EE2A8] underline decoration-[#2ECC71]/50 underline-offset-2 hover:text-white"
              >
                {isJa ? 'プライバシーポリシー全文を表示' : 'Read the full Privacy Policy'}
              </a>
            </div>
          </div>

          {/* Support & Developer Inquiries */}
          <div className="bg-[#241E19] border border-[#3D2E24] rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#F39C12]">
              <Palette size={16} />
              <span>{isJa ? 'サポート窓口・お問い合わせ' : 'Support & Developer Contact'}</span>
            </div>
            <p className="text-xs text-[#C8B8A6] leading-relaxed">
              {isJa
                ? 'ゲームの不具合報告、フィードバック、またはApp Store審査に関するお問い合わせは、以下の開発者窓口までご連絡ください。'
                : 'For player support, bug reports, and App Store review inquiries:'}
            </p>
            <div className="flex items-center gap-2 text-xs font-mono bg-[#181410] px-3 py-1.5 rounded-lg border border-[#3A2D23] text-[#F1C40F]">
              <span>Email:</span>
              <a href="mailto:mounirrouissi2@gmail.com" className="underline hover:text-white">
                mounirrouissi2@gmail.com
              </a>
            </div>
            <a
              href="https://github.com/rouissimonir/Sumo-Fruits/blob/main/SUPPORT.md"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center rounded-lg border border-[#F39C12]/50 bg-[#2A2117] px-3 py-2 text-xs font-bold text-[#F6C453] underline decoration-[#F39C12]/50 underline-offset-2 hover:text-white"
            >
              {isJa ? 'サポートページを表示' : 'Open the Support Page'}
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-[#3D2E24] bg-[#241E19] flex items-center justify-between">
          <span className="text-xs text-[#8A7B6D]">© 2026 Sumo Fruits</span>
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
