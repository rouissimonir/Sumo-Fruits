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

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationId: number;
    let lastTime = performance.now();

    // Handle high-DPI and responsive sizing
    const updateSize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      const dpr = window.devicePixelRatio || 1;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.resetTransform?.();
      ctx.scale(dpr, dpr);

      engine.setArenaSize(width, height);
    };

    const resizeObserver = new ResizeObserver(() => updateSize());
    resizeObserver.observe(container);
    updateSize();

    // Main game loop
    const renderLoop = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      // Update simulation
      engine.update(dt);

      // Render
      const w = container.clientWidth;
      const h = container.clientHeight;

      ctx.save();
      // Apply camera shake trauma
      ctx.translate(engine.cameraOffset.x, engine.cameraOffset.y);

      // 1. Background Dohyō Floor & Straw Bales
      drawBackground(ctx, w, h, engine);

      // 2. Salt Zones (Kiyome-no-Shio)
      drawSaltZones(ctx, engine);

      // 3. Trajectory Dots
      drawTrajectory(ctx, engine);

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

      // 9. Gyōji Referee Callout Banner
      if (engine.activeRefereeCall) {
        drawRefereeCallout(ctx, w, engine.activeRefereeCall);
      }

      // 9.5 Technique Ribbons Stack
      drawTechniqueRibbons(ctx, engine);

      // 10. Overflow Alert Ring
      if (engine.isOverflowing) {
        drawOverflowVignette(ctx, engine);
      }

      ctx.restore();

      animationId = requestAnimationFrame(renderLoop);
    };

    animationId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
    };
  }, [engine]);

  // Pointer event listeners
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const { x, y } = getCanvasCoords(e);
    engine.handlePointerDown(x, y);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e);
    engine.handlePointerMove(x, y);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignored if not captured
    }
    engine.handlePointerUp();
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
        className="block w-full h-full"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
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

  // Clay mound slope gradient
  const moundGrad = ctx.createRadialGradient(
    cX,
    cY,
    radius * 0.35,
    cX,
    cY,
    radius * 1.12
  );
  moundGrad.addColorStop(0, '#E1C89B');
  moundGrad.addColorStop(0.7, '#D4B886');
  moundGrad.addColorStop(0.96, '#B69665');
  moundGrad.addColorStop(1, '#8C6C42');

  ctx.fillStyle = moundGrad;
  ctx.beginPath();
  if (isElliptical) {
    ctx.ellipse(cX, cY, rx, ry, 0, 0, Math.PI * 2);
  } else {
    ctx.arc(cX, cY, radius, 0, Math.PI * 2);
  }
  ctx.fill();

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

function drawLauncher(ctx: CanvasRenderingContext2D, engine: GameEngine) {
  const { x, y } = engine.launcherPos;
  const drag = engine.dragPos;

  ctx.save();

  // Pedestal base
  ctx.fillStyle = '#4A3525';
  ctx.strokeStyle = '#271B12';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(x - 42, y + 14, 84, 18, 6);
  ctx.fill();
  ctx.stroke();

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
  ctx.strokeStyle = '#E67E22';
  ctx.lineWidth = 4;
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
      // Small prediction dot
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

  ctx.save();
  ctx.translate(fruit.x, fruit.y);

  // Fall animation scale & opacity
  if (fruit.state === 'RING_OUT') {
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
  drawClothTail(ctx, fruit.leftTail, fruit.x, fruit.y, cat.mawashiColor);
  drawClothTail(ctx, fruit.rightTail, fruit.x, fruit.y, cat.mawashiColor);

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
  drawTopknot(ctx, radius, cat.color);

  // 4. Mawashi (Thick Sumo Belt)
  const beltY = radius * 0.35;
  const beltH = cat.faceDetails.mawashiWidth;
  ctx.fillStyle = cat.mawashiColor;
  ctx.strokeStyle = '#1E1E1E';
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.ellipse(0, beltY, radius * 0.9, beltH, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Front knot
  ctx.fillStyle = '#D68910';
  ctx.beginPath();
  ctx.roundRect(-beltH * 0.7, beltY - beltH * 0.6, beltH * 1.4, beltH * 1.3, 3);
  ctx.fill();
  ctx.stroke();

  // 5. Animated Eyes & Expression
  drawFace(ctx, fruit, cat);

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

function drawHazards(ctx: CanvasRenderingContext2D, hazards: HazardInstance[]) {
  for (const h of hazards) {
    ctx.save();
    ctx.translate(h.x, h.y);

    if (h.ringOut) {
      const scale = Math.max(0.1, 1 - h.fallProgress * 0.8);
      ctx.scale(scale, scale);
      ctx.globalAlpha = Math.max(0, 1 - h.fallProgress);
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
    } else {
      // Rotten Beetle
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

    // Overhead Status Badge for Wasabi: clear indicator of name, HP, and defeat mechanics
    if (!h.ringOut && h.kind === 'WASABI') {
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
      ctx.fillText('Hit 3x • Push Out • Salt [S]', 0, badgeY + 17.5);
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

    // Target bullseye
    ctx.setLineDash([]);
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
  call: { textJp: string; textRomaji: string; subtext: string; color: string; duration?: number; timer?: number; maxTimer?: number }
) {
  const timeVal = call.duration ?? call.timer ?? 1;
  const alpha = Math.min(1, timeVal / 0.3);
  const scale = 0.95 + 0.05 * Math.sin(timeVal * 8);

  ctx.save();
  ctx.translate(canvasWidth / 2, 85);
  ctx.scale(scale, scale);
  ctx.globalAlpha = alpha;

  // Banner background
  const bannerW = 340;
  const bannerH = 68;
  ctx.fillStyle = 'rgba(18, 14, 10, 0.92)';
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
  ctx.font = '900 24px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(call.textJp, 0, -8);

  // Romaji title
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText(call.textRomaji, 0, 10);

  // Subtitle
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.font = '10px sans-serif';
  ctx.fillText(call.subtext, 0, 24);

  ctx.restore();
}

function drawTechniqueRibbons(ctx: CanvasRenderingContext2D, engine: GameEngine) {
  const ribbons = engine.techniqueRibbons?.getActiveRibbons();
  if (!ribbons || ribbons.length === 0) return;

  ctx.save();
  let startY = 125;
  for (let i = 0; i < ribbons.length; i++) {
    const r = ribbons[i];
    const alpha = Math.min(1, r.duration / 0.4);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(18, startY);

    const ribbonW = 210;
    const ribbonH = 36;

    // Dark parchment background
    ctx.fillStyle = 'rgba(28, 24, 20, 0.92)';
    ctx.strokeStyle = r.color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(0, 0, ribbonW, ribbonH, 6);
    ctx.fill();
    ctx.stroke();

    // Color accent pill on the left
    ctx.fillStyle = r.color;
    ctx.fillRect(0, 0, 4, ribbonH);

    // Title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(r.title, 12, 16);

    // Subtitle
    ctx.fillStyle = 'rgba(237, 226, 212, 0.75)';
    ctx.font = '9.5px sans-serif';
    ctx.fillText(r.subtitle, 12, 28);

    ctx.restore();
    startY += 42;
  }
  ctx.restore();
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
