import React from 'react';
import { X, Sliders, RotateCcw, Copy, Check, Sparkles, Compass, Flame, ShieldAlert } from 'lucide-react';
import { ArenaMode, PhysicsTuning } from '../types/game';
import { GameEngine } from '../game/GameEngine';

interface ParameterTunerProps {
  isOpen: boolean;
  onClose: () => void;
  engine: GameEngine;
  currentMode: ArenaMode;
  tuning: PhysicsTuning;
}

export const ParameterTuner: React.FC<ParameterTunerProps> = ({
  isOpen,
  onClose,
  engine,
  currentMode,
  tuning,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const handleSliderChange = (key: keyof PhysicsTuning, value: number) => {
    engine.updateTuning({ [key]: value });
  };

  const handleModeChange = (mode: ArenaMode) => {
    engine.setArenaMode(mode);
  };

  const handleResetDefaults = () => {
    engine.updateTuning({
      slopeK: 0.55,
      escapeSpeed: 220,
      rimDamping: 0.65,
      clashDuration: 0.5,
      shockwaveImpulse: 380,
      restitution: 0.78,
    });
    engine.setArenaMode('CIRCULAR');
  };

  const handleApplyPreset = (name: string) => {
    if (name === 'STANDARD') {
      engine.updateTuning({
        slopeK: 0.55,
        escapeSpeed: 220,
        rimDamping: 0.65,
        clashDuration: 0.5,
        shockwaveImpulse: 380,
        restitution: 0.78,
      });
      engine.setArenaMode('CIRCULAR');
    } else if (name === 'BOUNCY') {
      engine.updateTuning({
        slopeK: 0.40,
        escapeSpeed: 280,
        rimDamping: 0.35,
        clashDuration: 0.35,
        shockwaveImpulse: 450,
        restitution: 0.90,
      });
      engine.setArenaMode('ELLIPTICAL');
    } else if (name === 'HEAVY') {
      engine.updateTuning({
        slopeK: 0.80,
        escapeSpeed: 300,
        rimDamping: 0.85,
        clashDuration: 0.6,
        shockwaveImpulse: 500,
        restitution: 0.55,
      });
      engine.setArenaMode('CIRCULAR');
    } else if (name === 'CHAOS') {
      engine.updateTuning({
        slopeK: 0.50,
        escapeSpeed: 190,
        rimDamping: 0.5,
        clashDuration: 0.3,
        shockwaveImpulse: 400,
        restitution: 0.85,
      });
      engine.setArenaMode('WOBBLE');
    }
  };

  const handleCopyGDScript = () => {
    const gdCode = `# Godot 4 Physics Parameters (Tuned in Sumo Fruits)
const ARENA_MODE: String = "${currentMode}"
const SLOPE_K: float = ${tuning.slopeK.toFixed(2)}
const ESCAPE_SPEED_THRESHOLD: float = ${tuning.escapeSpeed.toFixed(1)}
const RIM_DAMPING: float = ${tuning.rimDamping.toFixed(2)}
const CLASH_DURATION: float = ${tuning.clashDuration.toFixed(2)}
const SHOCKWAVE_IMPULSE: float = ${tuning.shockwaveImpulse.toFixed(1)}
const FRUIT_RESTITUTION: float = ${tuning.restitution.toFixed(2)}
`;
    navigator.clipboard.writeText(gdCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id="parameter-tuner-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150"
    >
      <div
        id="parameter-tuner-modal"
        className="relative w-full max-w-2xl max-h-[90vh] bg-[#14120E] border border-[#3E342B] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-[#EDE2D4]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#3E342B] bg-[#1C1814]">
          <div className="flex items-center gap-2.5">
            <Sliders className="text-[#F1C40F]" size={22} />
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                Godot Physics & Arena Tuner
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-[#27AE60] text-white rounded-full">
                  Live Sync
                </span>
              </h2>
              <p className="text-xs text-[#A89886]">
                Adjust real-time bowl acceleration, restitution, and Dohyō geometry.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="tuner-reset-btn"
              onClick={handleResetDefaults}
              className="flex items-center gap-1 text-xs text-[#A89886] hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-[#2A221B] transition-colors cursor-pointer"
              title="Reset all to defaults"
            >
              <RotateCcw size={14} />
              <span>Reset</span>
            </button>
            <button
              id="tuner-close-btn"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#A89886] hover:text-white hover:bg-[#3E342B] transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Content Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Dohyō Arena Geometry */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[#A89886] flex items-center gap-1.5 mb-2.5">
              <Compass size={14} className="text-[#3498DB]" />
              Dohyō Ring Geometry Mode
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                id="mode-btn-circular"
                onClick={() => handleModeChange('CIRCULAR')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  currentMode === 'CIRCULAR'
                    ? 'bg-[#2B4C7E] text-white border-[#3498DB] shadow-md'
                    : 'bg-[#1A1612] text-[#C9B9A6] border-[#3E342B] hover:bg-[#251F19]'
                }`}
              >
                <span className="text-base mb-1">⚪</span>
                <span>Standard Dohyō</span>
                <span className="text-[10px] text-white/70 font-normal mt-0.5">Circular Bowl</span>
              </button>

              <button
                id="mode-btn-elliptical"
                onClick={() => handleModeChange('ELLIPTICAL')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  currentMode === 'ELLIPTICAL'
                    ? 'bg-[#2B4C7E] text-white border-[#3498DB] shadow-md'
                    : 'bg-[#1A1612] text-[#C9B9A6] border-[#3E342B] hover:bg-[#251F19]'
                }`}
              >
                <span className="text-base mb-1">🥚</span>
                <span>Ozeki Oval</span>
                <span className="text-[10px] text-white/70 font-normal mt-0.5">Elliptical Axes</span>
              </button>

              <button
                id="mode-btn-wobble"
                onClick={() => handleModeChange('WOBBLE')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  currentMode === 'WOBBLE'
                    ? 'bg-[#2B4C7E] text-white border-[#3498DB] shadow-md'
                    : 'bg-[#1A1612] text-[#C9B9A6] border-[#3E342B] hover:bg-[#251F19]'
                }`}
              >
                <span className="text-base mb-1">🌊</span>
                <span>Dynamic Wobble</span>
                <span className="text-[10px] text-white/70 font-normal mt-0.5">Weight-Tilt Gyro</span>
              </button>
            </div>
          </div>

          {/* Section 2: Quick Presets */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[#A89886] flex items-center gap-1.5 mb-2.5">
              <Sparkles size={14} className="text-[#F1C40F]" />
              Physics Presets
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => handleApplyPreset('STANDARD')}
                className="bg-[#1A1612] hover:bg-[#2A221B] border border-[#3E342B] text-xs font-medium py-2 px-2.5 rounded-lg text-left transition-colors cursor-pointer"
              >
                <div className="font-bold text-white">🥋 Honbasho</div>
                <div className="text-[10px] text-[#A89886]">Balanced sumo</div>
              </button>
              <button
                onClick={() => handleApplyPreset('BOUNCY')}
                className="bg-[#1A1612] hover:bg-[#2A221B] border border-[#3E342B] text-xs font-medium py-2 px-2.5 rounded-lg text-left transition-colors cursor-pointer"
              >
                <div className="font-bold text-[#2ECC71]">⚡ Pinball Bowl</div>
                <div className="text-[10px] text-[#A89886]">High rebound</div>
              </button>
              <button
                onClick={() => handleApplyPreset('HEAVY')}
                className="bg-[#1A1612] hover:bg-[#2A221B] border border-[#3E342B] text-xs font-medium py-2 px-2.5 rounded-lg text-left transition-colors cursor-pointer"
              >
                <div className="font-bold text-[#E74C3C]">💥 Heavyweight</div>
                <div className="text-[10px] text-[#A89886]">Massive shockwave</div>
              </button>
              <button
                onClick={() => handleApplyPreset('CHAOS')}
                className="bg-[#1A1612] hover:bg-[#2A221B] border border-[#3E342B] text-xs font-medium py-2 px-2.5 rounded-lg text-left transition-colors cursor-pointer"
              >
                <div className="font-bold text-[#9B59B6]">🌀 Chaos Sea</div>
                <div className="text-[10px] text-[#A89886]">Dynamic wobble</div>
              </button>
            </div>
          </div>

          {/* Section 3: Live Sliders */}
          <div className="space-y-4">
            {/* Slope K */}
            <div className="bg-[#1A1612] border border-[#2C241C] p-3.5 rounded-xl space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-white flex items-center gap-1.5">
                  Bowl Slope Inward Pull (slope_k)
                </span>
                <span className="font-mono text-[#F1C40F] font-bold bg-[#2A221B] px-2 py-0.5 rounded">
                  {tuning.slopeK.toFixed(2)}
                </span>
              </div>
              <p className="text-[11px] text-[#A89886]">
                Parabolic inward acceleration pulling fruits toward the center of the Dohyō bowl.
              </p>
              <input
                id="slider-slope-k"
                type="range"
                min="0.10"
                max="1.50"
                step="0.05"
                value={tuning.slopeK}
                onChange={(e) => handleSliderChange('slopeK', Number(e.target.value))}
                className="w-full accent-[#F1C40F] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#7A6B5B] font-mono">
                <span>0.10 (Floaty)</span>
                <span>0.55 (Standard)</span>
                <span>1.50 (Steep Bowl)</span>
              </div>
            </div>

            {/* Escape Speed */}
            <div className="bg-[#1A1612] border border-[#2C241C] p-3.5 rounded-xl space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-white">Rim Escape Speed Threshold (v_escape)</span>
                <span className="font-mono text-[#3498DB] font-bold bg-[#2A221B] px-2 py-0.5 rounded">
                  {Math.round(tuning.escapeSpeed)} px/s
                </span>
              </div>
              <p className="text-[11px] text-[#A89886]">
                Minimum outward velocity required for a fruit to breach the straw bales and fly out.
              </p>
              <input
                id="slider-escape-speed"
                type="range"
                min="100"
                max="450"
                step="10"
                value={tuning.escapeSpeed}
                onChange={(e) => handleSliderChange('escapeSpeed', Number(e.target.value))}
                className="w-full accent-[#3498DB] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#7A6B5B] font-mono">
                <span>100 (Easy Ring-Out)</span>
                <span>220 (Standard)</span>
                <span>450 (Strict Trap)</span>
              </div>
            </div>

            {/* Restitution (Bounciness) */}
            <div className="bg-[#1A1612] border border-[#2C241C] p-3.5 rounded-xl space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-white">Fruit Restitution (Elasticity / Bounce)</span>
                <span className="font-mono text-[#2ECC71] font-bold bg-[#2A221B] px-2 py-0.5 rounded">
                  {tuning.restitution.toFixed(2)}
                </span>
              </div>
              <p className="text-[11px] text-[#A89886]">
                Coefficient of restitution upon body-to-body impacts and clashes.
              </p>
              <input
                id="slider-restitution"
                type="range"
                min="0.30"
                max="0.95"
                step="0.02"
                value={tuning.restitution}
                onChange={(e) => handleSliderChange('restitution', Number(e.target.value))}
                className="w-full accent-[#2ECC71] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#7A6B5B] font-mono">
                <span>0.30 (Dull Mud)</span>
                <span>0.78 (Sumo Bounce)</span>
                <span>0.95 (Pinball)</span>
              </div>
            </div>

            {/* Shockwave Impulse */}
            <div className="bg-[#1A1612] border border-[#2C241C] p-3.5 rounded-xl space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-white">Fusion Shockwave Force</span>
                <span className="font-mono text-[#E74C3C] font-bold bg-[#2A221B] px-2 py-0.5 rounded">
                  {Math.round(tuning.shockwaveImpulse)}
                </span>
              </div>
              <p className="text-[11px] text-[#A89886]">
                Radial knockback impulse blast delivered to neighboring fruits on successful fusion.
              </p>
              <input
                id="slider-shockwave"
                type="range"
                min="150"
                max="600"
                step="10"
                value={tuning.shockwaveImpulse}
                onChange={(e) => handleSliderChange('shockwaveImpulse', Number(e.target.value))}
                className="w-full accent-[#E74C3C] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#7A6B5B] font-mono">
                <span>150 (Gentle Ripple)</span>
                <span>380 (Standard)</span>
                <span>600 (Explosive)</span>
              </div>
            </div>

            {/* Rim Damping */}
            <div className="bg-[#1A1612] border border-[#2C241C] p-3.5 rounded-xl space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-white">Rim Friction & Damping (gamma)</span>
                <span className="font-mono text-[#9B59B6] font-bold bg-[#2A221B] px-2 py-0.5 rounded">
                  {tuning.rimDamping.toFixed(2)}
                </span>
              </div>
              <p className="text-[11px] text-[#A89886]">
                Velocity damping multiplier applied when wrestling fruits push against the straw boundary.
              </p>
              <input
                id="slider-rim-damping"
                type="range"
                min="0.20"
                max="0.95"
                step="0.05"
                value={tuning.rimDamping}
                onChange={(e) => handleSliderChange('rimDamping', Number(e.target.value))}
                className="w-full accent-[#9B59B6] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#7A6B5B] font-mono">
                <span>0.20 (Slippery)</span>
                <span>0.65 (Grip)</span>
                <span>0.95 (Sticky Straw)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-[#3E342B] bg-[#1C1814] flex items-center justify-between">
          <button
            id="tuner-copy-gdscript-btn"
            onClick={handleCopyGDScript}
            className="flex items-center gap-1.5 bg-[#251F19] hover:bg-[#342A22] text-[#EDE2D4] border border-[#3E342B] px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer shadow"
          >
            {copied ? <Check size={14} className="text-[#2ECC71]" /> : <Copy size={14} />}
            <span>{copied ? 'Copied GDScript constants!' : 'Copy Tuning Constants'}</span>
          </button>

          <button
            onClick={onClose}
            className="bg-[#2B4C7E] hover:bg-[#3498DB] text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer"
          >
            Done Tuning
          </button>
        </div>
      </div>
    </div>
  );
};
