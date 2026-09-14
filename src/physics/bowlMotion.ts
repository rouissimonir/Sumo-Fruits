import { ArenaMode, FRUIT_CATALOG, FruitTierData, MawashiTail, StrawBale, TawaraState, TrajectoryPoint, VerletParticle } from '../types/game';

export interface ArenaConfig {
  centerX: number;
  centerY: number;
  radius: number;
  radiusX: number;
  radiusY: number;
  slopeK: number; // Inward acceleration slope coefficient
  escapeSpeedThreshold: number; // 220 px/s
  capacityFactor: number; // 0.82
  mode: ArenaMode;
  wobbleX: number;
  wobbleY: number;
  tiltAx: number;
  tiltAy: number;
}

export const DEFAULT_ARENA: ArenaConfig = {
  centerX: 450,
  centerY: 400,
  radius: 340,
  radiusX: 340,
  radiusY: 340,
  slopeK: 0.55,
  escapeSpeedThreshold: 220,
  capacityFactor: 0.82,
  mode: 'CIRCULAR',
  wobbleX: 0,
  wobbleY: 0,
  tiltAx: 0,
  tiltAy: 0,
};

/**
 * Calculates area-preserving semiaxes for an elliptical bowl:
 * a = R * sqrt(q), b = R / sqrt(q) => pi * a * b = pi * R^2
 */
export function calculateEllipseAxes(radius: number, aspect: number = 1.25): { radiusX: number; radiusY: number } {
  const sqrtQ = Math.sqrt(aspect);
  return {
    radiusX: radius * sqrtQ,
    radiusY: radius / sqrtQ,
  };
}

export function createStrawBales(count: number = 16, maxHealth: number = 3): StrawBale[] {
  const bales: StrawBale[] = [];
  const step = (Math.PI * 2) / count;
  for (let i = 0; i < count; i++) {
    bales.push({
      index: i,
      angleStart: i * step,
      angleEnd: (i + 1) * step,
      health: maxHealth,
      maxHealth,
      state: 'INTACT',
    });
  }
  return bales;
}

export function getBaleState(health: number): TawaraState {
  if (health >= 3) return 'INTACT';
  if (health === 2) return 'FRAYED';
  if (health === 1) return 'CRACKED';
  return 'BROKEN';
}

/**
 * Calculates inward bowl slope acceleration: a_bowl = -k_slope * (x - c) + a_tilt
 */
export function getBowlAcceleration(
  x: number,
  y: number,
  arena: ArenaConfig = DEFAULT_ARENA
): { ax: number; ay: number } {
  const cX = arena.centerX;
  const cY = arena.centerY;

  const qx = x - cX;
  const qy = y - cY;

  let ax = 0;
  let ay = 0;

  if (arena.mode === 'ELLIPTICAL') {
    const rx = arena.radiusX || arena.radius * 1.118;
    const ry = arena.radiusY || arena.radius * 0.894;
    const kx = arena.slopeK * (arena.radius / rx);
    const ky = arena.slopeK * (arena.radius / ry);
    ax = -kx * qx;
    ay = -ky * qy;
  } else {
    ax = -arena.slopeK * qx;
    ay = -arena.slopeK * qy;
  }

  // Add smoothed tilt bias in wobble mode
  if (arena.mode === 'WOBBLE') {
    ax += arena.tiltAx || 0;
    ay += arena.tiltAy || 0;
  }

  return { ax, ay };
}

/**
 * Calculates explicit sacred salt drag and rim outward braking:
 * a_salt = -gamma_salt * v - k_brake * max(0, v . n_out) * n_out
 */
export function calculateSaltBraking(
  vx: number,
  vy: number,
  normalX: number,
  normalY: number,
  dSurface: number,
  rimBand: number = 85
): { ax: number; ay: number } {
  const gammaSalt = 3.2;
  const kBrakeBase = 4.5;

  // Blend outward braking more strongly near the rim
  const rimProximity = Math.max(0, Math.min(1, (rimBand - Math.max(0, dSurface)) / rimBand));
  const kBrake = kBrakeBase * rimProximity;

  const vOut = Math.max(0, vx * normalX + vy * normalY);
  const ax = -gammaSalt * vx - kBrake * vOut * normalX;
  const ay = -gammaSalt * vy - kBrake * vOut * normalY;

  return { ax, ay };
}

/**
 * Calculates chili pepper single-use impulse boost:
 * Delta v = min(I_chili / m, Delta v_max, max(0, v_boost_cap - v))
 */
export function calculateChiliBoost(
  vx: number,
  vy: number,
  mass: number,
  arrowAngle?: number
): { boostVx: number; boostVy: number } {
  const speed = Math.hypot(vx, vy);
  let dirX = 0;
  let dirY = 0;
  if (speed > 25) {
    dirX = vx / speed;
    dirY = vy / speed;
  } else if (arrowAngle !== undefined) {
    dirX = Math.cos(arrowAngle);
    dirY = Math.sin(arrowAngle);
  } else {
    dirX = 0;
    dirY = -1;
  }

  const I_chili = 1350;
  const deltaV_max = 300;
  const v_boost_cap = 480;
  const deltaV = Math.min(I_chili / mass, deltaV_max, Math.max(0, v_boost_cap - speed));

  return {
    boostVx: dirX * deltaV,
    boostVy: dirY * deltaV,
  };
}

/**
 * Bowl distances & normal vector
 * Supports Circular, Elliptical (q_x^2/a^2 + q_y^2/b^2 = 1), and Wobble dynamic centers.
 */
export function getBowlMetrics(
  x: number,
  y: number,
  radius: number,
  arena: ArenaConfig = DEFAULT_ARENA
) {
  const cX = arena.centerX + (arena.mode === 'WOBBLE' ? arena.wobbleX : 0);
  const cY = arena.centerY + (arena.mode === 'WOBBLE' ? arena.wobbleY : 0);

  const qx = x - cX;
  const qy = y - cY;

  if (arena.mode === 'ELLIPTICAL') {
    const rx = arena.radiusX || arena.radius * 1.25;
    const ry = arena.radiusY || arena.radius * 0.85;

    const normDist = Math.sqrt((qx * qx) / (rx * rx) + (qy * qy) / (ry * ry));
    const angle = Math.atan2(qy, qx);

    // Approximate boundary radius at this angle: r(theta) = rx * ry / sqrt((ry*cos)^2 + (rx*sin)^2)
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const boundaryR = (rx * ry) / Math.sqrt((ry * cosA) * (ry * cosA) + (rx * sinA) * (rx * sinA));

    const distFromCenter = Math.hypot(qx, qy);
    const dCenter = boundaryR - distFromCenter;
    const dSurface = boundaryR - distFromCenter - radius;

    // Normal vector from gradient of ellipse: grad F = (2*qx / rx^2, 2*qy / ry^2)
    let gx = (2 * qx) / (rx * rx);
    let gy = (2 * qy) / (ry * ry);
    const gLen = Math.hypot(gx, gy) || 1;
    let nx = gx / gLen;
    let ny = gy / gLen;

    return {
      distFromCenter,
      dCenter,
      dSurface,
      normalX: nx,
      normalY: ny,
      angle: (angle + Math.PI * 2) % (Math.PI * 2),
    };
  }

  // Circular / Wobble
  const distFromCenter = Math.hypot(qx, qy);

  let nx = 0;
  let ny = -1;
  if (distFromCenter > 0.0001) {
    nx = qx / distFromCenter;
    ny = qy / distFromCenter;
  }

  const dCenter = arena.radius - distFromCenter;
  const dSurface = arena.radius - distFromCenter - radius;
  const angle = (Math.atan2(qy, qx) + Math.PI * 2) % (Math.PI * 2);

  return {
    distFromCenter,
    dCenter,
    dSurface,
    normalX: nx,
    normalY: ny,
    angle,
  };
}

/**
 * Initialize a 2-segment Verlet tail for the mawashi
 */
export function createMawashiTail(
  rootX: number,
  rootY: number,
  fruitRadius: number
): MawashiTail {
  const segmentLength = Math.max(6, Math.min(22, fruitRadius * 0.28));
  const p1: VerletParticle = {
    x: rootX,
    y: rootY + segmentLength,
    oldX: rootX,
    oldY: rootY + segmentLength,
  };
  const p2: VerletParticle = {
    x: rootX,
    y: rootY + segmentLength * 2,
    oldX: rootX,
    oldY: rootY + segmentLength * 2,
  };
  return {
    particles: [
      { x: rootX, y: rootY, oldX: rootX, oldY: rootY }, // pinned root
      p1,
      p2,
    ],
    segmentLength,
  };
}

/**
 * Step the 2-segment Verlet cloth simulation for a mawashi tail
 */
export function stepMawashiTail(
  tail: MawashiTail,
  rootX: number,
  rootY: number,
  fruitVx: number,
  fruitVy: number,
  dt: number
) {
  const root = tail.particles[0];
  root.x = rootX;
  root.y = rootY;
  root.oldX = rootX;
  root.oldY = rootY;

  // Visual gravity downward + inertia opposing fruit movement
  const gravityY = 160;
  const inertiaFactor = 0.25;
  const ax = -fruitVx * inertiaFactor;
  const ay = gravityY - fruitVy * inertiaFactor;

  const dt2 = dt * dt;

  // Step Verlet for particle 1 and 2
  for (let i = 1; i <= 2; i++) {
    const p = tail.particles[i];
    const vx = (p.x - p.oldX) * 0.92; // air damping
    const vy = (p.y - p.oldY) * 0.92;

    const nextX = p.x + vx + ax * dt2;
    const nextY = p.y + vy + ay * dt2;

    p.oldX = p.x;
    p.oldY = p.y;
    p.x = nextX;
    p.y = nextY;
  }

  // Solve distance constraints (4 iterations)
  const targetL = tail.segmentLength;
  for (let iter = 0; iter < 4; iter++) {
    // Segment 0 -> 1 (root is fixed)
    const p0 = tail.particles[0];
    const p1 = tail.particles[1];
    let dx = p1.x - p0.x;
    let dy = p1.y - p0.y;
    let dist = Math.hypot(dx, dy);
    if (dist > 0.0001) {
      const diff = (dist - targetL) / dist;
      p1.x -= dx * diff;
      p1.y -= dy * diff;
    }

    // Segment 1 -> 2 (both can move)
    const p2 = tail.particles[2];
    dx = p2.x - p1.x;
    dy = p2.y - p1.y;
    dist = Math.hypot(dx, dy);
    if (dist > 0.0001) {
      const diff = (dist - targetL) / dist;
      p1.x += dx * diff * 0.5;
      p1.y += dy * diff * 0.5;
      p2.x -= dx * diff * 0.5;
      p2.y -= dy * diff * 0.5;
    }
  }
}

/**
 * Calculates area-preserving squash and stretch scale factor
 * s(t) = 1 + A * e^(-8t) * cos(24t)
 * Sx = s(t), Sy = 1 / s(t)
 */
export function getSquashScale(amplitude: number, elapsed: number): number {
  if (elapsed > 0.6) return 1.0;
  const damp = Math.exp(-8 * elapsed);
  const osc = Math.cos(24 * elapsed);
  return 1.0 + amplitude * damp * osc;
}

/** Advances intentional English while preserving speed. Shared by live play and prediction. */
export function advanceEnglishSpin(
  vx: number,
  vy: number,
  spin: number,
  dt: number
): { vx: number; vy: number; spin: number } {
  const speed = Math.hypot(vx, vy);
  if (speed < 10 || Math.abs(spin) < 0.05) {
    return { vx, vy, spin: Math.abs(spin) < 0.05 ? 0 : spin };
  }
  const angle = spin * 0.06 * dt;
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  return {
    vx: vx * cosA - vy * sinA,
    vy: vx * sinA + vy * cosA,
    spin: spin * Math.exp(-1.35 * dt),
  };
}

function segmentCircleHit(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  cx: number,
  cy: number,
  radius: number
): boolean {
  const sx = x1 - x0;
  const sy = y1 - y0;
  const lengthSquared = sx * sx + sy * sy;
  if (lengthSquared <= 0.000001) return Math.hypot(x0 - cx, y0 - cy) <= radius;
  const t = Math.max(0, Math.min(1, ((cx - x0) * sx + (cy - y0) * sy) / lengthSquared));
  return Math.hypot(x0 + sx * t - cx, y0 + sy * t - cy) <= radius;
}

/**
 * Forward Euler trajectory prediction
 */
export function predictTrajectory(
  startX: number,
  startY: number,
  launchVx: number,
  launchVy: number,
  tierData: FruitTierData,
  obstacles: { x: number; y: number; radius: number }[],
  arena: ArenaConfig = DEFAULT_ARENA,
  horizonSeconds: number = 1.2,
  sampleSteps: number = 40,
  spin: number = 0
): TrajectoryPoint[] {
  const points: TrajectoryPoint[] = [];
  const dt = horizonSeconds / sampleSteps;

  let x = startX;
  let y = startY;
  let vx = launchVx;
  let vy = launchVy;
  let currentSpin = spin;

  points.push({ x, y });

  for (let i = 0; i < sampleSteps; i++) {
    const previousX = x;
    const previousY = y;
    // Current bowl acceleration
    const { ax, ay } = getBowlAcceleration(x, y, arena);

    const spun = advanceEnglishSpin(vx, vy, currentSpin, dt);
    vx = spun.vx;
    vy = spun.vy;
    currentSpin = spun.spin;

    // Explicit Euler step
    x += vx * dt;
    y += vy * dt;

    const dampFactor = Math.max(0, 1 - tierData.damp * dt);
    vx = (vx + ax * dt) * dampFactor;
    vy = (vy + ay * dt) * dampFactor;

    // Check collision with obstacles
    let hit = false;
    for (const obs of obstacles) {
      if (segmentCircleHit(previousX, previousY, x, y, obs.x, obs.y, tierData.radius + obs.radius)) {
        points.push({ x, y, impact: true });
        hit = true;
        break;
      }
    }
    if (hit) break;

    // Check rim collision
    const metrics = getBowlMetrics(x, y, tierData.radius, arena);
    if (metrics.dSurface <= 0) {
      points.push({ x, y, impact: true });
      break;
    }

    if (i % 2 === 0 || i === sampleSteps - 1) {
      points.push({ x, y });
    }
  }

  return points;
}
