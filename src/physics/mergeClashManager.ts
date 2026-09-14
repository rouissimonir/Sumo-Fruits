import { ClashRecord, FRUIT_CATALOG, FruitTierData, HazardInstance, SumoFruitInstance } from '../types/game';

export interface FusionResult {
  newTier: number;
  spawnX: number;
  spawnY: number;
  spawnVx: number;
  spawnVy: number;
  consumedIds: [number, number];
  owner: 'PLAYER' | 'RIVAL' | 'PLAYER_1' | 'PLAYER_2';
  score: number;
  shockwave: {
    x: number;
    y: number;
    radius: number;
    baseImpulse: number;
  };
  isYokozuna: boolean;
}

export class MergeClashManager {
  private activeClashes: Map<number, ClashRecord> = new Map();
  private nextClashId = 1;

  public getActiveClashes(): ClashRecord[] {
    return Array.from(this.activeClashes.values());
  }

  public isFruitClashing(fruitId: number): boolean {
    for (const clash of this.activeClashes.values()) {
      if (clash.fruitAId === fruitId || clash.fruitBId === fruitId) {
        return true;
      }
    }
    return false;
  }

  public clear() {
    this.activeClashes.clear();
  }

  /**
   * Evaluates collision between two fruits. Returns 'CLASH' | 'MERGE' | null
   */
  public evaluatePair(
    fruitA: SumoFruitInstance,
    fruitB: SumoFruitInstance
  ): { type: 'CLASH' | 'MERGE'; relativeSpeed: number } | null {
    // Merge eligibility explicitly requires matching teams/owners, and no rival participation
    if (fruitA.team === 'RIVAL' || fruitB.team === 'RIVAL') return null;
    if (fruitA.team !== fruitB.team) return null;
    if (fruitA.tier !== fruitB.tier) return null;
    if (fruitA.tier >= 11) return null; // Tier 11 has no higher tier
    if (fruitA.state !== 'IN_RING' || fruitB.state !== 'IN_RING') return null;
    if (this.isFruitClashing(fruitA.id) || this.isFruitClashing(fruitB.id)) return null;

    const relVx = fruitA.vx - fruitB.vx;
    const relVy = fruitA.vy - fruitB.vy;
    const relativeSpeed = Math.hypot(relVx, relVy);

    // Spec: >= 150 px/s starts 0.5s Tsuppari clash. Below 150 px/s fuses directly.
    if (relativeSpeed >= 150) {
      return { type: 'CLASH', relativeSpeed };
    } else {
      return { type: 'MERGE', relativeSpeed };
    }
  }

  /**
   * Starts a 0.5-second Tsuppari clash between matching fruits
   */
  public startClash(
    fruitA: SumoFruitInstance,
    fruitB: SumoFruitInstance
  ): ClashRecord {
    const clashId = this.nextClashId++;

    const dx = fruitB.x - fruitA.x;
    const dy = fruitB.y - fruitA.y;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = dx / dist;
    const ny = dy / dist;

    // Contact midpoint
    const midX = (fruitA.x + fruitB.x) / 2;
    const midY = (fruitA.y + fruitB.y) / 2;

    const catalogA = FRUIT_CATALOG[fruitA.tier - 1];
    const catalogB = FRUIT_CATALOG[fruitB.tier - 1];

    // Push each fruit slightly apart to touch boundary
    const lockX_A = midX - nx * catalogA.radius;
    const lockY_A = midY - ny * catalogA.radius;
    const lockX_B = midX + nx * catalogB.radius;
    const lockY_B = midY + ny * catalogB.radius;

    const record: ClashRecord = {
      id: clashId,
      fruitAId: fruitA.id,
      fruitBId: fruitB.id,
      sourceTier: fruitA.tier,
      elapsedTime: 0,
      lockX_A,
      lockY_A,
      lockX_B,
      lockY_B,
      incomingVxA: fruitA.vx,
      incomingVyA: fruitA.vy,
      incomingVxB: fruitB.vx,
      incomingVyB: fruitB.vy,
      deferredImpulseX: 0,
      deferredImpulseY: 0,
      normalX: nx,
      normalY: ny,
    };

    fruitA.state = 'CLASHING';
    fruitB.state = 'CLASHING';
    fruitA.clashId = clashId;
    fruitB.clashId = clashId;

    this.activeClashes.set(clashId, record);
    return record;
  }

  /**
   * Defer external shockwave impulses arriving during clash
   */
  public applyDeferredImpulse(fruitId: number, ix: number, iy: number) {
    for (const clash of this.activeClashes.values()) {
      if (clash.fruitAId === fruitId || clash.fruitBId === fruitId) {
        clash.deferredImpulseX += ix;
        clash.deferredImpulseY += iy;
        break;
      }
    }
  }

  /**
   * Step all active clashes. Returns array of fusions that just completed.
   */
  public updateClashes(
    dt: number,
    fruitsById: Map<number, SumoFruitInstance>
  ): FusionResult[] {
    const readyFusions: FusionResult[] = [];
    const completedClashIds: number[] = [];

    for (const [id, clash] of this.activeClashes.entries()) {
      clash.elapsedTime += dt;

      const fruitA = fruitsById.get(clash.fruitAId);
      const fruitB = fruitsById.get(clash.fruitBId);

      // Guard if either participant got removed
      if (!fruitA || !fruitB) {
        completedClashIds.push(id);
        continue;
      }

      // Keep participants locked at contact position
      fruitA.x = clash.lockX_A;
      fruitA.y = clash.lockY_A;
      fruitA.vx = 0;
      fruitA.vy = 0;

      fruitB.x = clash.lockX_B;
      fruitB.y = clash.lockY_B;
      fruitB.vx = 0;
      fruitB.vy = 0;

      // 0.5s clash duration specified
      if (clash.elapsedTime >= 0.5) {
        completedClashIds.push(id);
        const fusion = this.commitFusion(
          fruitA,
          fruitB,
          clash.incomingVxA,
          clash.incomingVyA,
          clash.incomingVxB,
          clash.incomingVyB,
          clash.deferredImpulseX,
          clash.deferredImpulseY
        );
        readyFusions.push(fusion);
      }
    }

    for (const id of completedClashIds) {
      this.activeClashes.delete(id);
    }

    return readyFusions;
  }

  /**
   * Atomically commits a fusion between two fruits
   */
  public commitFusion(
    fruitA: SumoFruitInstance,
    fruitB: SumoFruitInstance,
    incomingVxA?: number,
    incomingVyA?: number,
    incomingVxB?: number,
    incomingVyB?: number,
    deferredIx = 0,
    deferredIy = 0
  ): FusionResult {
    const nextTier = fruitA.tier + 1;
    const catA = FRUIT_CATALOG[fruitA.tier - 1];
    const catB = FRUIT_CATALOG[fruitB.tier - 1];
    const catNext = FRUIT_CATALOG[nextTier - 1];

    // Midpoint spawn
    const spawnX = (fruitA.x + fruitB.x) / 2;
    const spawnY = (fruitA.y + fruitB.y) / 2;

    // Momentum conservation: P = mA*vA + mB*vB + I_deferred, v_new = P / m_new
    const vAx = incomingVxA !== undefined ? incomingVxA : fruitA.vx;
    const vAy = incomingVyA !== undefined ? incomingVyA : fruitA.vy;
    const vBx = incomingVxB !== undefined ? incomingVxB : fruitB.vx;
    const vBy = incomingVyB !== undefined ? incomingVyB : fruitB.vy;

    const momentumX = catA.mass * vAx + catB.mass * vBx + deferredIx;
    const momentumY = catA.mass * vAy + catB.mass * vBy + deferredIy;

    const spawnVx = momentumX / catNext.mass;
    const spawnVy = momentumY / catNext.mass;

    // Mark as merging
    fruitA.state = 'MERGING';
    fruitB.state = 'MERGING';

    // Scoring formula: 10 * 2^(created_tier - 1)
    const score = 10 * Math.pow(2, nextTier - 1);

    // Shockwave formula from spec:
    // Base blast radius: 240 + 12 * created_tier
    // Base impulse: 600 + 150 * created_tier
    const shockRadius = 240 + 12 * nextTier;
    const shockImpulse = 600 + 150 * nextTier;

    return {
      newTier: nextTier,
      spawnX,
      spawnY,
      spawnVx,
      spawnVy,
      consumedIds: [fruitA.id, fruitB.id],
      owner: fruitA.team,
      score,
      shockwave: {
        x: spawnX,
        y: spawnY,
        radius: shockRadius,
        baseImpulse: shockImpulse,
      },
      isYokozuna: nextTier === 11,
    };
  }

  /**
   * Evaluates shockwave impulses on surrounding bodies
   */
  public applyShockwave(
    originX: number,
    originY: number,
    blastRadius: number,
    baseImpulse: number,
    fruits: SumoFruitInstance[],
    hazards: HazardInstance[],
    excludedIds: number[]
  ) {
    const excludeSet = new Set(excludedIds);

    // Apply to fruits
    for (const fruit of fruits) {
      if (excludeSet.has(fruit.id)) continue;
      if (fruit.state === 'RING_OUT' || fruit.state === 'MERGING') continue;

      const dx = fruit.x - originX;
      const dy = fruit.y - originY;
      const dist = Math.hypot(dx, dy);

      if (dist > 0 && dist < blastRadius) {
        const dirX = dx / dist;
        const dirY = dy / dist;
        const rawImpulse = baseImpulse * (1 - dist / blastRadius);

        const catalog = FRUIT_CATALOG[fruit.tier - 1];
        // Attenuate scripted shockwave by knockback resistance
        const appliedImpulse = rawImpulse * (1 - catalog.resistance);

        if (fruit.state === 'CLASHING') {
          // Defer into clash record
          this.applyDeferredImpulse(fruit.id, dirX * appliedImpulse, dirY * appliedImpulse);
        } else {
          fruit.vx += (dirX * appliedImpulse) / catalog.mass;
          fruit.vy += (dirY * appliedImpulse) / catalog.mass;

          // Add ripple
          fruit.ripple = {
            active: true,
            elapsed: 0,
            impactAngle: Math.atan2(dy, dx),
          };
        }
      }
    }

    // Apply to hazards
    for (const hazard of hazards) {
      if (hazard.ringOut) continue;
      const dx = hazard.x - originX;
      const dy = hazard.y - originY;
      const dist = Math.hypot(dx, dy);

      if (dist > 0 && dist < blastRadius) {
        const dirX = dx / dist;
        const dirY = dy / dist;
        const rawImpulse = baseImpulse * (1 - dist / blastRadius);
        const appliedImpulse = rawImpulse * (1 - hazard.resistance);

        hazard.vx += (dirX * appliedImpulse) / hazard.mass;
        hazard.vy += (dirY * appliedImpulse) / hazard.mass;
      }
    }
  }
}
