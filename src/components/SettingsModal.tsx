import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Volume2,
  VolumeX,
  RotateCcw,
  BookOpen,
  Pause,
  Play,
  Trophy,
  HelpCircle,
  Vibrate,
  Languages,
  Eye,
  ShieldCheck,
  Music,
  Swords,
  Compass,
  Trash2,
  Download,
  Upload,
  Copy,
  Check,
  Smartphone,
  Database,
  FileText,
} from 'lucide-react';
import { GameStats } from '../game/GameEngine';
import { ArenaConditionType, ArenaMode, GameModeType } from '../types/game';
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
  onOpenTierList: () => void;
  onOpenKimarite: () => void;
  onOpenTutorial: () => void;
  onOpenCredits: () => void;
  onToggleVersusPassAndPlay?: () => void;
}

type SettingsTab = 'AUDIO_CONTROLS' | 'DISPLAY' | 'MODES' | 'GUIDES';

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
  onOpenTierList,
  onOpenKimarite,
  onOpenTutorial,
  onOpenCredits,
  onToggleVersusPassAndPlay,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('AUDIO_CONTROLS');
  const [resetState, setResetState] = useState<'IDLE' | 'CONFIRM' | 'DONE'>('IDLE');
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importStatus, setImportStatus] = useState<{ type: 'ERROR' | 'SUCCESS'; msg: string } | null>(null);

  if (!isOpen) return null;

  const isJa = settings.language === 'JA';

  const handleExportData = () => {
    try {
      const backup: Record<string, string | null> = {
        sumo_suika_high_score: localStorage.getItem('sumo_suika_high_score'),
        sumo_kimarite_collection_v2: localStorage.getItem('sumo_kimarite_collection_v2'),
        sumo_career_save_v1: localStorage.getItem('sumo_career_save_v1'),
        sumo_tutorial_completed_v1: localStorage.getItem('sumo_tutorial_completed_v1'),
        sumo_missions_v1: localStorage.getItem('sumo_missions_v1'),
        sumo_fruits_settings_v1: localStorage.getItem('sumo_fruits_settings_v1'),
      };
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith('daily_basho_')) {
          backup[k] = localStorage.getItem(k);
        }
      });

      const payload = {
        app: 'SumoFruits',
        version: 1,
        exportedAt: new Date().toISOString(),
        saveData: backup,
      };
      const jsonStr = JSON.stringify(payload, null, 2);

      // Trigger download
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sumo-fruits-save-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Also copy to clipboard for mobile convenience
      try {
        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(jsonStr).catch(() => {});
        }
      } catch {
        // Ignored
      }

      setExportFeedback(isJa ? 'バックアップを保存＆コピーしました！' : 'Save downloaded & copied to clipboard!');
      setTimeout(() => setExportFeedback(null), 3500);
    } catch {
      setExportFeedback(isJa ? 'エクスポートに失敗しました' : 'Export failed');
      setTimeout(() => setExportFeedback(null), 3000);
    }
  };

  const processImportString = (rawJson: string) => {
    try {
      const parsed = JSON.parse(rawJson);
      const data = parsed.saveData || (parsed.app === 'SumoFruits' ? parsed : null);
      if (!data) {
        setImportStatus({
          type: 'ERROR',
          msg: isJa ? '無効なSumo Fruitsバックアップ形式です。' : 'Invalid Sumo Fruits backup file format.',
        });
        return;
      }

      if (typeof window !== 'undefined' && window.localStorage) {
        Object.entries(data).forEach(([key, val]) => {
          if (typeof val === 'string') {
            localStorage.setItem(key, val);
          }
        });
      }

      setImportStatus({
        type: 'SUCCESS',
        msg: isJa ? '復元完了！再起動中...' : 'Restored successfully! Reloading...',
      });

      setTimeout(() => {
        onRestart();
        setShowImport(false);
        setImportStatus(null);
        setImportText('');
        onClose();
      }, 1200);
    } catch {
      setImportStatus({
        type: 'ERROR',
        msg: isJa ? 'JSONデータの解析に失敗しました。' : 'Failed to parse JSON text.',
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (text) processImportString(text);
    };
    reader.readAsText(file);
  };

  const handleResetData = () => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem('sumo_suika_high_score');
        localStorage.removeItem('sumo_kimarite_collection_v2');
        localStorage.removeItem('sumo_career_save_v1');
        localStorage.removeItem('sumo_tutorial_completed_v1');
        localStorage.removeItem('sumo_missions_v1');
        // Clear daily basho keys
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('daily_basho_')) {
            localStorage.removeItem(key);
          }
        });
      }
      setResetState('DONE');
      setTimeout(() => {
        onRestart();
        setResetState('IDLE');
        onClose();
      }, 1200);
    } catch {
      setResetState('IDLE');
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        id="settings-modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md"
      >
        <motion.div
          id="settings-modal-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-modal-title"
          initial={{ scale: 0.93, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.93, opacity: 0, y: 16 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-xl max-h-[92vh] flex flex-col bg-[#1C1814] border-2 border-[#5A4535] rounded-2xl shadow-2xl overflow-hidden text-[#EDE2D4]"
        >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-[#3D2E24] bg-[#241E19]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#3E3125] border border-[#6B533E] flex items-center justify-center text-lg shadow-inner">
              ⚙️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="settings-modal-title" className="text-base sm:text-lg font-black tracking-wide text-white">
                  {isJa ? '設定・操作案内' : 'Game Settings & Controls'}
                </h2>
                <span className="text-[10px] uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-[#3D2E24] text-[#FFD700] border border-[#5A4535]">
                  v1.0.0
                </span>
              </div>
              <p className="text-[11px] text-[#A89886]">
                {isJa
                  ? 'サウンド・操作・画面表示・ゲームモード'
                  : 'Audio, touch controls, visual comfort & game modes'}
              </p>
            </div>
          </div>
          <motion.button
            id="settings-close-btn"
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.05 }}
            onClick={onClose}
            className="p-2 rounded-xl bg-[#2E241D] hover:bg-[#3D2E24] text-[#A89886] hover:text-white transition-colors cursor-pointer"
            aria-label="Close settings"
          >
            <X size={18} />
          </motion.button>
        </div>

        {/* Quick Match Actions Strip */}
        <div className="px-4 sm:px-5 py-2.5 bg-[#171410] border-b border-[#35271E] grid grid-cols-3 gap-2">
          <button
            id="settings-pause-btn"
            onClick={onTogglePause}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
              stats.isPaused
                ? 'bg-[#F39C12]/20 border-[#F39C12] text-[#FFD700]'
                : 'bg-[#241D17] hover:bg-[#342A22] border-[#3E3025] text-white'
            }`}
          >
            {stats.isPaused ? <Play size={15} className="text-[#FFD700]" /> : <Pause size={15} />}
            <span>{stats.isPaused ? (isJa ? '再開' : 'Resume') : (isJa ? '一時停止' : 'Pause')}</span>
          </button>

          <button
            id="settings-sound-btn"
            onClick={() => onUpdateSettings({ sfxMuted: !settings.sfxMuted })}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
              !settings.sfxMuted
                ? 'bg-[#2ECC71]/15 border-[#2ECC71]/60 text-[#2ECC71]'
                : 'bg-[#E74C3C]/15 border-[#E74C3C]/60 text-[#E74C3C]'
            }`}
          >
            {!settings.sfxMuted ? <Volume2 size={15} /> : <VolumeX size={15} />}
            <span>{!settings.sfxMuted ? (isJa ? '効果音: ON' : 'SFX: On') : (isJa ? '効果音: 消音' : 'SFX: Muted')}</span>
          </button>

          <button
            id="settings-restart-btn"
            onClick={() => {
              onClose();
              onRestart();
            }}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#241D17] hover:bg-[#3D2E24] border border-[#3E3025] text-[#E0D4C5] hover:text-white text-xs font-bold transition-all cursor-pointer"
          >
            <RotateCcw size={15} className="text-[#E67E22]" />
            <span>{isJa ? 'やり直す' : 'Restart'}</span>
          </button>
        </div>

        {/* Tab Navigation Navigation Bar */}
        <div className="flex border-b border-[#3D2E24] bg-[#1E1914] px-3 sm:px-4 gap-1 overflow-x-auto select-none">
          <button
            id="tab-audio-controls-btn"
            onClick={() => setActiveTab('AUDIO_CONTROLS')}
            className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'AUDIO_CONTROLS'
                ? 'border-[#E67E22] text-[#FFD700]'
                : 'border-transparent text-[#A89886] hover:text-white'
            }`}
          >
            <Smartphone size={14} />
            <span>{isJa ? '音・操作案内' : 'Audio & Controls'}</span>
          </button>

          <button
            id="tab-display-btn"
            onClick={() => setActiveTab('DISPLAY')}
            className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'DISPLAY'
                ? 'border-[#3498DB] text-[#93C5FD]'
                : 'border-transparent text-[#A89886] hover:text-white'
            }`}
          >
            <Eye size={14} />
            <span>{isJa ? '画面・表示' : 'Visuals & Access'}</span>
          </button>

          <button
            id="tab-modes-btn"
            onClick={() => setActiveTab('MODES')}
            className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'MODES'
                ? 'border-[#10B981] text-[#6EE7B7]'
                : 'border-transparent text-[#A89886] hover:text-white'
            }`}
          >
            <Trophy size={14} />
            <span>{isJa ? 'モード・土俵' : 'Modes & Arena'}</span>
          </button>

          <button
            id="tab-guides-btn"
            onClick={() => setActiveTab('GUIDES')}
            className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'GUIDES'
                ? 'border-[#9B59B6] text-[#D2B4DE]'
                : 'border-transparent text-[#A89886] hover:text-white'
            }`}
          >
            <BookOpen size={14} />
            <span>{isJa ? '図鑑・情報' : 'Guides & About'}</span>
          </button>
        </div>

        {/* Scrollable Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* TAB 1: AUDIO & CONTROLS */}
          {activeTab === 'AUDIO_CONTROLS' && (
            <div className="space-y-4 animate-fade-in">
              {/* Sound & Haptics */}
              <div className="bg-[#241E19] border border-[#3D2E24] rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#FFD700]">
                  <div className="flex items-center gap-1.5">
                    <Music size={14} />
                    <span>{isJa ? 'サウンド設定' : 'Audio & Haptic Feedback'}</span>
                  </div>
                </div>

                {/* SFX Volume Slider */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-[#C8B8A6]">
                    <span>{isJa ? '効果音・行司ボイス音量' : 'SFX & Referee Voice Volume'}</span>
                    <span className="font-mono font-bold text-white">{Math.round(settings.sfxVolume * 100)}%</span>
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

                {/* Background Music */}
                <div className="space-y-1 border-t border-[#3D2E24] pt-2.5">
                  <div className="flex items-center justify-between gap-3 text-xs text-[#C8B8A6]">
                    <span>{isJa ? '土俵の音楽' : 'Dohyō Background Music'}</span>
                    <button
                      type="button"
                      onClick={() => onUpdateSettings({ bgmMuted: !settings.bgmMuted })}
                      className={`rounded-md border px-2 py-1 text-[10px] font-black ${settings.bgmMuted ? 'border-[#E74C3C]/60 text-[#E74C3C]' : 'border-[#2ECC71]/60 text-[#2ECC71]'}`}
                    >
                      {settings.bgmMuted ? (isJa ? '消音' : 'MUTED') : 'ON'}
                    </button>
                  </div>
                  <input
                    aria-label={isJa ? '音楽の音量' : 'Music volume'}
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.bgmVolume}
                    onChange={(e) => onUpdateSettings({ bgmVolume: parseFloat(e.target.value), bgmMuted: false })}
                    className="w-full accent-[#D4AF37] cursor-pointer"
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
                    <span className="text-[10px] uppercase font-mono font-bold">{settings.hapticsEnabled ? 'ON' : 'OFF'}</span>
                  </button>

                  <button
                    id="settings-lang-btn"
                    onClick={() => onUpdateSettings({ language: isJa ? 'EN' : 'JA' })}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-[#382B22] bg-[#1C1814] hover:bg-[#2F241C] text-xs font-bold text-white transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5">
                      <Languages size={16} className="text-[#3498DB]" />
                      <span>{isJa ? '表示言語' : 'Language'}</span>
                    </div>
                    <span className="text-[10px] text-[#FFD700] font-mono font-bold">{isJa ? '日本語' : 'English'}</span>
                  </button>
                </div>
              </div>

              {/* Mobile-first touch controls */}
              <div className="bg-[#241E19] border border-[#3D2E24] rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#FFD700]">
                    <Smartphone size={14} />
                    <span>{isJa ? 'タッチ操作' : 'Touch Controls'}</span>
                  </div>
                  <span className="text-[10px] text-[#A89886] font-mono">iPhone</span>
                </div>

                <div className="space-y-1.5 text-xs">
                  {/* Aim & Launch */}
                  <div className="flex items-start justify-between p-2 rounded-lg bg-[#1C1814] border border-[#35281E]">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🎯</span>
                      <div>
                        <div className="font-bold text-white">{isJa ? '狙う & 射出' : 'Aim & Slingshot Launch'}</div>
                        <div className="text-[11px] text-[#A89886]">
                          {isJa
                            ? '装填された果物を後ろに引っ張り、離して発射'
                            : 'Drag loaded fruit backward from launcher & release'}
                        </div>
                      </div>
                    </div>
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-[#2D231B] text-[#FFD700] font-bold shrink-0">
                      {isJa ? 'ドラッグして離す' : 'Drag & release'}
                    </span>
                  </div>

                  {/* Sacred Salt */}
                  <div className="flex items-start justify-between p-2 rounded-lg bg-[#1C1814] border border-[#35281E]">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🧂</span>
                      <div>
                        <div className="font-bold text-white">{isJa ? '清めの塩 (Kiyome-no-Shio)' : 'Sacred Salt (Purify)'}</div>
                        <div className="text-[11px] text-[#A89886]">
                          {isJa
                            ? '塩ボタンを押し、土俵をタップして障害物を清めます'
                            : 'Tap Salt, then tap the Dohyō to purify hazards and brake fruits'}
                        </div>
                      </div>
                    </div>
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-[#2D231B] text-[#60A5FA] font-bold shrink-0">
                      {isJa ? 'タップして狙う' : 'Tap to target'}
                    </span>
                  </div>

                  {/* Palm Strike */}
                  <div className="flex items-start justify-between p-2 rounded-lg bg-[#1C1814] border border-[#35281E]">
                    <div className="flex items-center gap-2">
                      <span className="text-base">✋</span>
                      <div>
                        <div className="font-bold text-white">{isJa ? '突っ張り (Palm Strike)' : 'Palm Strike (Tsuppari)'}</div>
                        <div className="text-[11px] text-[#A89886]">
                          {isJa
                            ? '発射前に入力で強化。+350衝撃力、氷・甲虫ガードを粉砕、ボスの突進を迎撃'
                            : 'Empowers next shot (+350 impulse, breaks beetle guard & ice)'}
                        </div>
                      </div>
                    </div>
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-[#2D231B] text-[#E67E22] font-bold shrink-0">
                      {isJa ? 'タップして装備' : 'Tap to arm'}
                    </span>
                  </div>

                  {/* Taiko Pulse */}
                  <div className="flex items-start justify-between p-2 rounded-lg bg-[#1C1814] border border-[#35281E]">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🥁</span>
                      <div>
                        <div className="font-bold text-white">{isJa ? '太鼓波動 (Taiko Pulse)' : 'Taiko Pulse (Shockwave)'}</div>
                        <div className="text-[11px] text-[#A89886]">
                          {isJa
                            ? '初撃接触時に全方位衝撃波。ワサビや小虫を一掃、ボスの連続攻撃を中断'
                            : 'Radial shockwave on collision: clears wasabi & knocks out pests'}
                        </div>
                      </div>
                    </div>
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-[#2D231B] text-[#D2B4DE] font-bold shrink-0">
                      {isJa ? 'タップして装備' : 'Tap to arm'}
                    </span>
                  </div>

                  {/* Skill Hotkeys */}
                  <div className="flex items-start justify-between p-2 rounded-lg bg-[#1C1814] border border-[#35281E]">
                    <div className="flex items-center gap-2">
                      <span className="text-base">⚡</span>
                      <div>
                        <div className="font-bold text-white">{isJa ? '技の切り替え' : 'Switch Active Skill'}</div>
                        <div className="text-[11px] text-[#A89886]">
                          {isJa ? '技アイコンをタップして、使える技を切り替えます' : 'Tap the current skill icon to cycle through unlocked techniques'}
                        </div>
                      </div>
                    </div>
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-[#2D231B] text-[#A89886] font-bold shrink-0">
                      {isJa ? 'アイコンをタップ' : 'Tap skill icon'}
                    </span>
                  </div>

                  {/* Cancel / Escape */}
                  <div className="flex items-start justify-between p-2 rounded-lg bg-[#1C1814] border border-[#35281E]">
                    <div className="flex items-center gap-2">
                      <span className="text-base">❌</span>
                      <div>
                        <div className="font-bold text-white">{isJa ? '照準キャンセル' : 'Cancel Aim / Salt'}</div>
                        <div className="text-[11px] text-[#A89886]">
                          {isJa ? '塩の照準や果物の引っ張りを安全に取り消し' : 'Safely cancel salt reticle or fruit slingshot pull'}
                        </div>
                      </div>
                    </div>
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-[#2D231B] text-[#E74C3C] font-bold shrink-0">
                      {isJa ? '指を離す' : 'Lift finger'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: VISUALS & ACCESS */}
          {activeTab === 'DISPLAY' && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-[#241E19] border border-[#3D2E24] rounded-xl p-3.5 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#3498DB]">
                  <Eye size={14} />
                  <span>{isJa ? '画面表示 & アクセシビリティ' : 'Visual Comfort & Accessibility'}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Trajectory Guide */}
                  <button
                    id="settings-trajectory-btn"
                    onClick={() => onUpdateSettings({ showTrajectoryGuide: !settings.showTrajectoryGuide })}
                    className={`p-3 rounded-lg border text-left text-xs font-bold transition-all cursor-pointer ${
                      settings.showTrajectoryGuide
                        ? 'bg-[#3498DB]/20 border-[#3498DB] text-white'
                        : 'bg-[#1C1814] border-[#382B22] text-[#8A7B6D]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold">{isJa ? '軌道ガイド' : 'Trajectory Guide'}</div>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#1A2332] text-[#93C5FD]">
                        {settings.showTrajectoryGuide ? 'ON' : 'OFF'}
                      </span>
                    </div>
                    <div className="text-[11px] font-normal text-[#A89886] mt-1">
                      {settings.showTrajectoryGuide
                        ? (isJa ? '射出方向の予測ドットを表示' : 'Predictive launch arc dots visible')
                        : (isJa ? '軌道予測を非表示（上級者向け）' : 'Trajectory dots hidden (expert mode)')}
                    </div>
                  </button>

                  {/* High Contrast */}
                  <button
                    id="settings-contrast-btn"
                    onClick={() => onUpdateSettings({ highContrast: !settings.highContrast })}
                    className={`p-3 rounded-lg border text-left text-xs font-bold transition-all cursor-pointer ${
                      settings.highContrast
                        ? 'bg-[#3498DB]/20 border-[#3498DB] text-white'
                        : 'bg-[#1C1814] border-[#382B22] text-[#8A7B6D]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold">{isJa ? '高コントラスト / 色覚補正' : 'High Contrast Mode'}</div>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#1A2332] text-[#93C5FD]">
                        {settings.highContrast ? 'ON' : 'OFF'}
                      </span>
                    </div>
                    <div className="text-[11px] font-normal text-[#A89886] mt-1">
                      {settings.highContrast
                        ? (isJa ? '輪郭線・彩度を強調' : 'Outlines & contrast enhanced')
                        : (isJa ? '標準の和風カラーパレット' : 'Standard sumo earth-tone palette')}
                    </div>
                  </button>

                  {/* Reduced Motion */}
                  <button
                    id="settings-motion-btn"
                    onClick={() => onUpdateSettings({ reducedMotion: !settings.reducedMotion })}
                    className={`p-3 rounded-lg border text-left text-xs font-bold transition-all cursor-pointer ${
                      settings.reducedMotion
                        ? 'bg-[#3498DB]/20 border-[#3498DB] text-white'
                        : 'bg-[#1C1814] border-[#382B22] text-[#8A7B6D]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold">{isJa ? '視覚効果の軽減' : 'Reduced Motion'}</div>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#1A2332] text-[#93C5FD]">
                        {settings.reducedMotion ? 'REDUCED' : 'NORMAL'}
                      </span>
                    </div>
                    <div className="text-[11px] font-normal text-[#A89886] mt-1">
                      {settings.reducedMotion
                        ? (isJa ? '画面の揺れ・衝撃エフェクトを無効化' : 'Screen shake & heavy trauma disabled')
                        : (isJa ? '迫力のある衝突揺れ演出' : 'Dynamic physics impact trauma enabled')}
                    </div>
                  </button>

                  {/* Arena Geometry Mode */}
                  <div className="p-3 rounded-lg border border-[#382B22] bg-[#1C1814] text-xs">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-white">{isJa ? '土俵形状' : 'Arena Geometry'}</div>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#2A201A] text-[#FFD700]">
                        {stats.arenaMode}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2">
                      {(['CIRCULAR', 'ELLIPTICAL', 'WOBBLE'] as ArenaMode[]).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => onSelectArenaMode(mode)}
                          className={`flex-1 py-1 text-[10px] font-bold rounded border transition-all cursor-pointer ${
                            stats.arenaMode === mode
                              ? 'bg-[#E67E22] text-white border-[#F39C12]'
                              : 'bg-[#241D17] text-[#A89886] border-[#3E3025] hover:text-white'
                          }`}
                        >
                          {mode === 'CIRCULAR' ? (isJa ? '円形' : 'Round') : mode === 'ELLIPTICAL' ? (isJa ? '楕円' : 'Oval') : (isJa ? '角型' : 'Wobble')}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MODES & ARENA */}
          {activeTab === 'MODES' && (
            <div className="space-y-4 animate-fade-in">
              {/* Game Mode Selection */}
              <div className="bg-[#241E19] border border-[#3D2E24] rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#FFD700]">
                  <Trophy size={14} />
                  <span>{isJa ? 'ゲームモード選択' : 'Select Game Mode'}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Classic */}
                  <button
                    id="mode-classic-btn"
                    onClick={() => onSelectGameMode('CLASSIC')}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                      stats.gameMode === 'CLASSIC'
                        ? 'bg-[#B7791F]/25 border-[#FFD700] text-white shadow-sm ring-1 ring-[#FFD700]'
                        : 'bg-[#1C1814] border-[#382B22] text-[#A89886] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-white">🏆 {isJa ? 'クラシック' : 'Classic Mode'}</div>
                      <span className="text-[10px] font-mono text-[#FFD700]">Endless</span>
                    </div>
                    <div className="text-[11px] text-[#A89886] mt-0.5">
                      {isJa ? '果物を合体させ最高スコアを目指す伝統の土俵' : 'High-score bumper bowl. Fuse fruits to reach Watermelon Yokozuna.'}
                    </div>
                  </button>

                  {/* Daily Basho */}
                  <button
                    id="mode-daily-btn"
                    onClick={() => onSelectGameMode('DAILY')}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                      stats.gameMode === 'DAILY'
                        ? 'bg-[#10B981]/25 border-[#10B981] text-white shadow-sm ring-1 ring-[#10B981]'
                        : 'bg-[#1C1814] border-[#382B22] text-[#A89886] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-white">📅 {isJa ? 'デイリー場所' : 'Daily Basho'}</div>
                      <span className="text-[10px] font-mono text-[#10B981]">
                        {stats.dailyBasho ? `Day #${stats.dailyBasho.dayNumber}` : 'Seeded'}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#A89886] mt-0.5">
                      {isJa ? '毎日固定シード・同一キューで挑むランク番付' : 'Daily seeded puzzle bout with fair leaderboard ranking.'}
                    </div>
                  </button>

                  {/* 2P Versus */}
                  <button
                    id="mode-versus-btn"
                    onClick={() => onSelectGameMode('VERSUS')}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                      stats.gameMode === 'VERSUS'
                        ? 'bg-[#E74C3C]/25 border-[#E74C3C] text-white shadow-sm ring-1 ring-[#E74C3C]'
                        : 'bg-[#1C1814] border-[#382B22] text-[#A89886] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-white">⚔️ {isJa ? '2P 対戦' : '2P Versus Match'}</div>
                      <span className="text-[10px] font-mono text-[#E74C3C]">Local 1v1</span>
                    </div>
                    <div className="text-[11px] text-[#A89886] mt-0.5">
                      {isJa ? '1台の端末で交代して戦う白熱の2人対戦' : 'Same-screen multiplayer. Push opponent fruits out to win.'}
                    </div>
                  </button>

                  {/* Career Tour */}
                  <button
                    id="mode-career-btn"
                    onClick={() => {
                      onClose();
                      onSelectGameMode('CAREER');
                    }}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                      stats.gameMode === 'CAREER'
                        ? 'bg-[#B7791F]/25 border-[#FFD700] text-white shadow-sm ring-1 ring-[#FFD700]'
                        : 'bg-[#1C1814] border-[#382B22] text-[#A89886] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-white">🗾 {isJa ? '番付巡業 (巡業の旅)' : 'Career Tour'}</div>
                      <span className="text-[10px] font-mono text-[#FFD700]">
                        {stats.campaign.completedLevelIds.length}/24 Bouts
                      </span>
                    </div>
                    <div className="text-[11px] text-[#A89886] mt-0.5">
                      {isJa ? '前相撲から横綱を目指す全24番付の本格相撲道' : '24-bout grand championship journey to become Yokozuna.'}
                    </div>
                  </button>

                  {/* Challenge */}
                  <button
                    id="mode-challenge-btn"
                    onClick={() => onSelectGameMode('CHALLENGE', 'BROKEN_TAWARA')}
                    className={`sm:col-span-2 p-3 rounded-lg border text-left transition-all cursor-pointer ${
                      stats.gameMode === 'CHALLENGE'
                        ? 'bg-[#9B59B6]/25 border-[#D2B4DE] text-white shadow-sm ring-1 ring-[#D2B4DE]'
                        : 'bg-[#1C1814] border-[#382B22] text-[#A89886] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-white">⚡ {isJa ? '決壊俵の試練' : 'Broken Rim Challenge'}</div>
                      <span className="text-[10px] font-mono text-[#D2B4DE]">Damaged Tawara</span>
                    </div>
                    <div className="text-[11px] text-[#A89886] mt-0.5">
                      {isJa ? '土俵の一部が破損した極限環境でのサバイバル' : 'A fractured rim opening exposes fruits to immediate ring-out hazards.'}
                    </div>
                  </button>
                </div>
              </div>

              {/* 2P Versus Turn Settings */}
              {stats.gameMode === 'VERSUS' && stats.versus && (
                <div className="bg-[#241E19] border border-[#3D2E24] rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#E74C3C]">
                    <Swords size={14} />
                    <span>{isJa ? '2P 対戦設定' : '2P Versus Match Settings'}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-[#1C1814] rounded-lg border border-[#382B22]">
                    <div className="pr-2">
                      <div className="text-xs font-bold text-white">
                        {isJa ? 'ターン交代の一時停止' : 'Pass & Play Turn Pause'}
                      </div>
                      <div className="text-[10px] text-[#8A7B6D] mt-0.5">
                        {stats.versus.passAndPlayPauseEnabled
                          ? (isJa ? '各ターンごとに確認バナーを表示' : 'Pause with confirmation banner between turns')
                          : (isJa ? 'シームレス連続プレイ（中断なし）' : 'Continuous seamless turns (no pause banners)')}
                      </div>
                    </div>
                    {onToggleVersusPassAndPlay && (
                      <button
                        id="settings-versus-pause-btn"
                        onClick={onToggleVersusPassAndPlay}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                          stats.versus.passAndPlayPauseEnabled
                            ? 'bg-[#E74C3C] text-white shadow-md'
                            : 'bg-[#2A201A] text-[#8A7B6D] hover:text-white border border-[#443226]'
                        }`}
                      >
                        {stats.versus.passAndPlayPauseEnabled ? 'PAUSE ON' : 'FAST FLOW'}
                      </button>
                    )}
                  </div>
                </div>
              )}

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
                            {isJa ? meta.descriptionJa : meta.description}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: GUIDES & ABOUT */}
          {activeTab === 'GUIDES' && (
            <div className="space-y-4 animate-fade-in">
              {/* Sumo Encyclopedias & Tutorials */}
              <div className="bg-[#241E19] border border-[#3D2E24] rounded-xl p-3.5 space-y-2.5">
                <div className="text-xs font-bold uppercase tracking-wider text-[#FFD700]">
                  {isJa ? '相撲図鑑・チュートリアル' : 'Sumo Knowledge & Encyclopedias'}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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
                        {isJa ? '稽古案内' : 'Interactive Tutorial'}
                      </div>
                      <div className="text-[10px] text-[#A89886]">{isJa ? '相撲の基本操作' : 'Step-by-step practice'}</div>
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
                        {isJa ? '決まり手図鑑' : 'Kimarite Book'}
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

              {/* Game Info & Technical Release Details */}
              <div className="bg-[#241E19] border border-[#3D2E24] rounded-xl p-3.5 space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-[#A89886]">
                  {isJa ? '作品情報 & クレジット' : 'Game Info & Release Details'}
                </div>
                <div className="p-3 bg-[#1C1814] rounded-lg border border-[#382B22] text-xs text-[#A89886] space-y-1.5 leading-relaxed">
                  <div className="flex items-center justify-between text-white font-bold">
                    <span>Sumo Fruits: The Bumper Bowl</span>
                    <span className="font-mono text-[#FFD700]">v1.0.0 First Release</span>
                  </div>
                  <p>
                    {isJa
                      ? '本物志向の和風相撲物理アクション。合成・押し出し・決まり手・四股・神聖な塩による完全オフライン対応ゲームです。'
                      : 'Authentic Japanese sumo physics action. Features fusion merges, rim knockouts, 8 traditional kimarite, career tour, and sacred salt purification.'}
                  </p>
                  <div className="pt-2 flex items-center justify-between">
                    <button
                      id="settings-credits-btn"
                      onClick={() => {
                        onClose();
                        onOpenCredits();
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2A201A] hover:bg-[#3D2E24] border border-[#4B392C] text-white text-xs font-bold transition-all cursor-pointer"
                    >
                      <ShieldCheck size={14} className="text-[#3498DB]" />
                      <span>{isJa ? '権利表記・オープンソース' : 'Legal Credits & Licenses'}</span>
                    </button>
                    <span className="text-[10px] font-mono text-[#6E6356]">Zero external server dependencies</span>
                  </div>
                </div>
              </div>

              {/* User Data & Reset (App Store Compliance Guideline 5.1.1 & WebKit ITP Protection) */}
              <div className="bg-[#241E19] border border-[#3D2E24] rounded-xl p-3.5 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-[#A89886] flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Database size={14} className="text-[#3498DB]" />
                    <span>{isJa ? 'セーブデータ管理・バックアップ' : 'Save Data & Backup Management'}</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#6E6356]">Local Storage</span>
                </div>

                {/* iOS WebKit 7-Day Storage Eviction Notice */}
                <div className="p-2.5 bg-[#1A232D] rounded-lg border border-[#2D3E4F] text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-[#5DADE2] font-bold text-[11px]">
                    <Smartphone size={13} />
                    <span>{isJa ? 'iOS Safari 7日間自動消去への対策' : 'iOS Safari 7-Day Eviction Notice'}</span>
                  </div>
                  <p className="text-[#96AAB8] leading-relaxed text-[11px]">
                    {isJa
                      ? 'iOS Safariの仕様（ITP）により、7日間未起動だとブラウザ内保存データが消去される場合があります。Safariの共有ボタン [↑] から「ホーム画面に追加」することで保護されます。また、下のバックアップ書き出しで保管も可能です。'
                      : 'iOS Safari evicts website local storage after 7 days of non-use (WebKit ITP). To protect your unlocked Kimarite and Career Tour progression indefinitely, tap Share [↑] in Safari and tap "Add to Home Screen", or export a backup file below.'}
                  </p>
                </div>

                {/* Export / Import buttons */}
                <div className="p-3 bg-[#1C1814] rounded-lg border border-[#382B22] text-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#E5D5C5]">
                      {isJa ? 'バックアップの書き出し / 復元' : 'Save Backup (Export / Import)'}
                    </span>
                    {exportFeedback && (
                      <span className="text-[11px] text-[#2ECC71] font-bold animate-pulse">
                        {exportFeedback}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      id="settings-export-backup-btn"
                      onClick={handleExportData}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#2A201A] hover:bg-[#3D2E24] border border-[#5A4535] text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
                    >
                      <Download size={13} className="text-[#F1C40F]" />
                      <span>{isJa ? 'バックアップ書き出し' : 'Export Save File'}</span>
                    </button>

                    <button
                      id="settings-open-import-btn"
                      onClick={() => setShowImport((v) => !v)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#2A201A] hover:bg-[#3D2E24] border border-[#5A4535] text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
                    >
                      <Upload size={13} className="text-[#3498DB]" />
                      <span>{isJa ? 'バックアップ復元' : 'Import Save File'}</span>
                    </button>
                  </div>

                  {/* Import Drawer/Form */}
                  {showImport && (
                    <div className="p-3 bg-[#241E19] rounded-lg border border-[#4B392C] space-y-2.5 animate-fade-in">
                      <div className="text-[11px] font-bold text-[#E5D5C5] flex items-center justify-between">
                        <span>{isJa ? 'バックアップJSONを選択または貼り付け' : 'Select .json file or paste backup data'}</span>
                        <button
                          onClick={() => setShowImport(false)}
                          className="text-[#8A7B6D] hover:text-white"
                        >
                          ✕
                        </button>
                      </div>

                      {/* File picker */}
                      <label className="flex items-center justify-center gap-2 p-2 border border-dashed border-[#5A4535] rounded-lg hover:border-[#8C6D53] bg-[#1C1814] cursor-pointer text-[#A89886] hover:text-white text-[11px] transition-colors">
                        <Upload size={14} />
                        <span>{isJa ? '.json ファイルを選択...' : 'Choose .json file...'}</span>
                        <input
                          type="file"
                          accept=".json,application/json"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>

                      {/* Or paste directly */}
                      <div className="space-y-1.5">
                        <textarea
                          rows={2}
                          value={importText}
                          onChange={(e) => setImportText(e.target.value)}
                          placeholder={isJa ? 'またはJSONテキストをここに貼り付け...' : 'Or paste JSON backup string here...'}
                          className="w-full p-2 bg-[#181410] border border-[#3D2E24] rounded-lg text-[11px] font-mono text-[#EDE2D4] placeholder-[#5A4B3D] focus:outline-none focus:border-[#E67E22]"
                        />
                        {importText.trim().length > 0 && (
                          <button
                            onClick={() => processImportString(importText)}
                            className="w-full py-1.5 rounded-lg bg-[#27AE60] hover:bg-[#219653] text-white font-bold text-xs transition-colors cursor-pointer"
                          >
                            {isJa ? 'この内容で復元する' : 'Apply Restored Data'}
                          </button>
                        )}
                      </div>

                      {importStatus && (
                        <div
                          className={`p-2 rounded text-xs font-bold ${
                            importStatus.type === 'SUCCESS'
                              ? 'bg-[#1A3322] border border-[#27AE60] text-[#2ECC71]'
                              : 'bg-[#3A1D1A] border border-[#78281F] text-[#E74C3C]'
                          }`}
                        >
                          {importStatus.msg}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Reset Progress Section */}
                <div className="p-3 bg-[#1C1814] rounded-lg border border-[#382B22] text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#A89886]">
                      {isJa ? '進行状況の完全初期化' : 'Reset All Progress'}
                    </span>
                    <span className="text-[10px] text-[#6E6356]">App Store 5.1.1</span>
                  </div>
                  <p className="text-[#8A7B6D] leading-relaxed text-[11px]">
                    {isJa
                      ? 'ハイスコア、習得した決まり手図鑑、巡業マップの進行状況を初期化します。'
                      : 'Permanently erase high scores, learned Kimarite techniques, and Career Tour progress.'}
                  </p>

                  {resetState === 'IDLE' && (
                    <button
                      id="settings-reset-data-btn"
                      onClick={() => setResetState('CONFIRM')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3A1D1A] hover:bg-[#4A2420] border border-[#78281F] text-[#E74C3C] text-xs font-bold transition-all cursor-pointer"
                    >
                      <Trash2 size={13} />
                      <span>{isJa ? 'セーブデータを初期化する' : 'Reset All Save Data'}</span>
                    </button>
                  )}

                  {resetState === 'CONFIRM' && (
                    <div className="p-2.5 rounded-lg bg-[#2B1715] border border-[#E74C3C]/50 space-y-2">
                      <div className="text-xs font-bold text-[#E74C3C]">
                        {isJa ? '本当に初期化しますか？この操作は取り消せません。' : 'Are you sure? All progress will be permanently erased.'}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          id="settings-confirm-reset-btn"
                          onClick={handleResetData}
                          className="px-3 py-1 rounded bg-[#E74C3C] hover:bg-[#C0392B] text-white text-xs font-bold transition-all cursor-pointer"
                        >
                          {isJa ? 'はい、全て消去' : 'Yes, Erase Everything'}
                        </button>
                        <button
                          id="settings-cancel-reset-btn"
                          onClick={() => setResetState('IDLE')}
                          className="px-3 py-1 rounded bg-[#2A201A] hover:bg-[#3D2E24] text-[#A89886] text-xs font-medium transition-all cursor-pointer"
                        >
                          {isJa ? 'キャンセル' : 'Cancel'}
                        </button>
                      </div>
                    </div>
                  )}

                  {resetState === 'DONE' && (
                    <div className="p-2 rounded bg-[#1A3322] border border-[#27AE60] text-[#2ECC71] text-xs font-bold flex items-center gap-2">
                      <span>✓</span>
                      <span>{isJa ? '初期化が完了しました。再起動中...' : 'Data erased. Reloading match...'}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-5 py-3 border-t border-[#3D2E24] bg-[#241E19] flex items-center justify-between text-xs text-[#A89886]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
            <span className="font-medium text-[11px]">{isJa ? 'ゲーム稼働中' : 'Engine Ready'}</span>
          </div>
          <motion.button
            id="settings-resume-play-btn"
            whileTap={{ scale: 0.94 }}
            whileHover={{ scale: 1.03 }}
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#E67E22] hover:bg-[#D35400] text-white font-bold shadow-md transition-colors cursor-pointer"
          >
            {isJa ? 'ゲームに戻る' : 'Resume Play'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  </AnimatePresence>
  );
};
