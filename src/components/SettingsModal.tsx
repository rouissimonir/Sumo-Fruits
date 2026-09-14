import React from 'react';
import {
  X,
  Volume2,
  VolumeX,
  RotateCcw,
  BookOpen,
  Pause,
  Play,
  Compass,
  Trophy,
  Sliders,
  Sparkles,
  HelpCircle,
  Vibrate,
  Languages,
  Eye,
  ShieldCheck,
  Music,
} from 'lucide-react';
import { GameStats } from '../game/GameEngine';
import { ArenaConditionType, ArenaMode, GameModeType, SpinMode } from '../types/game';
import { CONDITION_METADATA } from '../game/ArenaConditionManager';
import { GameSettings } from '../types/settings';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: GameStats;
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  onTogglePause: () => void;
  onRestart: () => void;
  onSelectGameMode: (mode: GameModeType, challengeId?: string) => void;
  onSelectArenaMode: (mode: ArenaMode) => void;
  onSelectArenaCondition?: (condition: ArenaConditionType) => void;
  onSelectSpinMode?: (mode: SpinMode) => void;
  onOpenTierList: () => void;
  onOpenKimarite: () => void;
  onOpenTuner: () => void;
  onOpenTutorial: () => void;
  onOpenCredits: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  stats,
  settings,
  onUpdateSettings,
  onTogglePause,
  onRestart,
  onSelectGameMode,
  onSelectArenaMode,
  onSelectArenaCondition,
  onSelectSpinMode,
  onOpenTierList,
  onOpenKimarite,
  onOpenTuner,
  onOpenTutorial,
  onOpenCredits,
}) => {
  if (!isOpen) return null;

  const isJa = settings.language === 'JA';

  return (
    <div
      id="settings-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in"
    >
      <div
        id="settings-modal-card"
        className="relative w-full max-w-lg max-h-[90vh] flex flex-col bg-[#1C1814] border-2 border-[#5A4535] rounded-2xl shadow-2xl overflow-hidden text-[#EDE2D4]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#3D2E24] bg-[#241E19]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#3E3125] border border-[#6B533E] flex items-center justify-center text-xl shadow-inner">
              ⚙️
            </div>
            <div>
              <h2 className="text-lg font-black tracking-wide text-white">
                {isJa ? '設定・メニュー' : 'Game Settings & Menu'}
              </h2>
              <p className="text-xs text-[#A89886]">
                {isJa
                  ? 'サウンド・操作・土俵・モード・アクセシビリティ'
                  : 'Configure audio, modes, arena, tutorial & accessibility'}
              </p>
            </div>
          </div>
          <button
            id="settings-close-btn"
            onClick={onClose}
            className="p-2 rounded-xl bg-[#2E241D] hover:bg-[#3D2E24] text-[#A89886] hover:text-white transition-colors cursor-pointer"
            aria-label="Close settings"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Quick Match Actions */}
          <div className="grid grid-cols-3 gap-2">
            <button
              id="settings-pause-btn"
              onClick={onTogglePause}
              className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                stats.isPaused
                  ? 'bg-[#F39C12]/20 border-[#F39C12] text-[#FFD700]'
                  : 'bg-[#261F19] hover:bg-[#342A22] border-[#44362B] text-white'
              }`}
            >
              {stats.isPaused ? <Play size={18} className="text-[#FFD700]" /> : <Pause size={18} />}
              <span>{stats.isPaused ? (isJa ? '再開' : 'Resume') : (isJa ? '一時停止' : 'Pause')}</span>
            </button>

            <button
              id="settings-sound-btn"
              onClick={() => onUpdateSettings({ sfxMuted: !settings.sfxMuted })}
              className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                !settings.sfxMuted
                  ? 'bg-[#2ECC71]/15 border-[#2ECC71]/60 text-[#2ECC71]'
                  : 'bg-[#E74C3C]/15 border-[#E74C3C]/60 text-[#E74C3C]'
              }`}
            >
              {!settings.sfxMuted ? <Volume2 size={18} /> : <VolumeX size={18} />}
              <span>{!settings.sfxMuted ? (isJa ? '効果音: ON' : 'SFX: On') : (isJa ? '効果音: 消音' : 'SFX: Muted')}</span>
            </button>

            <button
              id="settings-restart-btn"
              onClick={() => {
                onClose();
                onRestart();
              }}
              className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-[#261F19] hover:bg-[#3D2E24] border border-[#44362B] text-[#E0D4C5] hover:text-white text-xs font-bold transition-all cursor-pointer"
            >
              <RotateCcw size={18} className="text-[#E67E22]" />
              <span>{isJa ? 'やり直す' : 'Restart'}</span>
            </button>
          </div>

          {/* Audio & Haptic Controls */}
          <div className="bg-[#241E19] border border-[#3D2E24] rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#FFD700]">
              <div className="flex items-center gap-1.5">
                <Music size={14} />
                <span>{isJa ? '音声・触覚バイブ設定' : 'Audio & Haptic Feedback'}</span>
              </div>
            </div>

            <div className="space-y-2.5">
              {/* SFX Volume Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-[#C8B8A6]">
                  <span>{isJa ? '効果音・行司音声 音量' : 'SFX & Voice Volume'}</span>
                  <span className="font-mono">{Math.round(settings.sfxVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.sfxVolume}
                  onChange={(e) => onUpdateSettings({ sfxVolume: parseFloat(e.target.value) })}
                  className="w-full accent-[#E67E22] cursor-pointer"
                />
              </div>

              {/* Haptic Vibration & Language Toggles */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  id="settings-vibration-btn"
                  onClick={() => onUpdateSettings({ hapticsEnabled: !settings.hapticsEnabled })}
                  className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                    settings.hapticsEnabled
                      ? 'bg-[#E67E22]/20 border-[#E67E22] text-white'
                      : 'bg-[#1C1814] border-[#382B22] text-[#8A7B6D]'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Vibrate size={16} />
                    <span>{isJa ? '振動 (Haptics)' : 'Vibration'}</span>
                  </div>
                  <span className="text-[10px] uppercase font-mono">{settings.hapticsEnabled ? 'ON' : 'OFF'}</span>
                </button>

                <button
                  id="settings-lang-btn"
                  onClick={() => onUpdateSettings({ language: isJa ? 'EN' : 'JA' })}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-[#382B22] bg-[#1C1814] hover:bg-[#2F241C] text-xs font-bold text-white transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    <Languages size={16} className="text-[#3498DB]" />
                    <span>{isJa ? '言語 (Language)' : 'Language'}</span>
                  </div>
                  <span className="text-[10px] text-[#FFD700] font-mono">{isJa ? '日本語' : 'English'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Accessibility & Visual Comfort */}
          <div className="bg-[#241E19] border border-[#3D2E24] rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#3498DB]">
              <Eye size={14} />
              <span>{isJa ? 'アクセシビリティ設定' : 'Accessibility & Visuals'}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                id="settings-contrast-btn"
                onClick={() => onUpdateSettings({ highContrast: !settings.highContrast })}
                className={`p-2.5 rounded-lg border text-left text-xs font-bold transition-all cursor-pointer ${
                  settings.highContrast
                    ? 'bg-[#3498DB]/20 border-[#3498DB] text-white'
                    : 'bg-[#1C1814] border-[#382B22] text-[#8A7B6D]'
                }`}
              >
                <div className="truncate">{isJa ? '高コントラスト / 色覚補正' : 'High Contrast Mode'}</div>
                <div className="text-[10px] font-normal text-[#8A7B6D] mt-0.5">
                  {settings.highContrast ? (isJa ? '有効 (太字枠・記号)' : 'Active (Bold rings)') : (isJa ? '通常' : 'Standard')}
                </div>
              </button>

              <button
                id="settings-motion-btn"
                onClick={() => onUpdateSettings({ reducedMotion: !settings.reducedMotion })}
                className={`p-2.5 rounded-lg border text-left text-xs font-bold transition-all cursor-pointer ${
                  settings.reducedMotion
                    ? 'bg-[#3498DB]/20 border-[#3498DB] text-white'
                    : 'bg-[#1C1814] border-[#382B22] text-[#8A7B6D]'
                }`}
              >
                <div className="truncate">{isJa ? '視覚効果の軽減' : 'Reduced Motion'}</div>
                <div className="text-[10px] font-normal text-[#8A7B6D] mt-0.5">
                  {settings.reducedMotion ? (isJa ? '揺れ無効' : 'Shake Disabled') : (isJa ? '通常' : 'Standard')}
                </div>
              </button>
            </div>
          </div>

          {/* Game Mode Selection */}
          <div className="bg-[#241E19] border border-[#3D2E24] rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#FFD700]">
              <Trophy size={14} />
              <span>{isJa ? 'ゲームモード' : 'Game Mode'}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <button
                id="mode-classic-btn"
                onClick={() => onSelectGameMode('CLASSIC')}
                className={`py-2 px-2 rounded-lg border text-xs font-bold transition-all cursor-pointer text-center ${
                  stats.gameMode === 'CLASSIC'
                    ? 'bg-[#B7791F]/30 border-[#FFD700] text-white shadow-sm'
                    : 'bg-[#1C1814] border-[#382B22] text-[#A89886] hover:text-white'
                }`}
              >
                {isJa ? 'クラシック' : 'Classic'}
                <div className="text-[10px] font-normal text-[#8A7B6D] mt-0.5">Endless Bowl</div>
              </button>

              <button
                id="mode-daily-btn"
                onClick={() => onSelectGameMode('DAILY')}
                className={`py-2 px-2 rounded-lg border text-xs font-bold transition-all cursor-pointer text-center ${
                  stats.gameMode === 'DAILY'
                    ? 'bg-[#10B981]/30 border-[#10B981] text-white shadow-sm'
                    : 'bg-[#1C1814] border-[#382B22] text-[#A89886] hover:text-white'
                }`}
              >
                📅 {isJa ? 'デイリー場所' : 'Daily'}
                <div className="text-[10px] font-normal text-[#8A7B6D] mt-0.5">
                  {stats.dailyBasho ? `Day #${stats.dailyBasho.dayNumber}` : 'Daily Basho'}
                </div>
              </button>

              <button
                id="mode-versus-btn"
                onClick={() => onSelectGameMode('VERSUS')}
                className={`py-2 px-2 rounded-lg border text-xs font-bold transition-all cursor-pointer text-center ${
                  stats.gameMode === 'VERSUS'
                    ? 'bg-[#E74C3C]/30 border-[#E74C3C] text-white shadow-sm'
                    : 'bg-[#1C1814] border-[#382B22] text-[#A89886] hover:text-white'
                }`}
              >
                {isJa ? '2P 対戦' : '2P Versus'}
                <div className="text-[10px] font-normal text-[#8A7B6D] mt-0.5">Local 1v1</div>
              </button>

              <button
                id="mode-career-btn"
                onClick={() => onSelectGameMode('CAREER')}
                className={`py-2 px-2 rounded-lg border text-xs font-bold transition-all cursor-pointer text-center ${
                  stats.gameMode === 'CAREER'
                    ? 'bg-[#B7791F]/30 border-[#FFD700] text-white shadow-sm'
                    : 'bg-[#1C1814] border-[#382B22] text-[#A89886] hover:text-white'
                }`}
              >
                {isJa ? '番付巡業' : 'Career'}
                <div className="text-[10px] font-normal text-[#8A7B6D] mt-0.5">
                  Banzuke {stats.careerStageIndex + 1}/5
                </div>
              </button>

              <button
                id="mode-challenge-btn"
                onClick={() => onSelectGameMode('CHALLENGE', 'BROKEN_TAWARA')}
                className={`py-2 px-2 rounded-lg border text-xs font-bold transition-all cursor-pointer text-center ${
                  stats.gameMode === 'CHALLENGE'
                    ? 'bg-[#9B59B6]/30 border-[#D2B4DE] text-white shadow-sm'
                    : 'bg-[#1C1814] border-[#382B22] text-[#A89886] hover:text-white'
                }`}
              >
                {isJa ? '課題' : 'Challenge'}
                <div className="text-[10px] font-normal text-[#8A7B6D] mt-0.5">Broken Rim</div>
              </button>
            </div>
          </div>

          {/* Arena Dynamic Conditions */}
          {onSelectArenaCondition && (
            <div className="bg-[#241E19] border border-[#3D2E24] rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#E67E22]">
                  <span>🌪️ {isJa ? '土俵環境コンディション' : 'Arena Condition Modifiers'}</span>
                </div>
                {stats.arenaCondition && (
                  <span className="text-[10px] font-mono text-[#FFD700]">
                    {CONDITION_METADATA[stats.arenaCondition.type].nameJp}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['NONE', 'GRIPPY_CLAY', 'KAMIKAZE_WIND', 'CLOSING_RING'] as ArenaConditionType[]).map((condType) => {
                  const meta = CONDITION_METADATA[condType];
                  const isActive = stats.arenaCondition?.type === condType;
                  return (
                    <button
                      key={condType}
                      type="button"
                      onClick={() => onSelectArenaCondition(condType)}
                      disabled={stats.gameMode === 'DAILY'}
                      className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#E67E22]/25 border-[#E67E22] text-white shadow-sm ring-1 ring-[#E67E22]'
                          : 'bg-[#1C1814] border-[#382B22] text-[#A89886] hover:text-white'
                      } ${stats.gameMode === 'DAILY' ? 'cursor-not-allowed opacity-55' : ''}`}
                    >
                      <div className="flex items-center gap-1 text-xs font-bold">
                        <span>{meta.icon}</span>
                        <span className="truncate">{isJa ? meta.nameJp : meta.nameRomaji}</span>
                      </div>
                      <div className="text-[9px] text-[#8A7B6D] line-clamp-2 mt-0.5">
                        {meta.description}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Launcher English Sidespin Presets */}
          {onSelectSpinMode && (
            <div className="bg-[#241E19] border border-[#3D2E24] rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#E67E22]">
                  <span>🌀 {isJa ? '発射時の英語スピン（変化）' : 'Launcher English Sidespin'}</span>
                </div>
                <span className="text-[11px] text-[#A89886] font-mono">[Q] / [W] / [E]</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  id="settings-spin-left-btn"
                  onClick={() => onSelectSpinMode('LEFT')}
                  className={`py-2 px-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer text-center ${
                    stats.selectedSpinMode === 'LEFT'
                      ? 'bg-[#E74C3C]/25 border-[#E74C3C] text-white shadow-sm'
                      : 'bg-[#1C1814] border-[#382B22] text-[#A89886] hover:text-white'
                  }`}
                >
                  {isJa ? '↺ 左変化' : '↺ Left Curve'}
                  <div className="text-[10px] font-normal text-[#8A7B6D] mt-0.5">Counter-Clockwise</div>
                </button>

                <button
                  id="settings-spin-straight-btn"
                  onClick={() => onSelectSpinMode('STRAIGHT')}
                  className={`py-2 px-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer text-center ${
                    stats.selectedSpinMode === 'STRAIGHT'
                      ? 'bg-[#2ECC71]/25 border-[#2ECC71] text-white shadow-sm'
                      : 'bg-[#1C1814] border-[#382B22] text-[#A89886] hover:text-white'
                  }`}
                >
                  {isJa ? '↑ 直進' : '↑ Direct'}
                  <div className="text-[10px] font-normal text-[#8A7B6D] mt-0.5">Neutral Magnus</div>
                </button>

                <button
                  id="settings-spin-right-btn"
                  onClick={() => onSelectSpinMode('RIGHT')}
                  className={`py-2 px-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer text-center ${
                    stats.selectedSpinMode === 'RIGHT'
                      ? 'bg-[#3498DB]/25 border-[#3498DB] text-white shadow-sm'
                      : 'bg-[#1C1814] border-[#382B22] text-[#A89886] hover:text-white'
                  }`}
                >
                  {isJa ? '↻ 右変化' : '↻ Right Curve'}
                  <div className="text-[10px] font-normal text-[#8A7B6D] mt-0.5">Clockwise Arc</div>
                </button>
              </div>
            </div>
          )}

          {/* Sumo Encyclopedias & Tutorials */}
          <div className="bg-[#241E19] border border-[#3D2E24] rounded-xl p-3.5 space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-[#A89886]">
              {isJa ? '相撲図鑑・チュートリアル' : 'Tutorial & Knowledge'}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                id="settings-tutorial-btn"
                onClick={() => {
                  onClose();
                  onOpenTutorial();
                }}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-[#1C1814] hover:bg-[#2F241C] border border-[#4B392C] text-left transition-all cursor-pointer group"
              >
                <HelpCircle size={20} className="text-[#E67E22] shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white group-hover:text-[#E67E22] truncate">
                    {isJa ? '稽古案内' : 'Tutorial'}
                  </div>
                  <div className="text-[10px] text-[#A89886]">{isJa ? '操作・決まり手' : 'Interactive Guide'}</div>
                </div>
              </button>

              <button
                id="settings-kimarite-btn"
                onClick={() => {
                  onClose();
                  onOpenKimarite();
                }}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-[#1C1814] hover:bg-[#2F241C] border border-[#4B392C] text-left transition-all cursor-pointer group"
              >
                <div className="text-xl">🥋</div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white group-hover:text-[#FFD700] truncate">
                    {isJa ? '決まり手図鑑' : 'Kimarite'}
                  </div>
                  <div className="text-[10px] text-[#A89886]">
                    {stats.unlockedKimariteCount ?? 0}/{stats.totalKimariteCount ?? 8} Mastered
                  </div>
                </div>
              </button>

              <button
                id="settings-roster-btn"
                onClick={() => {
                  onClose();
                  onOpenTierList();
                }}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-[#1C1814] hover:bg-[#2F241C] border border-[#4B392C] text-left transition-all cursor-pointer group"
              >
                <BookOpen size={20} className="text-[#3498DB] shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white group-hover:text-[#3498DB] truncate">
                    {isJa ? 'フルーツ番付' : 'Fruit Roster'}
                  </div>
                  <div className="text-[10px] text-[#A89886]">11 Wrestler Tiers</div>
                </div>
              </button>
            </div>
          </div>

          {/* Engine Tools & Licenses */}
          <div className="bg-[#241E19] border border-[#3D2E24] rounded-xl p-3.5 space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-[#A89886]">
              {isJa ? '開発ツール・ライセンス情報' : 'Tools & Asset Licensing'}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                id="settings-tuner-btn"
                onClick={() => {
                  onClose();
                  onOpenTuner();
                }}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-[#1C1814] hover:bg-[#2F241C] border border-[#4B392C] text-left transition-all cursor-pointer group"
              >
                <Sliders size={16} className="text-[#F1C40F] shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white group-hover:text-[#F1C40F] truncate">Tuner</div>
                  <div className="text-[9px] text-[#A89886]">Physics</div>
                </div>
              </button>

              <button
                id="settings-credits-btn"
                onClick={() => {
                  onClose();
                  onOpenCredits();
                }}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-[#1C1814] hover:bg-[#2F241C] border border-[#4B392C] text-left transition-all cursor-pointer group"
              >
                <ShieldCheck size={16} className="text-[#3498DB] shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white group-hover:text-[#3498DB] truncate">
                    {isJa ? '権利表記' : 'Licenses'}
                  </div>
                  <div className="text-[9px] text-[#A89886]">Clearance</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#3D2E24] bg-[#241E19] flex items-center justify-between text-xs text-[#A89886]">
          <span>Sumo Fruits: The Bumper Bowl</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#3E3125] hover:bg-[#5A4535] text-white font-bold transition-all cursor-pointer"
          >
            {isJa ? 'ゲームに戻る' : 'Resume Play'}
          </button>
        </div>
      </div>
    </div>
  );
};
