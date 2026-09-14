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
  FolderArchive,
  Sparkles,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { GameStats } from '../game/GameEngine';
import { ArenaMode, GameModeType, SpinMode } from '../types/game';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: GameStats;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onTogglePause: () => void;
  onRestart: () => void;
  onSelectGameMode: (mode: GameModeType, challengeId?: string) => void;
  onSelectArenaMode: (mode: ArenaMode) => void;
  onSelectSpinMode?: (mode: SpinMode) => void;
  onOpenTierList: () => void;
  onOpenKimarite: () => void;
  onOpenTuner: () => void;
  onOpenGodotFiles: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  stats,
  soundEnabled,
  onToggleSound,
  onTogglePause,
  onRestart,
  onSelectGameMode,
  onSelectArenaMode,
  onSelectSpinMode,
  onOpenTierList,
  onOpenKimarite,
  onOpenTuner,
  onOpenGodotFiles,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col bg-[#1C1814] border-2 border-[#5A4535] rounded-2xl shadow-2xl overflow-hidden text-[#EDE2D4]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#3D2E24] bg-[#241E19]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#3E3125] border border-[#6B533E] flex items-center justify-center text-xl shadow-inner">
              ⚙️
            </div>
            <div>
              <h2 className="text-lg font-black tracking-wide text-white">
                Game Settings & Menu
              </h2>
              <p className="text-xs text-[#A89886]">
                Configure modes, dohyō arena, encyclopedias & match controls
              </p>
            </div>
          </div>
          <button
            id="settings-close-btn"
            onClick={onClose}
            className="p-2 rounded-xl bg-[#2E241D] hover:bg-[#3D2E24] text-[#A89886] hover:text-white transition-colors cursor-pointer"
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
              onClick={() => {
                onTogglePause();
              }}
              className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                stats.isPaused
                  ? 'bg-[#F39C12]/20 border-[#F39C12] text-[#FFD700]'
                  : 'bg-[#261F19] hover:bg-[#342A22] border-[#44362B] text-white'
              }`}
            >
              {stats.isPaused ? <Play size={18} className="text-[#FFD700]" /> : <Pause size={18} />}
              <span>{stats.isPaused ? 'Resume' : 'Pause'}</span>
            </button>

            <button
              id="settings-sound-btn"
              onClick={onToggleSound}
              className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                soundEnabled
                  ? 'bg-[#2ECC71]/15 border-[#2ECC71]/60 text-[#2ECC71]'
                  : 'bg-[#E74C3C]/15 border-[#E74C3C]/60 text-[#E74C3C]'
              }`}
            >
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              <span>{soundEnabled ? 'Audio On' : 'Muted'}</span>
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
              <span>Restart</span>
            </button>
          </div>

          {/* Game Mode Selection */}
          <div className="bg-[#241E19] border border-[#3D2E24] rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#FFD700]">
              <Trophy size={14} />
              <span>Game Mode</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                id="mode-classic-btn"
                onClick={() => onSelectGameMode('CLASSIC')}
                className={`py-2 px-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer text-center ${
                  stats.gameMode === 'CLASSIC'
                    ? 'bg-[#B7791F]/30 border-[#FFD700] text-white shadow-sm'
                    : 'bg-[#1C1814] border-[#382B22] text-[#A89886] hover:text-white'
                }`}
              >
                Classic
                <div className="text-[10px] font-normal text-[#8A7B6D] mt-0.5">Endless Bowl</div>
              </button>

              <button
                id="mode-career-btn"
                onClick={() => onSelectGameMode('CAREER')}
                className={`py-2 px-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer text-center ${
                  stats.gameMode === 'CAREER'
                    ? 'bg-[#B7791F]/30 border-[#FFD700] text-white shadow-sm'
                    : 'bg-[#1C1814] border-[#382B22] text-[#A89886] hover:text-white'
                }`}
              >
                Career
                <div className="text-[10px] font-normal text-[#8A7B6D] mt-0.5">
                  Banzuke {stats.careerStageIndex + 1}/5
                </div>
              </button>

              <button
                id="mode-challenge-btn"
                onClick={() => onSelectGameMode('CHALLENGE', 'BROKEN_TAWARA')}
                className={`py-2 px-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer text-center ${
                  stats.gameMode === 'CHALLENGE'
                    ? 'bg-[#9B59B6]/30 border-[#D2B4DE] text-white shadow-sm'
                    : 'bg-[#1C1814] border-[#382B22] text-[#A89886] hover:text-white'
                }`}
              >
                Challenge
                <div className="text-[10px] font-normal text-[#8A7B6D] mt-0.5">Broken Rim</div>
              </button>
            </div>
          </div>

          {/* Arena Dohyō Shape */}
          <div className="bg-[#241E19] border border-[#3D2E24] rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#3498DB]">
              <Compass size={14} />
              <span>Dohyō Arena Shape</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                id="arena-circle-btn"
                onClick={() => onSelectArenaMode('CIRCULAR')}
                className={`py-2 px-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer text-center ${
                  stats.arenaMode === 'CIRCULAR'
                    ? 'bg-[#3498DB]/20 border-[#3498DB] text-white'
                    : 'bg-[#1C1814] border-[#382B22] text-[#A89886] hover:text-white'
                }`}
              >
                Circular
                <div className="text-[10px] font-normal text-[#8A7B6D] mt-0.5">Standard Ring</div>
              </button>

              <button
                id="arena-oval-btn"
                onClick={() => onSelectArenaMode('ELLIPTICAL')}
                className={`py-2 px-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer text-center ${
                  stats.arenaMode === 'ELLIPTICAL'
                    ? 'bg-[#3498DB]/20 border-[#3498DB] text-white'
                    : 'bg-[#1C1814] border-[#382B22] text-[#A89886] hover:text-white'
                }`}
              >
                Elliptical
                <div className="text-[10px] font-normal text-[#8A7B6D] mt-0.5">Wide Oval</div>
              </button>

              <button
                id="arena-wobble-btn"
                onClick={() => onSelectArenaMode('WOBBLE')}
                className={`py-2 px-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer text-center ${
                  stats.arenaMode === 'WOBBLE'
                    ? 'bg-[#3498DB]/20 border-[#3498DB] text-white'
                    : 'bg-[#1C1814] border-[#382B22] text-[#A89886] hover:text-white'
                }`}
              >
                Wobble
                <div className="text-[10px] font-normal text-[#8A7B6D] mt-0.5">Shifting Tides</div>
              </button>
            </div>
          </div>

          {/* Launcher English Sidespin Presets */}
          {onSelectSpinMode && (
            <div className="bg-[#241E19] border border-[#3D2E24] rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#E67E22]">
                  <span>🌀 Launcher English Sidespin</span>
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
                  ↺ Left Curve
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
                  ↑ Direct
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
                  ↻ Right Curve
                  <div className="text-[10px] font-normal text-[#8A7B6D] mt-0.5">Clockwise Arc</div>
                </button>
              </div>
            </div>
          )}

          {/* Sumo Encyclopedias & Techniques */}
          <div className="bg-[#241E19] border border-[#3D2E24] rounded-xl p-3.5 space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-[#A89886]">
              Knowledge & Achievements
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                id="settings-kimarite-btn"
                onClick={() => {
                  onClose();
                  onOpenKimarite();
                }}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-[#1C1814] hover:bg-[#2F241C] border border-[#4B392C] text-left transition-all cursor-pointer group"
              >
                <div className="text-2xl">🥋</div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white group-hover:text-[#FFD700] truncate">
                    Kimarite Techniques
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
                    Fruit Roster
                  </div>
                  <div className="text-[10px] text-[#A89886]">11 Wrestler Tiers</div>
                </div>
              </button>
            </div>
          </div>

          {/* Developer & Engine Tools */}
          <div className="bg-[#241E19] border border-[#3D2E24] rounded-xl p-3.5 space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-[#A89886]">
              Godot Engine & Tuning Tools
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                id="settings-tuner-btn"
                onClick={() => {
                  onClose();
                  onOpenTuner();
                }}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-[#1C1814] hover:bg-[#2F241C] border border-[#4B392C] text-left transition-all cursor-pointer group"
              >
                <Sliders size={18} className="text-[#F1C40F] shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white group-hover:text-[#F1C40F] truncate">
                    Physics Tuner
                  </div>
                  <div className="text-[10px] text-[#A89886]">Slope, damp, restitution</div>
                </div>
              </button>

              <button
                id="settings-godot-btn"
                onClick={() => {
                  onClose();
                  onOpenGodotFiles();
                }}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-[#1C1814] hover:bg-[#2F241C] border border-[#4B392C] text-left transition-all cursor-pointer group"
              >
                <FolderArchive size={18} className="text-[#2ECC71] shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white group-hover:text-[#2ECC71] truncate">
                    Godot 4.3 .ZIP
                  </div>
                  <div className="text-[10px] text-[#A89886]">Export Engine Project</div>
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
            Resume Play
          </button>
        </div>
      </div>
    </div>
  );
};
