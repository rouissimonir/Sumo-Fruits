import React, { useEffect, useRef } from 'react';
import { GameEngine } from '../game/GameEngine';
import { getSquashScale } from '../physics/bowlMotion';
import { FRUIT_CATALOG, FruitTierData, HazardInstance, SumoFruitInstance } from '../types/game';

interface GameCanvasProps {
  engine: GameEngine;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ engine }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const primaryPointerId = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationId: number;
    let lastTime = performance.now();
    let accumulator = 0;
    const fixedStep = 1 / 120;

    // Handle high-DPI and responsive sizing with Retina 2x cap for mobile thermal efficiency
    let currentDpr = 1;
    const updateSize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      currentDpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.floor(width * currentDpr);
      canvas.height = Math.floor(height * currentDpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(currentDpr, 0, 0, currentDpr, 0, 0);

      engine.setArenaSize(width, height);
    };

    const resizeObserver = new ResizeObserver(() => updateSize());
    resizeObserver.observe(container);
    updateSize();

    // Main game loop with ProMotion 120Hz stability & anti-tunneling clamps
    const renderLoop = (now: number) => {
      if (document.hidden || engine.isPaused) {
        lastTime = now;
        accumulator = 0;
        animationId = requestAnimationFrame(renderLoop);
        return;
      }

      // Clamp frame delta-time to 0.033s (prevents physics tunneling on frame drops or tab switching)
      const frameTime = Math.min(0.033, (now - lastTime) / 1000);
      lastTime = now;

      // Fixed 120Hz physics sub-step accumulator
      accumulator = Math.min(0.033, accumulator + frameTime);
      while (accumulator >= fixedStep) {
        engine.update(fixedStep);
        accumulator -= fixedStep;
      }

      // Render
      const w = container.clientWidth;
      const h = container.clientHeight;

      ctx.setTransform(currentDpr, 0, 0, currentDpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.save();
      // Apply tabletop 180-degree inversion if active for Player 2
      const isTabletopFlipped =
        engine.gameMode === 'VERSUS' &&
        engine.versusManager.state.tabletopInversion &&
        engine.versusManager.state.playerTurn === 2;

      if (isTabletopFlipped) {
        ctx.translate(w / 2, h / 2);
        ctx.rotate(Math.PI);
        ctx.translate(-w / 2, -h / 2);
      }

      // Apply camera shake trauma
      ctx.translate(engine.cameraOffset.x, engine.cameraOffset.y);

      // 1. Background Dohyō Floor & Straw Bales
      drawBackground(ctx, w, h, engine);

      // 2. Salt Zones (Kiyome-no-Shio)
      drawSaltZones(ctx, engine);

      // 3. Trajectory Dots
      if (engine.showTrajectoryGuide) drawTrajectory(ctx, engine);

      // 4. Launcher Pedestal & Slingshot Bands
      drawLauncher(ctx, engine);

      // 5. Hazards (Ice, Bug, Wasabi, Chili, Rival Rikishi)
      drawHazards(ctx, engine.hazards);

      // 5.5 Telegraphed Rival Sumo Actions (slap fan / charge line)
      drawRivalTelegraph(ctx, engine);

      // 6. Sumo Fruits
      drawFruits(ctx, engine.fruits, engine);

      // 7. Loaded Fruit (if aiming or idle)
      if (engine.loadedFruit && engine.loadedFruit.state !== 'IN_RING') {
        drawFruit(ctx, engine.loadedFruit, engine, false);
      }

      // 8. Particles & Shockwaves
      drawParticles(ctx, engine);

      // 8.5 Sacred Salt Targeting Reticle
      if (engine.isSaltTargeting) {
        drawSaltTargetingReticle(ctx, engine);
      }

      // 9. Gyōji Referee Callout Banner
      if (engine.activeRefereeCall) {
        drawRefereeCallout(ctx, w, engine.activeRefereeCall);
      }

      // 9.1 Versus Quick Non-Blocking Turn Transition
      if (engine.versusTurnBanner) {
        drawVersusTurnBanner(ctx, w, engine.versusTurnBanner);
      }

      // 9.5 Technique Ribbons Stack
      if (!engine.activeRefereeCall && !engine.versusTurnBanner) drawTechniqueRibbons(ctx, engine);

      // 10. Overflow Alert Ring
      if (engine.isOverflowing) {
        drawOverflowVignette(ctx, engine);
      }

      // 11. Screen Visual Cues (Ring-Out & Kinboshi Flashes)
      drawScreenFlashes(ctx, w, h, engine);

      ctx.restore();

      animationId = requestAnimationFrame(renderLoop);
    };

    animationId = requestAnimationFrame(renderLoop);

    // Cancel active drags on backgrounding or window blur
    const handleBackgroundCancel = () => {
      primaryPointerId.current = null;
      engine.cancelDrag();
    };

    window.addEventListener('blur', handleBackgroundCancel);
    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleBackgroundCancel();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      window.removeEventListener('blur', handleBackgroundCancel);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [engine]);

  // Pointer event listeners
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;

    const isTabletopFlipped =
      engine.gameMode === 'VERSUS' &&
      engine.versusManager.state.tabletopInversion &&
      engine.versusManager.state.playerTurn === 2;

    if (isTabletopFlipped) {
      x = rect.width - x;
      y = rect.height - y;
    }

    return { x, y };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const { x, y } = getCanvasCoords(e);
    if (primaryPointerId.current === null) {
      if (engine.handlePointerDown(x, y)) primaryPointerId.current = e.pointerId;
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e);
    if (engine.isSaltTargeting || e.pointerId === primaryPointerId.current) {
      engine.handlePointerMove(x, y);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignored if not captured
    }
    if (e.pointerId === primaryPointerId.current) {
      primaryPointerId.current = null;
      engine.handlePointerUp();
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignored
    }
    if (e.pointerId === primaryPointerId.current) {
      primaryPointerId.current = null;
      engine.cancelDrag();
    }
  };

  return (
    <div
      ref={containerRef}
      id="game-canvas-container"
      className="relative w-full h-full select-none overflow-hidden touch-none cursor-crosshair bg-[#14120E]"
    >
      <canvas
        ref={canvasRef}
        id="game-canvas"
        role="application"
        aria-label="Sumo Fruits game arena. Drag the loaded fruit backward and release to launch."
        className="block w-full h-full"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onContextMenu={(e) => {
          e.preventDefault();
          if (engine.isSaltTargeting) {
            engine.cancelSaltTargeting();
          }
        }}
      />
    </div>
  );
};

// ==========================================
// RENDER HELPERS
// ==========================================

function drawBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  engine: GameEngine
) {
  const { centerX, centerY, radius, mode, radiusX, radiusY, wobbleX, wobbleY } = engine.arena;
  const isElliptical = mode === 'ELLIPTICAL';
  const rx = isElliptical ? radiusX : radius;
  const ry = isElliptical ? radiusY : radius;

  const cX = centerX + (mode === 'WOBBLE' ? wobbleX : 0);
  const cY = centerY + (mode === 'WOBBLE' ? wobbleY : 0);

  // Dark traditional tatami / wood background
  ctx.fillStyle = '#181512';
  ctx.fillRect(-20, -20, w + 40, h + 40);

  // Subtle tatami grid pattern
  ctx.strokeStyle = '#221D18';
  ctx.lineWidth = 1;
  const gridStep = 40;
  for (let x = 0; x < w; x += gridStep) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += gridStep) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Outer dohyō clay mound (square elevation)
  const squareW = rx * 2.22;
  const squareH = ry * 2.22;
  ctx.save();
  ctx.fillStyle = '#6E523A';
  ctx.beginPath();
  ctx.roundRect(
    cX - squareW / 2,
    cY - squareH / 2,
    squareW,
    squareH,
    18
  );
  ctx.fill();

  const condition = engine.arenaConditionManager.state;

  // Clay mound slope gradient (altered by wet clay condition)
  const isWetClay = condition.type === 'GRIPPY_CLAY';
  const moundGrad = ctx.createRadialGradient(
    cX,
    cY,
    radius * 0.35,
    cX,
    cY,
    radius * 1.12
  );
  if (isWetClay) {
    moundGrad.addColorStop(0, '#B89B72');
    moundGrad.addColorStop(0.7, '#8C6C42');
    moundGrad.addColorStop(0.96, '#5C4426');
    moundGrad.addColorStop(1, '#3B2915');
  } else {
    moundGrad.addColorStop(0, '#E1C89B');
    moundGrad.addColorStop(0.7, '#D4B886');
    moundGrad.addColorStop(0.96, '#B69665');
    moundGrad.addColorStop(1, '#8C6C42');
  }

  ctx.fillStyle = moundGrad;
  ctx.beginPath();
  if (isElliptical) {
    ctx.ellipse(cX, cY, rx, ry, 0, 0, Math.PI * 2);
  } else {
    ctx.arc(cX, cY, radius, 0, Math.PI * 2);
  }
  ctx.fill();

  // Wet clay water sheen effect
  if (isWetClay) {
    const shimmer = 0.5 + 0.5 * Math.sin(performance.now() * 0.003);
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.12 + 0.08 * shimmer})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cX, cY, radius * 0.55, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.font = 'bold 12px serif';
    ctx.textAlign = 'center';
    ctx.fillText('湿り土俵 • HIGH-GRIP CLAY', cX, cY - radius * 0.52);
  }

  // Shrine Breeze visual streaks & wind vector indicator
  if (condition.type === 'KAMIKAZE_WIND' && condition.windSpeed > 0) {
    const time = performance.now() * 0.001;
    const angle = condition.windAngle;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    ctx.save();
    ctx.strokeStyle = 'rgba(235, 245, 255, 0.28)';
    ctx.lineWidth = 1.8;
    ctx.setLineDash([14, 28]);

    for (let s = -2; s <= 2; s++) {
      const offsetP = s * 70;
      const perpX = -sinA * offsetP;
      const perpY = cosA * offsetP;
      const flow = ((time * condition.windSpeed * 0.6) % 300) - 150;

      ctx.beginPath();
      ctx.moveTo(cX + perpX - cosA * 220 + cosA * flow, cY + perpY - sinA * 220 + sinA * flow);
      ctx.lineTo(cX + perpX + cosA * 220 + cosA * flow, cY + perpY + sinA * 220 + sinA * flow);
      ctx.stroke();
    }
    ctx.restore();

    // Wind direction arrow widget in upper-right corner
    ctx.save();
    const widgetX = cX + radius * 0.72;
    const widgetY = cY - radius * 0.72;
    ctx.fillStyle = 'rgba(20, 30, 45, 0.75)';
    ctx.beginPath();
    ctx.arc(widgetX, widgetY, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(75, 150, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Arrow pointing in wind direction
    ctx.translate(widgetX, widgetY);
    ctx.rotate(angle);
    ctx.fillStyle = '#60A5FA';
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-8, -7);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-8, 7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Closing Ring danger zone & boundary line
  if (condition.type === 'CLOSING_RING' && condition.legalRadius < radius) {
    const legalR = condition.legalRadius;
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() * 0.008);

    // Danger ring zone fill (between legal boundary and outer bales)
    ctx.save();
    ctx.fillStyle = `rgba(231, 76, 60, ${0.16 + 0.08 * pulse})`;
    ctx.beginPath();
    ctx.arc(cX, cY, radius - 4, 0, Math.PI * 2);
    ctx.arc(cX, cY, legalR, 0, Math.PI * 2, true);
    ctx.fill();

    // Legal boundary glowing line
    ctx.strokeStyle = `rgba(231, 76, 60, ${0.75 + 0.25 * pulse})`;
    ctx.lineWidth = 3.5;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.arc(cX, cY, legalR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // Fever Mode golden radiant glow
  if (engine.isFever) {
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() * 0.012);
    ctx.strokeStyle = `rgba(255, 215, 0, ${0.55 + 0.45 * pulse})`;
    ctx.lineWidth = 14 + pulse * 6;
    ctx.beginPath();
    if (isElliptical) {
      ctx.ellipse(cX, cY, rx + 4, ry + 4, 0, 0, Math.PI * 2);
    } else {
      ctx.arc(cX, cY, radius + 4, 0, Math.PI * 2);
    }
    ctx.stroke();
  }

  // 16 Destructible Straw Bales (Tawara Ring)
  const bales = engine.strawBales;
  for (const bale of bales) {
    const isBroken = bale.health <= 0;
    const isDamaged = bale.health < bale.maxHealth && !isBroken;

    ctx.lineWidth = isBroken ? 3 : 11;
    ctx.lineCap = 'round';

    if (isBroken) {
      // Shattered breach gap
      ctx.strokeStyle = 'rgba(231, 76, 60, 0.45)';
      ctx.setLineDash([4, 6]);
    } else if (isDamaged) {
      // Fractured straw
      ctx.strokeStyle = '#D35400';
      ctx.setLineDash([12, 3]);
    } else {
      // Pristine straw bale
      ctx.strokeStyle = bale.index % 2 === 0 ? '#8B6532' : '#C79C5E';
      ctx.setLineDash([]);
    }

    ctx.beginPath();
    if (isElliptical) {
      ctx.ellipse(cX, cY, rx - 3, ry - 3, 0, bale.angleStart, bale.angleEnd);
    } else {
      ctx.arc(cX, cY, radius - 3, bale.angleStart, bale.angleEnd);
    }
    ctx.stroke();
  }
  ctx.setLineDash([]); // Reset line dash

  // Inner chalk circle (Janome)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  if (isElliptical) {
    ctx.ellipse(cX, cY, rx * 0.78, ry * 0.78, 0, 0, Math.PI * 2);
  } else {
    ctx.arc(cX, cY, radius * 0.78, 0, Math.PI * 2);
  }
  ctx.stroke();

  // Shikiri-sen (Two white starting lines in the center where wrestlers crouch)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  const lineHalfLen = radius * 0.16;
  const lineSpacing = radius * 0.12;

  // Left line
  ctx.beginPath();
  ctx.moveTo(cX - lineSpacing, cY - lineHalfLen);
  ctx.lineTo(cX - lineSpacing, cY + lineHalfLen);
  ctx.stroke();

  // Right line
  ctx.beginPath();
  ctx.moveTo(cX + lineSpacing, cY - lineHalfLen);
  ctx.lineTo(cX + lineSpacing, cY + lineHalfLen);
  ctx.stroke();

  // Center subtle bowl pit shadow
  const bowlShadow = ctx.createRadialGradient(
    cX,
    cY,
    10,
    cX,
    cY,
    radius * 0.7
  );
  bowlShadow.addColorStop(0, 'rgba(0, 0, 0, 0.16)');
  bowlShadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = bowlShadow;
  ctx.beginPath();
  if (isElliptical) {
    ctx.ellipse(cX, cY, rx * 0.7, ry * 0.7, 0, 0, Math.PI * 2);
  } else {
    ctx.arc(cX, cY, radius * 0.7, 0, Math.PI * 2);
  }
  ctx.fill();

  ctx.restore();
}

function drawSaltZones(ctx: CanvasRenderingContext2D, engine: GameEngine) {
  for (const zone of engine.saltZones) {
    const alpha = Math.min(1, zone.duration / 1.5);
    const pulse = 0.85 + 0.15 * Math.sin(performance.now() * 0.008);

    ctx.save();
    ctx.translate(zone.x, zone.y);

    // Glowing purification aura
    const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, zone.radius);
    grad.addColorStop(0, `rgba(180, 220, 255, ${0.45 * alpha})`);
    grad.addColorStop(0.7, `rgba(120, 180, 255, ${0.25 * alpha})`);
    grad.addColorStop(1, `rgba(255, 255, 255, 0)`);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, zone.radius * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Sacred perimeter rope
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.7 * alpha})`;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, zone.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Kanji "清" (Purify)
    ctx.fillStyle = `rgba(255, 255, 255, ${0.4 * alpha})`;
    ctx.font = 'bold 28px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('清', 0, 0);

    ctx.restore();
  }
}

function drawSaltTargetingReticle(ctx: CanvasRenderingContext2D, engine: GameEngine) {
  if (!engine.isSaltTargeting) return;
  const targetX = (engine.saltTargetPos.x !== 0 || engine.saltTargetPos.y !== 0)
    ? engine.saltTargetPos.x
    : engine.arena.centerX;
  const targetY = (engine.saltTargetPos.x !== 0 || engine.saltTargetPos.y !== 0)
    ? engine.saltTargetPos.y
    : engine.arena.centerY;
  const radius = 90;
  const now = performance.now();
  const pulse = 1 + 0.04 * Math.sin(now * 0.008);
  const rot = (now * 0.001) % (Math.PI * 2);

  ctx.save();
  ctx.translate(targetX, targetY);

  // Outer glow aura
  const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, radius * pulse);
  grad.addColorStop(0, 'rgba(147, 197, 253, 0.45)');
  grad.addColorStop(0.65, 'rgba(96, 165, 250, 0.22)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, radius * pulse, 0, Math.PI * 2);
  ctx.fill();

  // Shimenawa dashed ring (rotating slowly)
  ctx.save();
  ctx.rotate(rot);
  ctx.strokeStyle = '#93C5FD';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Subtle inner guideline ring
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.45, 0, Math.PI * 2);
  ctx.stroke();

  // Crosshair brackets
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 2;
  const chLen = 14;
  const chDist = radius + 6;
  [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].forEach((ang) => {
    const cos = Math.cos(ang);
    const sin = Math.sin(ang);
    ctx.beginPath();
    ctx.moveTo(cos * (chDist - chLen), sin * (chDist - chLen));
    ctx.lineTo(cos * chDist, sin * chDist);
    ctx.stroke();
  });

  // Kanji in center with dark outline for contrast
  ctx.font = 'bold 30px "Noto Serif JP", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#0F172A';
  ctx.fillText('清', 1, 1);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('清', 0, 0);

  // Floating prompt badge
  ctx.font = 'bold 12px sans-serif';
  const badgeText = '🧂 TAP THE DOHYŌ TO PURIFY';
  const textW = ctx.measureText(badgeText).width;
  const badgeY = radius + 22;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.strokeStyle = '#60A5FA';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(-textW / 2 - 12, badgeY - 12, textW + 24, 24, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#93C5FD';
  ctx.fillText(badgeText, 0, badgeY);

  ctx.restore();

  // Highlight any hazards in danger of being purified
  for (const h of engine.hazards) {
    if (h.ringOut || h.kind === 'CHILI' || h.kind === 'RIVAL') continue;
    const d = Math.hypot(h.x - targetX, h.y - targetY);
    if (d < radius + h.radius) {
      ctx.save();
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.radius + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#FDE68A';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PURIFY', h.x, h.y - h.radius - 8);
      ctx.restore();
    }
  }
}

function drawLauncher(ctx: CanvasRenderingContext2D, engine: GameEngine) {
  const { x, y } = engine.launcherPos;
  const drag = engine.dragPos;
  const isVersus = engine.gameMode === 'VERSUS';
  const playerTurn = isVersus ? engine.versusManager.state.playerTurn : 1;
  const teamThemeColor = !isVersus ? '#E67E22' : playerTurn === 1 ? '#E74C3C' : '#3498DB';
  const teamBaseBg = !isVersus ? '#4A3525' : playerTurn === 1 ? '#4A1C18' : '#182C4A';
  const hasFruitReady = !!engine.loadedFruit && engine.loadedFruit.state !== 'IN_RING';

  ctx.save();

  // Pedestal base
  if (isVersus) {
    ctx.save();
    ctx.shadowColor = teamThemeColor;
    ctx.shadowBlur = 12;
    ctx.fillStyle = teamThemeColor + '25';
    ctx.beginPath();
    ctx.ellipse(x, y + 23, 56, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.fillStyle = teamBaseBg;
  ctx.strokeStyle = !isVersus ? '#271B12' : playerTurn === 1 ? '#E74C3C' : '#3498DB';
  ctx.lineWidth = isVersus ? 3.5 : 3;
  ctx.beginPath();
  ctx.roundRect(x - 42, y + 14, 84, 18, 6);
  ctx.fill();
  ctx.stroke();

  // Launcher active turn tag
  if (isVersus) {
    ctx.save();
    const tagW = hasFruitReady ? 96 : 118;
    const tagH = 18;
    const tagX = x - tagW / 2;
    const tagY = y + 36;
    ctx.fillStyle = playerTurn === 1 ? 'rgba(50, 18, 16, 0.94)' : 'rgba(16, 32, 54, 0.94)';
    ctx.strokeStyle = teamThemeColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(tagX, tagY, tagW, tagH, 9);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const side = playerTurn === 1 ? '東 P1' : '西 P2';
    ctx.fillText(hasFruitReady ? `${side} TURN` : `${side} SHOT IN PLAY`, x, tagY + tagH / 2);
    ctx.restore();
  }

  // Left post
  ctx.fillStyle = '#6E4E37';
  ctx.beginPath();
  ctx.roundRect(x - 34, y - 18, 12, 36, 4);
  ctx.fill();
  ctx.stroke();

  // Right post
  ctx.beginPath();
  ctx.roundRect(x + 22, y - 18, 12, 36, 4);
  ctx.fill();
  ctx.stroke();

  // Rubber bands connecting to fruit/dragPos
  ctx.strokeStyle = teamThemeColor;
  ctx.lineWidth = 4.5;
  ctx.lineCap = 'round';

  const fruitX = engine.isDragging ? drag.x : x;
  const fruitY = engine.isDragging ? drag.y : y;

  // Left band
  ctx.beginPath();
  ctx.moveTo(x - 28, y - 10);
  ctx.lineTo(fruitX - 10, fruitY);
  ctx.stroke();

  // Right band
  ctx.beginPath();
  ctx.moveTo(x + 28, y - 10);
  ctx.lineTo(fruitX + 10, fruitY);
  ctx.stroke();

  ctx.restore();
}

function drawTrajectory(ctx: CanvasRenderingContext2D, engine: GameEngine) {
  if (engine.trajectoryPoints.length < 2) return;

  ctx.save();

  for (let i = 0; i < engine.trajectoryPoints.length; i++) {
    const pt = engine.trajectoryPoints[i];
    const alpha = 1 - (i / engine.trajectoryPoints.length) * 0.65;

    if (pt.impact) {
      // Impact target marker
      ctx.fillStyle = 'rgba(231, 76, 60, 0.85)';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Outer ripple ring
      ctx.strokeStyle = 'rgba(231, 76, 60, 0.6)';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 14, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = `rgba(255, 235, 160, ${alpha})`;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawFruits(
  ctx: CanvasRenderingContext2D,
  fruits: SumoFruitInstance[],
  engine: GameEngine
) {
  // Draw shadows first
  ctx.save();
  for (const fruit of fruits) {
    if (fruit.state === 'RING_OUT') continue;
    const cat = FRUIT_CATALOG[fruit.tier - 1];
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.beginPath();
    ctx.ellipse(
      fruit.x,
      fruit.y + cat.radius * 0.8,
      cat.radius * 0.9,
      cat.radius * 0.35,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
  ctx.restore();

  // Draw fruits
  for (const fruit of fruits) {
    drawFruit(ctx, fruit, engine, true);
  }
}

function drawFruit(
  ctx: CanvasRenderingContext2D,
  fruit: SumoFruitInstance,
  engine: GameEngine,
  inPlay: boolean
) {
  const cat = FRUIT_CATALOG[fruit.tier - 1];
  const radius = cat.radius;
  const mawashiColor = fruit.team === 'PLAYER' ? engine.getEquippedMawashiColor(cat.mawashiColor) : cat.mawashiColor;

  ctx.save();
  ctx.translate(fruit.x, fruit.y);

  // Fall animation scale & opacity
  if (fruit.state === 'RING_OUT') {
    const shockAlpha = Math.max(0, 1 - fruit.fallProgress * 1.35);
    ctx.strokeStyle = `rgba(255, 211, 92, ${shockAlpha})`;
    ctx.lineWidth = Math.max(3, radius * 0.07);
    ctx.beginPath();
    ctx.arc(0, 0, radius * (1.15 + fruit.fallProgress * 2.2), 0, Math.PI * 2);
    ctx.stroke();

    const scale = Math.max(0.1, 1 - fruit.fallProgress * 0.8);
    const alpha = Math.max(0, 1 - fruit.fallProgress);
    ctx.scale(scale, scale);
    ctx.globalAlpha = alpha;
  }

  // Calculate Squash & Stretch Scale:
  // s(t) = 1 + A * e^(-8t) * cos(24t), Sx = s(t), Sy = 1 / s(t)
  let scaleX = 1.0;
  let scaleY = 1.0;
  let rotation = 0;

  if (fruit.squash.active) {
    const s = getSquashScale(fruit.squash.amplitude, fruit.squash.elapsed);
    scaleX = s;
    scaleY = 1 / s;
    // Align with collision normal
    rotation = Math.atan2(fruit.squash.normalY, fruit.squash.normalX);
  } else if (fruit.state === 'CLASHING') {
    // 25Hz counter-phase vibration during Tsuppari clash:
    // s_A(t) = 1 + a * sin(2*pi*25*t)
    const clash = engine.mergeManager
      .getActiveClashes()
      .find((c) => c.id === fruit.clashId);
    if (clash) {
      const isFruitA = fruit.id === clash.fruitAId;
      const phase = isFruitA ? 1 : -1;
      const vib = 1 + 0.12 * phase * Math.sin(2 * Math.PI * 25 * clash.elapsedTime);
      scaleX = vib;
      scaleY = 1 / vib;
      rotation = Math.atan2(clash.normalY, clash.normalX);
    }
  }

  ctx.rotate(rotation);
  ctx.scale(scaleX, scaleY);
  ctx.rotate(-rotation); // Counter-rotation for face readability

  // 1. Verlet Mawashi Cloth Tails (drawn behind body)
  drawClothTail(ctx, fruit.leftTail, fruit.x, fruit.y, mawashiColor);
  drawClothTail(ctx, fruit.rightTail, fruit.x, fruit.y, mawashiColor);

  // 2. Fruit Body
  const bodyGrad = ctx.createRadialGradient(
    -radius * 0.35,
    -radius * 0.45,
    radius * 0.15,
    0,
    0,
    radius
  );
  bodyGrad.addColorStop(0, '#FFFFFF');
  bodyGrad.addColorStop(0.2, cat.color);
  bodyGrad.addColorStop(0.85, cat.secondaryColor);
  bodyGrad.addColorStop(1, '#000000');

  ctx.fillStyle = bodyGrad;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.lineWidth = Math.max(2, radius * 0.06);

  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Belly Ripple wave on impact
  if (fruit.ripple.active && inPlay) {
    const ripR = (fruit.ripple.elapsed / 0.8) * radius * 1.2;
    const ripAlpha = Math.max(0, 1 - fruit.ripple.elapsed / 0.8) * 0.6;
    ctx.strokeStyle = `rgba(255, 255, 255, ${ripAlpha})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, ripR, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 3. Sumo Topknot (Chonmage hairstyle)
  drawTopknot(ctx, radius, fruit.tier, cat.color);

  // 3.5 Botanical Fruit Features (Twin Stems, Seeds, Calyx, Stripes)
  drawFruitBotanicals(ctx, fruit.tier, radius);

  // 4. Mawashi (Thick Sumo Belt)
  const beltY = radius * 0.35;
  const beltH = Math.max(5, cat.faceDetails.mawashiWidth);
  ctx.fillStyle = mawashiColor;
  ctx.strokeStyle = '#1E1E1E';
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.ellipse(0, beltY, radius * 0.9, beltH, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Authentic Front Sumo Knot (Maetate / Sagari Silk Fold)
  drawMawashiKnot(ctx, beltY, beltH, radius, fruit.tier, mawashiColor, fruit.team);

  // 5. Animated Eyes & Expression
  drawFace(ctx, fruit, cat);

  if (fruit.team === 'RIVAL' && engine.rivalController.profile.id === 'TENGU_ORANGE') {
    drawTenguWarMask(ctx, radius, engine.rivalController.isVulnerable());
  }

  // 6. Out-of-bounds Closing Ring Danger Warning
  if (fruit.outOfBoundsTimer && fruit.outOfBoundsTimer > 0 && fruit.state === 'IN_RING') {
    const remaining = Math.max(0, 2.0 - fruit.outOfBoundsTimer);
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() * 0.02);

    ctx.save();
    ctx.translate(0, -radius - 18);
    ctx.fillStyle = `rgba(231, 76, 60, ${0.85 + 0.15 * pulse})`;
    ctx.beginPath();
    ctx.roundRect(-24, -10, 48, 20, 6);
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`⚠️ ${remaining.toFixed(1)}s`, 0, 0);
    ctx.restore();
  }

  // 7. Empowered Skill Active Aura
  if (fruit.empoweredSkill) {
    if (fruit.empoweredSkill === 'PALM_STRIKE') {
      const pulse = 0.85 + 0.15 * Math.sin(performance.now() * 0.01);
      ctx.save();
      ctx.strokeStyle = 'rgba(243, 156, 18, 0.75)';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.35 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✋', 0, -radius - 12);
      ctx.restore();
    } else if (fruit.empoweredSkill === 'TAIKO_PULSE') {
      const wave = (performance.now() * 0.005) % 1;
      ctx.save();
      ctx.strokeStyle = `rgba(192, 57, 43, ${1 - wave})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, radius + wave * 26, 0, Math.PI * 2);
      ctx.stroke();
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🥁', 0, -radius - 12);
      ctx.restore();
    }
  }

  // 8. Rival Guard Broken / Vulnerability Badge
  if (fruit.team === 'RIVAL' && engine.rivalController.isVulnerable()) {
    ctx.save();
    ctx.translate(0, -radius - 22);
    ctx.fillStyle = 'rgba(230, 126, 34, 0.95)';
    ctx.beginPath();
    ctx.roundRect(-54, -10, 108, 20, 6);
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 8.5px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚡ VULNERABLE · HIT SIDE', 0, 0);
    ctx.restore();
  } else if (fruit.team === 'RIVAL') {
    ctx.save();
    ctx.translate(0, -radius - 18);
    ctx.fillStyle = 'rgba(37, 45, 58, 0.94)';
    ctx.beginPath();
    ctx.roundRect(-34, -9, 68, 18, 6);
    ctx.fill();
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#E2E8F0';
    ctx.font = 'bold 8.5px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('◆ GUARD', 0, 0);
    ctx.restore();
  }

  ctx.restore();
}

function drawFruitBotanicals(
  ctx: CanvasRenderingContext2D,
  tier: number,
  radius: number
) {
  ctx.save();

  if (tier === 2) {
    // === TIER 2: CHERRY ===
    // Twin arching green stems with paired leaves
    ctx.strokeStyle = '#16A34A';
    ctx.lineWidth = Math.max(2, radius * 0.1);
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(0, -radius * 0.7);
    ctx.quadraticCurveTo(-radius * 0.4, -radius * 1.3, -radius * 0.3, -radius * 1.55);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, -radius * 0.7);
    ctx.quadraticCurveTo(radius * 0.35, -radius * 1.35, radius * 0.25, -radius * 1.6);
    ctx.stroke();

    // Twin leaves at stem junction
    ctx.fillStyle = '#22C55E';
    ctx.strokeStyle = '#15803D';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(-radius * 0.1, -radius * 1.45, radius * 0.22, radius * 0.1, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Glossy jewel specular shine
    ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
    ctx.beginPath();
    ctx.ellipse(-radius * 0.4, -radius * 0.4, radius * 0.24, radius * 0.12, -0.6, 0, Math.PI * 2);
    ctx.fill();
  } else if (tier === 4) {
    // === TIER 4: STRAWBERRY ===
    // 1. 5-point leafy green star calyx collar around topknot
    ctx.fillStyle = '#16A34A';
    ctx.strokeStyle = '#14532D';
    ctx.lineWidth = 1.2;
    const points = 5;
    for (let i = 0; i < points; i++) {
      const angle = -Math.PI / 2 + (i * Math.PI * 2) / points;
      const leafLen = radius * 0.48;
      const lx = Math.cos(angle) * leafLen;
      const ly = -radius * 0.75 + Math.sin(angle) * (leafLen * 0.6);
      ctx.beginPath();
      ctx.ellipse(lx, ly, radius * 0.14, radius * 0.08, angle + Math.PI / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // 2. Golden Strawberry Seeds across cheeks and belly
    ctx.fillStyle = '#FDE047';
    ctx.strokeStyle = '#CA8A04';
    ctx.lineWidth = 0.8;
    const seedCoords = [
      { x: -radius * 0.55, y: -radius * 0.1 },
      { x: radius * 0.55, y: -radius * 0.1 },
      { x: -radius * 0.35, y: radius * 0.12 },
      { x: radius * 0.35, y: radius * 0.12 },
      { x: -radius * 0.6, y: radius * 0.25 },
      { x: radius * 0.6, y: radius * 0.25 },
      { x: -radius * 0.25, y: -radius * 0.35 },
      { x: radius * 0.25, y: -radius * 0.35 },
      { x: 0, y: -radius * 0.38 },
      { x: -radius * 0.15, y: radius * 0.55 },
      { x: radius * 0.15, y: radius * 0.55 },
    ];
    for (const seed of seedCoords) {
      ctx.beginPath();
      ctx.ellipse(seed.x, seed.y, radius * 0.045, radius * 0.07, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  } else if (tier === 5) {
    // === TIER 5: PEACH ===
    // Rosy peach blush on cheeks
    ctx.fillStyle = 'rgba(244, 63, 94, 0.32)';
    ctx.beginPath();
    ctx.arc(-radius * 0.45, 0, radius * 0.22, 0, Math.PI * 2);
    ctx.arc(radius * 0.45, 0, radius * 0.22, 0, Math.PI * 2);
    ctx.fill();

    // Peach cleft indent curve down top center
    ctx.strokeStyle = 'rgba(180, 83, 9, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -radius * 0.95);
    ctx.quadraticCurveTo(0, -radius * 0.4, 0, -radius * 0.15);
    ctx.stroke();
  } else if (tier === 6) {
    // === TIER 6: ORANGE ===
    // Citrus peel pore dots
    ctx.fillStyle = 'rgba(194, 65, 12, 0.3)';
    for (let a = 0; a < Math.PI * 2; a += 0.75) {
      const px = Math.cos(a) * (radius * 0.65);
      const py = Math.sin(a) * (radius * 0.65);
      ctx.beginPath();
      ctx.arc(px, py, radius * 0.035, 0, Math.PI * 2);
      ctx.fill();
    }
    // Citrus leaf
    ctx.fillStyle = '#16A34A';
    ctx.beginPath();
    ctx.ellipse(radius * 0.25, -radius - 2, radius * 0.2, radius * 0.08, 0.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (tier === 7) {
    // === TIER 7: APPLE ===
    // 1. Woody brown stalk stem
    ctx.strokeStyle = '#78350F';
    ctx.lineWidth = Math.max(3, radius * 0.08);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -radius * 0.85);
    ctx.quadraticCurveTo(radius * 0.15, -radius * 1.3, radius * 0.12, -radius * 1.45);
    ctx.stroke();

    // 2. Crisp bright green pointed apple leaf
    ctx.fillStyle = '#84CC16';
    ctx.strokeStyle = '#4D7C0F';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(radius * 0.35, -radius * 1.3, radius * 0.25, radius * 0.12, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 3. Subtle vertical apple streaks
    ctx.strokeStyle = 'rgba(254, 202, 202, 0.22)';
    ctx.lineWidth = 1.5;
    for (let xOff = -radius * 0.6; xOff <= radius * 0.6; xOff += radius * 0.3) {
      ctx.beginPath();
      ctx.moveTo(xOff, -radius * 0.6);
      ctx.quadraticCurveTo(xOff * 1.15, 0, xOff, radius * 0.7);
      ctx.stroke();
    }
  } else if (tier === 10) {
    // === TIER 10: WATERMELON ===
    // Signature wavy dark green rind stripes
    ctx.strokeStyle = '#14532D';
    ctx.lineWidth = Math.max(4, radius * 0.11);
    ctx.lineCap = 'round';
    for (const mult of [-0.65, -0.3, 0.3, 0.65]) {
      ctx.beginPath();
      const sx = radius * mult;
      ctx.moveTo(sx * 0.8, -radius * 0.8);
      ctx.bezierCurveTo(
        sx * 1.25, -radius * 0.25,
        sx * 0.75, radius * 0.25,
        sx * 0.9, radius * 0.85
      );
      ctx.stroke();
    }
  } else if (tier === 11) {
    // === TIER 11: YOKOZUNA PINEAPPLE ===
    // Pineapple diamond scale grid
    ctx.strokeStyle = 'rgba(180, 83, 9, 0.35)';
    ctx.lineWidth = 2;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-radius * 0.7, i * 20);
      ctx.lineTo(radius * 0.7, (i + 2) * 20);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(radius * 0.7, i * 20);
      ctx.lineTo(-radius * 0.7, (i + 2) * 20);
      ctx.stroke();
    }
    // Crown spiky leaves
    ctx.fillStyle = '#16A34A';
    for (let a = -1.2; a <= 1.2; a += 0.6) {
      ctx.beginPath();
      ctx.ellipse(Math.sin(a) * (radius * 0.3), -radius - 12, radius * 0.12, radius * 0.28, a, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawMawashiKnot(
  ctx: CanvasRenderingContext2D,
  beltY: number,
  beltH: number,
  radius: number,
  tier: number,
  mawashiColor: string,
  team?: 'PLAYER' | 'RIVAL' | 'PLAYER_1' | 'PLAYER_2'
) {
  const knotW = Math.max(12, beltH * 1.3);
  const knotH = Math.max(8, beltH * 1.1);

  ctx.save();

  // Central woven silk loop/knot (Maetate)
  const isP1 = team === 'PLAYER_1';
  const isP2 = team === 'PLAYER_2';
  const goldAccent = isP1 ? '#FF6B6B' : isP2 ? '#4DABF7' : '#FFD700';

  // 1. Central knot base
  ctx.fillStyle = isP1 ? '#C0392B' : isP2 ? '#2980B9' : mawashiColor;
  ctx.strokeStyle = '#181512';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(-knotW * 0.5, beltY - knotH * 0.5, knotW, knotH, Math.max(2, knotH * 0.3));
  ctx.fill();
  ctx.stroke();

  // 2. Silk cord tie / Gold cord wrap in center
  ctx.fillStyle = goldAccent;
  ctx.beginPath();
  ctx.roundRect(-knotW * 0.18, beltY - knotH * 0.55, knotW * 0.36, knotH * 1.1, 2);
  ctx.fill();

  // 3. Sagari (hanging stiffened silk fringe cords from the front of the belt)
  const sagariCount = tier >= 9 ? 5 : tier >= 5 ? 3 : 2;
  const sagariLen = Math.max(6, beltH * 1.25);
  const sagariSpacing = Math.max(2.5, knotW / (sagariCount + 1));
  const startX = -((sagariCount - 1) * sagariSpacing) / 2;

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = Math.max(1, radius * 0.035);
  ctx.lineCap = 'round';

  for (let i = 0; i < sagariCount; i++) {
    const sx = startX + i * sagariSpacing;
    const sy = beltY + knotH * 0.35;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + (i - (sagariCount - 1) / 2) * 0.8, sy + sagariLen);
    ctx.stroke();
  }

  // 4. Yokozuna / Ozeki Grand Champion Sacred Emblems (Tier 10 & 11)
  if (tier === 11) {
    // Yokozuna Sacred White Shide (Zigzag ceremonial paper ornaments)
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#B0BEC5';
    ctx.lineWidth = 0.8;
    for (const offset of [-knotW * 0.7, knotW * 0.7]) {
      ctx.beginPath();
      ctx.moveTo(offset, beltY - 2);
      ctx.lineTo(offset + 3, beltY + 3);
      ctx.lineTo(offset, beltY + 8);
      ctx.lineTo(offset + 4, beltY + 12);
      ctx.lineTo(offset + 1, beltY + 14);
      ctx.stroke();
    }
  } else if (tier >= 9) {
    // Sekiwake / Ozeki small gold crest stud
    ctx.fillStyle = '#FFE066';
    ctx.beginPath();
    ctx.arc(0, beltY, Math.max(1.8, knotH * 0.22), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawClothTail(
  ctx: CanvasRenderingContext2D,
  tail: { particles: { x: number; y: number }[] },
  fruitX: number,
  fruitY: number,
  color: string
) {
  if (tail.particles.length < 3) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  // Relative coordinates
  const p0 = { x: tail.particles[0].x - fruitX, y: tail.particles[0].y - fruitY };
  const p1 = { x: tail.particles[1].x - fruitX, y: tail.particles[1].y - fruitY };
  const p2 = { x: tail.particles[2].x - fruitX, y: tail.particles[2].y - fruitY };

  ctx.moveTo(p0.x, p0.y);
  ctx.quadraticCurveTo(p1.x, p1.y, p2.x, p2.y);
  ctx.stroke();
  ctx.restore();
}

function drawTopknot(
  ctx: CanvasRenderingContext2D,
  radius: number,
  tier: number,
  fruitColor: string
) {
  ctx.save();
  // Hair bun / leaf crown on top
  ctx.fillStyle = '#2C3E50';
  ctx.strokeStyle = '#1A252F';
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.ellipse(0, -radius - 4, radius * 0.22, radius * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Golden ring band
  ctx.fillStyle = '#F1C40F';
  ctx.fillRect(-radius * 0.12, -radius - 1, radius * 0.24, 3);

  ctx.restore();
}

function drawFace(
  ctx: CanvasRenderingContext2D,
  fruit: SumoFruitInstance,
  cat: FruitTierData
) {
  const { eyeOffset, eyeSize, pupilSize } = cat.faceDetails;
  const eyeY = -cat.radius * 0.15;

  // Calculate eye target pupil vector
  let pupilDx = 0;
  let pupilDy = 0;

  if (fruit.lookTarget) {
    const dx = fruit.lookTarget.x - fruit.x;
    const dy = fruit.lookTarget.y - fruit.y;
    const d = Math.hypot(dx, dy) || 1;
    const maxLook = pupilSize * 0.8;
    pupilDx = (dx / d) * maxLook;
    pupilDy = (dy / d) * maxLook;
  }

  // Sclera (eyeballs)
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#1E1E1E';
  ctx.lineWidth = 1.5;

  // Left eye
  ctx.beginPath();
  ctx.arc(-eyeOffset, eyeY, eyeSize, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Right eye
  ctx.beginPath();
  ctx.arc(eyeOffset, eyeY, eyeSize, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Eyebrows & pupils
  ctx.fillStyle = '#111111';
  if (fruit.state === 'CLASHING') {
    // Fierce angry clash expression
    ctx.beginPath();
    ctx.arc(-eyeOffset + pupilDx, eyeY + pupilDy, pupilSize, 0, Math.PI * 2);
    ctx.arc(eyeOffset + pupilDx, eyeY + pupilDy, pupilSize, 0, Math.PI * 2);
    ctx.fill();

    // Gritted teeth
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 2;
    ctx.strokeRect(-cat.radius * 0.22, eyeY + eyeSize * 1.5, cat.radius * 0.44, 4);

    // Angry eyebrows
    ctx.beginPath();
    ctx.moveTo(-eyeOffset - eyeSize, eyeY - eyeSize * 1.2);
    ctx.lineTo(-eyeOffset + eyeSize, eyeY - eyeSize * 0.4);
    ctx.moveTo(eyeOffset + eyeSize, eyeY - eyeSize * 1.2);
    ctx.lineTo(eyeOffset - eyeSize, eyeY - eyeSize * 0.4);
    ctx.stroke();
  } else if (fruit.panic || fruit.state === 'RING_OUT') {
    // Panic wide open eyes & screaming mouth
    ctx.beginPath();
    ctx.arc(-eyeOffset + pupilDx, eyeY + pupilDy, pupilSize * 0.7, 0, Math.PI * 2);
    ctx.arc(eyeOffset + pupilDx, eyeY + pupilDy, pupilSize * 0.7, 0, Math.PI * 2);
    ctx.fill();

    // Screaming open mouth
    ctx.fillStyle = '#C0392B';
    ctx.beginPath();
    ctx.ellipse(0, eyeY + eyeSize * 1.8, cat.radius * 0.16, cat.radius * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Sweat drop
    ctx.fillStyle = '#3498DB';
    ctx.beginPath();
    ctx.arc(eyeOffset + eyeSize * 1.2, eyeY - eyeSize, 3, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Confident rikishi neutral gaze
    ctx.beginPath();
    ctx.arc(-eyeOffset + pupilDx, eyeY + pupilDy, pupilSize, 0, Math.PI * 2);
    ctx.arc(eyeOffset + pupilDx, eyeY + pupilDy, pupilSize, 0, Math.PI * 2);
    ctx.fill();

    // Small mouth smile/line
    ctx.strokeStyle = '#222222';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, eyeY + eyeSize * 1.4, cat.radius * 0.12, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
  }
}

function drawTenguWarMask(
  ctx: CanvasRenderingContext2D,
  radius: number,
  vulnerable: boolean
) {
  ctx.save();

  // White brow paint and a long red nose make the first boss readable at a
  // glance even when the playfield is crowded with ordinary Orange fruits.
  ctx.strokeStyle = '#FFF7E6';
  ctx.lineWidth = Math.max(3, radius * 0.075);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-radius * 0.42, -radius * 0.34);
  ctx.lineTo(-radius * 0.12, -radius * 0.25);
  ctx.moveTo(radius * 0.42, -radius * 0.34);
  ctx.lineTo(radius * 0.12, -radius * 0.25);
  ctx.stroke();

  const noseGradient = ctx.createLinearGradient(0, -radius * 0.12, 0, radius * 0.28);
  noseGradient.addColorStop(0, '#EF4444');
  noseGradient.addColorStop(1, '#991B1B');
  ctx.fillStyle = noseGradient;
  ctx.strokeStyle = '#4C0519';
  ctx.lineWidth = Math.max(2, radius * 0.04);
  ctx.beginPath();
  ctx.moveTo(-radius * 0.1, -radius * 0.08);
  ctx.quadraticCurveTo(-radius * 0.05, radius * 0.17, 0, radius * 0.3);
  ctx.quadraticCurveTo(radius * 0.05, radius * 0.17, radius * 0.1, -radius * 0.08);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Small gold temple ornaments frame the face without hiding the eyes.
  ctx.fillStyle = '#FACC15';
  ctx.strokeStyle = '#713F12';
  ctx.lineWidth = 1.5;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * radius * 0.48, -radius * 0.2);
    ctx.lineTo(side * radius * 0.7, -radius * 0.36);
    ctx.lineTo(side * radius * 0.58, -radius * 0.04);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  if (vulnerable) {
    const pulse = 0.75 + 0.25 * Math.sin(performance.now() * 0.012);
    ctx.strokeStyle = `rgba(103, 232, 249, ${pulse})`;
    ctx.lineWidth = Math.max(3, radius * 0.06);
    ctx.setLineDash([radius * 0.16, radius * 0.1]);
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.12, Math.PI * 0.34, Math.PI * 0.66);
    ctx.arc(0, 0, radius * 1.12, Math.PI * 1.34, Math.PI * 1.66);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.restore();
}

function drawHazards(ctx: CanvasRenderingContext2D, hazards: HazardInstance[]) {
  for (const h of hazards) {
    ctx.save();
    ctx.translate(h.x, h.y);

    if (h.ringOut) {
      const scale = Math.max(0.1, 1 - h.fallProgress * 0.8);
      ctx.scale(scale, scale);
      ctx.globalAlpha = Math.max(0, 1 - h.fallProgress);
      ctx.strokeStyle = `rgba(255, 211, 92, ${Math.max(0, 1 - h.fallProgress)})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, h.radius * (1.25 + h.fallProgress * 1.8), 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.save();
    ctx.rotate(h.rotation);

    if (h.kind === 'ICE') {
      // Slippery Ice Cube
      ctx.fillStyle = 'rgba(125, 230, 255, 0.85)';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.5;
      const size = h.radius * 1.7;
      ctx.beginPath();
      ctx.roundRect(-size / 2, -size / 2, size, size, 5);
      ctx.fill();
      ctx.stroke();

      // Specular shine
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fillRect(-size * 0.35, -size * 0.35, size * 0.2, size * 0.4);

      const cracks = Math.max(1, h.crackLevel ?? 1);
      ctx.strokeStyle = 'rgba(32, 105, 145, 0.78)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-size * 0.05, -size * 0.42);
      ctx.lineTo(size * 0.03, -size * 0.12);
      ctx.lineTo(-size * 0.16, size * 0.1);
      if (cracks >= 2) {
        ctx.moveTo(size * 0.03, -size * 0.12);
        ctx.lineTo(size * 0.28, size * 0.04);
        ctx.lineTo(size * 0.18, size * 0.34);
      }
      if (cracks >= 3) {
        ctx.moveTo(-size * 0.16, size * 0.1);
        ctx.lineTo(-size * 0.34, size * 0.32);
        ctx.moveTo(size * 0.03, -size * 0.12);
        ctx.lineTo(size * 0.34, -size * 0.3);
      }
      ctx.stroke();
    } else if (h.kind === 'WASABI') {
      // Hit flash check
      const isHitFlash = (h.hitFlashTimer ?? 0) > 0;

      // Wasabi Puddle / Mound body
      ctx.fillStyle = isHitFlash ? '#A9DFBF' : '#27AE60';
      ctx.strokeStyle = isHitFlash ? '#FFFFFF' : '#1E8449';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, h.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Swirling top dollop
      ctx.fillStyle = isHitFlash ? '#D5F5E3' : '#2ECC71';
      ctx.beginPath();
      ctx.arc(-2, -3, h.radius * 0.6, 0, Math.PI * 2);
      ctx.fill();

      // Highlight
      ctx.fillStyle = '#E8F8F5';
      ctx.beginPath();
      ctx.arc(-4, -5, h.radius * 0.28, 0, Math.PI * 2);
      ctx.fill();

      // Mischievous Sludge Face
      if (isHitFlash) {
        // Pain squint eyes '> <'
        ctx.strokeStyle = '#145A32';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(-9, -2);
        ctx.lineTo(-4, 0);
        ctx.lineTo(-9, 2);
        ctx.moveTo(9, -2);
        ctx.lineTo(4, 0);
        ctx.lineTo(9, 2);
        ctx.stroke();
      } else {
        // Slanted menacing eyes
        ctx.fillStyle = '#145A32';
        ctx.beginPath();
        ctx.arc(-6, -2, 2.5, 0, Math.PI * 2);
        ctx.arc(6, -2, 2.5, 0, Math.PI * 2);
        ctx.fill();
        // Gritted squiggly mouth
        ctx.strokeStyle = '#145A32';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(-5, 5);
        ctx.lineTo(-2, 3);
        ctx.lineTo(2, 5);
        ctx.lineTo(5, 3);
        ctx.stroke();
      }
    } else if (h.kind === 'CHILI') {
      // Spicy Chili Pepper
      ctx.fillStyle = '#E74C3C';
      ctx.strokeStyle = '#922B21';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 2, h.radius * 0.7, h.radius * 1.2, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Green stem
      ctx.fillStyle = '#27AE60';
      ctx.beginPath();
      ctx.arc(0, -h.radius * 1.0, 4, 0, Math.PI * 2);
      ctx.fill();

      // Flame aura
      ctx.strokeStyle = 'rgba(243, 156, 18, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, h.radius * 1.3, 0, Math.PI * 2);
      ctx.stroke();
    } else if (h.kind === 'GINKO_MAGNET') {
      // Sacred Ginko Nut (Magnetic Attraction Zone)
      const pulse = 0.85 + 0.15 * Math.sin(performance.now() * 0.008);
      // Magnetic flux pulse circles
      ctx.strokeStyle = 'rgba(241, 196, 15, 0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, h.radius * 1.6 * pulse, 0, Math.PI * 2);
      ctx.stroke();

      // Golden Ginko Nut Shell
      ctx.fillStyle = '#F39C12';
      ctx.strokeStyle = '#B7950B';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, h.radius * 0.9, h.radius * 1.15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Radial leaf ridges
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -h.radius * 0.8);
      ctx.lineTo(0, h.radius * 0.8);
      ctx.moveTo(-h.radius * 0.5, 0);
      ctx.lineTo(h.radius * 0.5, 0);
      ctx.stroke();

      // Magnetic North/South polarity dots
      ctx.fillStyle = '#E74C3C';
      ctx.beginPath();
      ctx.arc(0, -h.radius * 0.45, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3498DB';
      ctx.beginPath();
      ctx.arc(0, h.radius * 0.45, 3.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (h.kind === 'RIVAL') {
      // Rival Tengu Sumo Wrestler
      ctx.fillStyle = '#6C3483';
      ctx.strokeStyle = '#1B0E23';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, h.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Black Mawashi Belt
      ctx.fillStyle = '#111111';
      ctx.fillRect(-h.radius * 0.85, h.radius * 0.15, h.radius * 1.7, h.radius * 0.45);

      // Gold Mawashi knot
      ctx.fillStyle = '#F39C12';
      ctx.beginPath();
      ctx.arc(0, h.radius * 0.35, 5, 0, Math.PI * 2);
      ctx.fill();

      // Fierce Tengu Mask Eyes
      ctx.fillStyle = '#F1C40F';
      ctx.beginPath();
      ctx.arc(-h.radius * 0.35, -h.radius * 0.2, 4.5, 0, Math.PI * 2);
      ctx.arc(h.radius * 0.35, -h.radius * 0.2, 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(-h.radius * 0.35, -h.radius * 0.2, 2, 0, Math.PI * 2);
      ctx.arc(h.radius * 0.35, -h.radius * 0.2, 2, 0, Math.PI * 2);
      ctx.fill();

      // Sharp Red Tengu Beak / Nose
      ctx.fillStyle = '#C0392B';
      ctx.beginPath();
      ctx.moveTo(-4, -h.radius * 0.1);
      ctx.lineTo(4, -h.radius * 0.1);
      ctx.lineTo(0, h.radius * 0.15);
      ctx.closePath();
      ctx.fill();

      // Horns
      ctx.fillStyle = '#D4AC0D';
      ctx.beginPath();
      ctx.moveTo(-h.radius * 0.6, -h.radius * 0.7);
      ctx.lineTo(-h.radius * 0.35, -h.radius * 1.2);
      ctx.lineTo(-h.radius * 0.2, -h.radius * 0.7);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(h.radius * 0.6, -h.radius * 0.7);
      ctx.lineTo(h.radius * 0.35, -h.radius * 1.2);
      ctx.lineTo(h.radius * 0.2, -h.radius * 0.7);
      ctx.fill();
    } else if (h.kind === 'ARMOR_BUG') {
      // Armored Beetle (Carapace pest with shield guard marks)
      const isHitFlash = (h.hitFlashTimer ?? 0) > 0;
      ctx.fillStyle = isHitFlash ? '#A6ACAF' : '#2C3E50';
      ctx.strokeStyle = isHitFlash ? '#FFFFFF' : '#1A252F';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, 2, h.radius * 0.95, h.radius * 1.15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Steel armor plate segmentation
      ctx.strokeStyle = '#7F8C8D';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-h.radius * 0.7, -h.radius * 0.1);
      ctx.lineTo(h.radius * 0.7, -h.radius * 0.1);
      ctx.moveTo(-h.radius * 0.75, h.radius * 0.35);
      ctx.lineTo(h.radius * 0.75, h.radius * 0.35);
      ctx.stroke();

      // Wing split line
      ctx.strokeStyle = '#BDC3C7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -h.radius * 0.7);
      ctx.lineTo(0, h.radius * 0.9);
      ctx.stroke();

      // Armored beetle front horn
      ctx.fillStyle = '#1A252F';
      ctx.beginPath();
      ctx.moveTo(-h.radius * 0.25, -h.radius * 0.9);
      ctx.lineTo(0, -h.radius * 1.45);
      ctx.lineTo(h.radius * 0.25, -h.radius * 0.9);
      ctx.closePath();
      ctx.fill();

      // Mawashi belt on beetle
      ctx.fillStyle = '#111111';
      ctx.fillRect(-h.radius * 0.7, h.radius * 0.45, h.radius * 1.4, h.radius * 0.3);
      ctx.fillStyle = '#F39C12';
      ctx.beginPath();
      ctx.arc(0, h.radius * 0.6, 3, 0, Math.PI * 2);
      ctx.fill();

      // Amber eyes
      ctx.fillStyle = isHitFlash ? '#FFFFFF' : '#F39C12';
      ctx.beginPath();
      ctx.arc(-h.radius * 0.38, -h.radius * 0.55, 3.2, 0, Math.PI * 2);
      ctx.arc(h.radius * 0.38, -h.radius * 0.55, 3.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Rotten Beetle
      ctx.strokeStyle = '#1E1025';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(-h.radius * 0.68, -h.radius * 0.5);
      ctx.lineTo(-h.radius * 1.18, -h.radius * 0.82);
      ctx.lineTo(-h.radius * 1.34, -h.radius * 0.58);
      ctx.moveTo(h.radius * 0.68, -h.radius * 0.5);
      ctx.lineTo(h.radius * 1.18, -h.radius * 0.82);
      ctx.lineTo(h.radius * 1.34, -h.radius * 0.58);
      ctx.moveTo(-h.radius * 0.75, 0);
      ctx.lineTo(-h.radius * 1.28, h.radius * 0.25);
      ctx.moveTo(h.radius * 0.75, 0);
      ctx.lineTo(h.radius * 1.28, h.radius * 0.25);
      ctx.moveTo(-h.radius * 0.64, h.radius * 0.5);
      ctx.lineTo(-h.radius * 1.1, h.radius * 0.82);
      ctx.moveTo(h.radius * 0.64, h.radius * 0.5);
      ctx.lineTo(h.radius * 1.1, h.radius * 0.82);
      ctx.stroke();
      ctx.fillStyle = '#4A235A';
      ctx.strokeStyle = '#1E1025';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, h.radius * 0.95, h.radius * 1.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Wing split line
      ctx.strokeStyle = '#F1C40F';
      ctx.beginPath();
      ctx.moveTo(0, -h.radius * 0.9);
      ctx.lineTo(0, h.radius * 0.9);
      ctx.stroke();

      // Red menacing eyes
      ctx.fillStyle = '#E74C3C';
      ctx.beginPath();
      ctx.arc(-h.radius * 0.4, -h.radius * 0.7, 3, 0, Math.PI * 2);
      ctx.arc(h.radius * 0.4, -h.radius * 0.7, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore(); // Restore hazard rotation

    if (!h.ringOut && h.kind === 'BUG' && h.behaviorState === 'TELEGRAPH') {
      const dx = (h.intentDirX ?? 0) * 34;
      const dy = (h.intentDirY ?? -1) * 34;
      const angle = Math.atan2(dy, dx);
      ctx.strokeStyle = 'rgba(241, 196, 15, 0.9)';
      ctx.fillStyle = '#F1C40F';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(dx, dy);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(dx, dy);
      ctx.lineTo(dx - Math.cos(angle - 0.65) * 9, dy - Math.sin(angle - 0.65) * 9);
      ctx.lineTo(dx - Math.cos(angle + 0.65) * 9, dy - Math.sin(angle + 0.65) * 9);
      ctx.closePath();
      ctx.fill();
    }

    // Overhead Status Badges: clear indicator of name, status, and defeat mechanics
    if (!h.ringOut && h.kind === 'ARMOR_BUG') {
      const guardMarks = h.guardMarks ?? 2;
      const badgeY = -h.radius - 23;
      const bWidth = 104;
      const bHeight = 24;

      ctx.fillStyle = 'rgba(24, 30, 36, 0.92)';
      ctx.strokeStyle = '#7F8C8D';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-bWidth / 2, badgeY, bWidth, bHeight, 6);
      ctx.fill();
      ctx.stroke();

      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = '#BDC3C7';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('ARMOR BUG', -bWidth / 2 + 6, badgeY + 7);

      // Guard mark shield pips (2 marks)
      for (let p = 0; p < 2; p++) {
        const isShieldActive = p < guardMarks;
        const px = bWidth / 2 - 20 + p * 10;
        ctx.fillStyle = isShieldActive ? '#3498DB' : '#566573';
        ctx.beginPath();
        ctx.arc(px, badgeY + 7, 3.5, 0, Math.PI * 2);
        ctx.fill();
        if (isShieldActive) {
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }

      ctx.font = '7.5px sans-serif';
      ctx.fillStyle = '#E5E7E9';
      ctx.textAlign = 'center';
      ctx.fillText('Palm Strike • Push Out', 0, badgeY + 17.5);
    } else if (!h.ringOut && h.kind === 'ICE') {
      const badgeY = -h.radius - 23;
      const bWidth = 100;
      const bHeight = 24;

      ctx.fillStyle = 'rgba(20, 28, 38, 0.92)';
      ctx.strokeStyle = '#3498DB';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-bWidth / 2, badgeY, bWidth, bHeight, 6);
      ctx.fill();
      ctx.stroke();

      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = '#7DE6FF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ICE BLOCK', 0, badgeY + 7);

      ctx.font = '7.5px sans-serif';
      ctx.fillStyle = '#D4E6F1';
      ctx.fillText('Palm Strike • Push Out', 0, badgeY + 17.5);
    } else if (!h.ringOut && h.kind === 'WASABI') {
      const currentHp = h.hp ?? 3;
      const badgeY = -h.radius - 23;

      // Badge pill background
      ctx.fillStyle = 'rgba(20, 24, 20, 0.92)';
      ctx.strokeStyle = '#27AE60';
      ctx.lineWidth = 1.5;
      const bWidth = 98;
      const bHeight = 24;
      ctx.beginPath();
      ctx.roundRect(-bWidth / 2, badgeY, bWidth, bHeight, 6);
      ctx.fill();
      ctx.stroke();

      // Title
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = '#A9DFBF';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('WASABI', -bWidth / 2 + 6, badgeY + 7);

      // HP pips (3 dots)
      for (let p = 0; p < 3; p++) {
        ctx.fillStyle = p < currentHp ? '#2ECC71' : '#3E4A3E';
        ctx.beginPath();
        ctx.arc(bWidth / 2 - 27 + p * 8.5, badgeY + 7, 3, 0, Math.PI * 2);
        ctx.fill();
        if (p < currentHp) {
          ctx.strokeStyle = '#A9DFBF';
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }

      // Action guide subtitle
      ctx.font = '7.5px sans-serif';
      ctx.fillStyle = '#D5F5E3';
      ctx.textAlign = 'center';
      ctx.fillText('Hit 3x • Push Out • Taiko/Salt', 0, badgeY + 17.5);
    }

    ctx.restore(); // Restore translation and alpha
  }
}

function drawParticles(ctx: CanvasRenderingContext2D, engine: GameEngine) {
  for (const p of engine.particles) {
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.save();

    if (p.type === 'RIPPLE') {
      const r = (1 - alpha) * p.size;
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.75})`;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.stroke();
    } else if (p.type === 'CONFETTI') {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.life * 10);
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
    } else if (p.type === 'SALT') {
      // Diamond star salt crystal
      ctx.fillStyle = '#FFFFFF';
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.life * 6);
      ctx.beginPath();
      ctx.moveTo(0, -p.size);
      ctx.lineTo(p.size * 0.6, 0);
      ctx.lineTo(0, p.size);
      ctx.lineTo(-p.size * 0.6, 0);
      ctx.closePath();
      ctx.fill();
    } else if (p.type === 'FLAME') {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.5 + 0.5 * alpha), 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Spark / splash / dust
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

function drawRivalTelegraph(ctx: CanvasRenderingContext2D, engine: GameEngine) {
  const rival = engine.rivalController?.fruitInstance;
  const intent = engine.rivalController?.intent;
  if (!rival || rival.state === 'RING_OUT' || !intent) return;

  ctx.save();
  const shotsLeft = intent.shotsUntilAttack;
  const isImminent = shotsLeft <= 1;

  if (intent.type === 'TSUPPARI_SLAP') {
    // Telegraphed slap fan / cone
    const angle = Math.atan2(intent.dirY, intent.dirX);
    const cone = intent.coneAngle ?? (Math.PI / 4);
    const radius = intent.length || 100;

    ctx.translate(rival.x, rival.y);
    ctx.rotate(angle);
    ctx.fillStyle = isImminent ? 'rgba(231, 76, 60, 0.28)' : 'rgba(243, 156, 18, 0.2)';
    ctx.strokeStyle = isImminent ? 'rgba(231, 76, 60, 0.85)' : 'rgba(243, 156, 18, 0.65)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, -cone / 2, cone / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Turn indicator badge
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${shotsLeft} shot${shotsLeft > 1 ? 's' : ''}`, radius * 0.65, 0);
  } else if (intent.type === 'OSHIDASHI_PUSH') {
    // Telegraphed rush dashed line & target zone
    const targetX = intent.targetX ?? (rival.x + intent.dirX * intent.length);
    const targetY = intent.targetY ?? (rival.y + intent.dirY * intent.length);

    ctx.strokeStyle = isImminent ? 'rgba(230, 126, 34, 0.9)' : 'rgba(241, 196, 15, 0.65)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(rival.x, rival.y);
    ctx.lineTo(targetX, targetY);
    ctx.stroke();

    const arrowAngle = Math.atan2(targetY - rival.y, targetX - rival.x);
    ctx.setLineDash([]);
    ctx.fillStyle = isImminent ? '#E67E22' : '#F1C40F';
    ctx.beginPath();
    ctx.moveTo(targetX, targetY);
    ctx.lineTo(targetX - Math.cos(arrowAngle - 0.55) * 15, targetY - Math.sin(arrowAngle - 0.55) * 15);
    ctx.lineTo(targetX - Math.cos(arrowAngle + 0.55) * 15, targetY - Math.sin(arrowAngle + 0.55) * 15);
    ctx.closePath();
    ctx.fill();

    // Target bullseye
    ctx.fillStyle = isImminent ? 'rgba(230, 126, 34, 0.35)' : 'rgba(241, 196, 15, 0.25)';
    ctx.strokeStyle = isImminent ? 'rgba(230, 126, 34, 0.9)' : 'rgba(241, 196, 15, 0.65)';
    ctx.beginPath();
    ctx.arc(targetX, targetY, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Turn countdown indicator
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 9.5px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${shotsLeft}s`, targetX, targetY);
  }
  ctx.restore();
}

function drawRefereeCallout(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  call: { textJp: string; textRomaji: string; subText?: string; subtext?: string; color: string; duration?: number; timer?: number; maxTimer?: number }
) {
  const timeVal = call.duration ?? call.timer ?? 1;
  const alpha = Math.min(1, timeVal / 0.3);
  const scale = 0.95 + 0.05 * Math.sin(timeVal * 8);
  const subtitle = call.subText ?? call.subtext ?? '';

  ctx.save();
  const isMobile = canvasWidth < 640;
  const bannerY = isMobile ? 158 : 85;
  ctx.translate(canvasWidth / 2, bannerY);
  ctx.scale(scale, scale);
  ctx.globalAlpha = alpha;

  // Banner background
  const bannerW = Math.min(340, canvasWidth - 24);
  const bannerH = isMobile ? 54 : 68;
  ctx.fillStyle = 'rgba(18, 14, 10, 0.94)';
  ctx.strokeStyle = call.color;
  ctx.lineWidth = 2.5;

  ctx.beginPath();
  ctx.roundRect(-bannerW / 2, -bannerH / 2, bannerW, bannerH, 8);
  ctx.fill();
  ctx.stroke();

  // Decorative inner gold line
  ctx.strokeStyle = 'rgba(241, 196, 15, 0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(-bannerW / 2 + 4, -bannerH / 2 + 4, bannerW - 8, bannerH - 8, 5);
  ctx.stroke();

  // Kanji header
  ctx.fillStyle = call.color;
  ctx.font = `900 ${isMobile ? 17 : 24}px "Noto Serif JP", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(call.textJp, 0, isMobile ? -7 : -8);

  // Romaji title
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${isMobile ? 12 : 13}px sans-serif`;
  ctx.fillText(call.textRomaji, 0, isMobile ? 9 : 10);

  // Subtitle
  if (subtitle) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.font = `${isMobile ? 9 : 10}px sans-serif`;
    ctx.fillText(subtitle, 0, isMobile ? 21 : 24);
  }

  ctx.restore();
}

function drawVersusTurnBanner(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  banner: { player: 1 | 2; timer: number; maxTimer: number; name: string; jpName: string; color: string }
) {
  const progress = Math.max(0, Math.min(1, banner.timer / banner.maxTimer));
  const alpha = Math.min(1, progress / 0.25);
  const scale = 0.94 + 0.06 * Math.min(1, (1 - progress) * 6);

  ctx.save();
  const isMobile = canvasWidth < 640;
  const pillY = isMobile ? 116 : 124;
  ctx.translate(canvasWidth / 2, pillY);
  ctx.scale(scale, scale);
  ctx.globalAlpha = alpha;

  const pillW = isMobile ? 180 : 210;
  const pillH = isMobile ? 30 : 34;

  // Outer ambient glow
  ctx.shadowColor = banner.color;
  ctx.shadowBlur = 10;

  // Background
  ctx.fillStyle = banner.player === 1 ? 'rgba(46, 16, 14, 0.95)' : 'rgba(16, 30, 48, 0.95)';
  ctx.strokeStyle = banner.color;
  ctx.lineWidth = 1.75;
  ctx.beginPath();
  ctx.roundRect(-pillW / 2, -pillH / 2, pillW, pillH, pillH / 2);
  ctx.fill();
  ctx.stroke();

  ctx.shadowBlur = 0;

  // Emblem circle
  const emblemR = isMobile ? 10 : 12;
  const emblemX = -pillW / 2 + emblemR + 5;
  ctx.fillStyle = banner.color;
  ctx.beginPath();
  ctx.arc(emblemX, 0, emblemR, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = `900 ${isMobile ? 11 : 12}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(banner.player === 1 ? '東' : '西', emblemX, 0);

  // Turn title
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `900 ${isMobile ? 10 : 11}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const label = banner.player === 1 ? 'PLAYER 1 (EAST) TURN' : 'PLAYER 2 (WEST) TURN';
  ctx.fillText(label, 12, 0);

  ctx.restore();
}

function drawTechniqueRibbons(ctx: CanvasRenderingContext2D, engine: GameEngine) {
  const ribbons = engine.techniqueRibbons?.getActiveRibbons();
  if (!ribbons || ribbons.length === 0) return;

  ctx.save();
  const isMobile = ctx.canvas.clientWidth < 640;
  const visibleRibbons = isMobile ? ribbons.slice(0, 1) : ribbons;
  let startY = isMobile ? 150 : 120;
  for (let i = 0; i < visibleRibbons.length; i++) {
    const r = visibleRibbons[i];
    const alpha = Math.min(1, r.duration / 0.4);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(18, startY);

    const ribbonW = Math.min(230, ctx.canvas.clientWidth - 36);
    const ribbonH = 40;

    // Dark Japanese lacquered parchment background with subtle gradient
    ctx.fillStyle = 'rgba(24, 20, 16, 0.94)';
    ctx.strokeStyle = r.color;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(0, 0, ribbonW, ribbonH, 7);
    ctx.fill();
    ctx.stroke();

    // Color accent bar on the left
    ctx.fillStyle = r.color;
    ctx.beginPath();
    ctx.roundRect(0, 0, 5, ribbonH, [7, 0, 0, 7]);
    ctx.fill();

    // Icon or default badge
    const iconStr = r.icon || '🎌';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(iconStr, 19, ribbonH / 2);

    // Technique title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(r.title, 34, 16);

    // Subtitle
    ctx.fillStyle = 'rgba(237, 226, 212, 0.8)';
    ctx.font = '9.5px sans-serif';
    ctx.fillText(r.subtitle, 34, 30);

    // Kanji Badge on the right if provided
    if (r.kanji) {
      const kanjiBadgeW = 34;
      const kanjiBadgeH = 20;
      const kx = ribbonW - kanjiBadgeW - 8;
      const ky = (ribbonH - kanjiBadgeH) / 2;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(kx, ky, kanjiBadgeW, kanjiBadgeH, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = r.color;
      ctx.font = 'bold 10px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(r.kanji, kx + kanjiBadgeW / 2, ky + kanjiBadgeH / 2 + 1);
    }

    ctx.restore();
    startY += 46;
  }
  ctx.restore();
}

function drawScreenFlashes(ctx: CanvasRenderingContext2D, width: number, height: number, engine: GameEngine) {
  // Ring-out red hazard vignette flash
  if (engine.ringOutFlashTimer > 0) {
    const flashIntensity = Math.min(1, engine.ringOutFlashTimer / 0.45);
    ctx.save();
    const grad = ctx.createRadialGradient(
      width / 2,
      height / 2,
      Math.min(width, height) * 0.3,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.75
    );
    grad.addColorStop(0, 'rgba(231, 76, 60, 0)');
    grad.addColorStop(0.7, `rgba(231, 76, 60, ${0.28 * flashIntensity})`);
    grad.addColorStop(1, `rgba(192, 57, 43, ${0.55 * flashIntensity})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Ring-out warning text indicator
    ctx.fillStyle = `rgba(255, 230, 230, ${flashIntensity * 0.95})`;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('RING-OUT! 勇足', width / 2, height * 0.16);
    ctx.restore();
  }

  // Kinboshi golden victory shimmer flash
  if (engine.kinboshiFlashTimer > 0) {
    const flashIntensity = Math.min(1, engine.kinboshiFlashTimer / 0.35);
    ctx.save();
    const grad = ctx.createRadialGradient(
      width / 2,
      height / 2,
      Math.min(width, height) * 0.25,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.75
    );
    grad.addColorStop(0, `rgba(255, 215, 0, ${0.15 * flashIntensity})`);
    grad.addColorStop(0.8, `rgba(243, 156, 18, ${0.32 * flashIntensity})`);
    grad.addColorStop(1, `rgba(230, 126, 34, ${0.45 * flashIntensity})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
}

function drawOverflowVignette(ctx: CanvasRenderingContext2D, engine: GameEngine) {
  const { centerX, centerY, radius } = engine.arena;
  const pulse = 0.5 + 0.5 * Math.sin(performance.now() * 0.015);

  ctx.save();
  ctx.strokeStyle = `rgba(231, 76, 60, ${0.4 + 0.5 * pulse})`;
  ctx.lineWidth = 6;
  ctx.setLineDash([12, 8]);
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
