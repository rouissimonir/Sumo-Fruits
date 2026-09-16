import { FRUIT_CATALOG, SumoFruitInstance } from '../types/game';
import { TurnObjectiveKind, VersusTurnObjective } from '../types/versusEvents';

export interface ArenaMetricsProvider {
  calculateBowlMetrics: (
    x: number,
    y: number,
    radius: number
  ) => {
    dSurface: number;
    dCenter: number;
    normalX: number;
    normalY: number;
    angle?: number;
  };
}

export class VersusTurnDirector {
  /**
   * Determine whether a fruit is in rim danger based on the arena bowl metrics:
   * safeClearance <= max(42, fruitRadius * 0.65)
   */
  public static isFruitInRimDanger(
    fruit: SumoFruitInstance,
    metricsProvider: ArenaMetricsProvider
  ): { inDanger: boolean; safeClearance: number; rimDirection: 'NORTH' | 'EAST' | 'SOUTH' | 'WEST' } {
    const cat = FRUIT_CATALOG[fruit.tier - 1];
    const metrics = metricsProvider.calculateBowlMetrics(fruit.x, fruit.y, cat.radius);
    const safeClearance = metrics.dSurface;
    const dangerThreshold = Math.max(42, cat.radius * 0.65);
    const inDanger = safeClearance <= dangerThreshold;

    let rimDirection: 'NORTH' | 'EAST' | 'SOUTH' | 'WEST' = 'EAST';
    const nx = metrics.normalX;
    const ny = metrics.normalY;

    if (Math.abs(nx) > Math.abs(ny)) {
      rimDirection = nx > 0 ? 'EAST' : 'WEST';
    } else {
      rimDirection = ny > 0 ? 'SOUTH' : 'NORTH';
    }

    return { inDanger, safeClearance, rimDirection };
  }

  /**
   * Evaluates the board state deterministically and selects the primary turn objective
   * following priority: DEFEND -> ATTACK -> MERGE -> REPOSITION
   */
  public static selectObjective(
    activePlayer: 1 | 2,
    loadedFruitTier: number,
    fruits: SumoFruitInstance[],
    metricsProvider: ArenaMetricsProvider
  ): VersusTurnObjective {
    const activeTeam = activePlayer === 1 ? 'PLAYER_1' : 'PLAYER_2';
    const opponentTeam = activePlayer === 1 ? 'PLAYER_2' : 'PLAYER_1';
    const opponentPlayer = activePlayer === 1 ? 2 : 1;

    const inRingFruits = fruits.filter((f) => f.state === 'IN_RING' && !f.entryPending);
    const ownedFruits = inRingFruits.filter((f) => f.team === activeTeam || (activePlayer === 1 && f.team === 'PLAYER'));
    const opponentFruits = inRingFruits.filter((f) => f.team === opponentTeam);

    // =========================================================================
    // Priority 1: DEFEND
    // Choose DEFEND when one of the active player's fruits is near the rim.
    // Target the fruit with the smallest remaining safe distance.
    // =========================================================================
    let mostVulnerableOwned: { fruit: SumoFruitInstance; clearance: number; dir: 'NORTH' | 'EAST' | 'SOUTH' | 'WEST' } | null = null;
    for (const f of ownedFruits) {
      const danger = this.isFruitInRimDanger(f, metricsProvider);
      if (danger.inDanger) {
        if (!mostVulnerableOwned || danger.safeClearance < mostVulnerableOwned.clearance) {
          mostVulnerableOwned = {
            fruit: f,
            clearance: danger.safeClearance,
            dir: danger.rimDirection,
          };
        }
      }
    }

    if (mostVulnerableOwned) {
      const cat = FRUIT_CATALOG[mostVulnerableOwned.fruit.tier - 1];
      return {
        kind: 'DEFEND',
        player: activePlayer,
        targetFruitId: mostVulnerableOwned.fruit.id,
        rimDirection: mostVulnerableOwned.dir,
        message: `Save your ${cat.name} near the ${mostVulnerableOwned.dir.toLowerCase()} rim`,
        urgency: Math.max(0.7, 1 - (mostVulnerableOwned.clearance / 50)),
      };
    }

    // =========================================================================
    // Priority 2: ATTACK
    // Choose ATTACK when:
    // 1) An opponent fruit is in rim danger.
    // 2) Loaded fruit matches an opponent fruit and can potentially steal it (Attacker Claims).
    // =========================================================================
    let mostVulnerableOpponent: { fruit: SumoFruitInstance; clearance: number; dir: 'NORTH' | 'EAST' | 'SOUTH' | 'WEST' } | null = null;
    for (const f of opponentFruits) {
      const danger = this.isFruitInRimDanger(f, metricsProvider);
      if (danger.inDanger) {
        if (!mostVulnerableOpponent || danger.safeClearance < mostVulnerableOpponent.clearance) {
          mostVulnerableOpponent = {
            fruit: f,
            clearance: danger.safeClearance,
            dir: danger.rimDirection,
          };
        }
      }
    }

    if (mostVulnerableOpponent) {
      const cat = FRUIT_CATALOG[mostVulnerableOpponent.fruit.tier - 1];
      return {
        kind: 'ATTACK',
        player: activePlayer,
        targetFruitId: mostVulnerableOpponent.fruit.id,
        rimDirection: mostVulnerableOpponent.dir,
        message: `Opponent ${cat.name} is vulnerable near the ${mostVulnerableOpponent.dir.toLowerCase()} rim`,
        urgency: 0.85,
      };
    }

    // Check for potential Attacker Claim steal on an opponent fruit
    const steallableOpponent = opponentFruits.find((f) => f.tier === loadedFruitTier && f.tier < 11);
    if (steallableOpponent) {
      const cat = FRUIT_CATALOG[steallableOpponent.tier - 1];
      return {
        kind: 'ATTACK',
        player: activePlayer,
        targetFruitId: steallableOpponent.id,
        message: `Strike opponent ${cat.name} to steal it with Attacker Claims!`,
        urgency: 0.8,
      };
    }

    // =========================================================================
    // Priority 3: MERGE
    // Choose MERGE when:
    // - The loaded fruit matches an owned fruit.
    // - Two owned fruits can be aligned or player can build safely.
    // =========================================================================
    const mergeableOwned = ownedFruits.find((f) => f.tier === loadedFruitTier && f.tier < 11);
    if (mergeableOwned) {
      const cat = FRUIT_CATALOG[mergeableOwned.tier - 1];
      const nextCat = FRUIT_CATALOG[mergeableOwned.tier];
      return {
        kind: 'MERGE',
        player: activePlayer,
        targetFruitId: mergeableOwned.id,
        message: `Merge with your ${cat.name} to awaken a ${nextCat ? nextCat.name : 'Heavyweight'}`,
        urgency: 0.6,
      };
    }

    // =========================================================================
    // Priority 4: REPOSITION
    // Default when no urgent defense, attack, or merge exists.
    // =========================================================================
    const smallestOwned = ownedFruits.slice().sort((a, b) => a.tier - b.tier)[0];
    if (smallestOwned) {
      const cat = FRUIT_CATALOG[smallestOwned.tier - 1];
      return {
        kind: 'REPOSITION',
        player: activePlayer,
        targetFruitId: smallestOwned.id,
        message: `Claim the center and anchor your ${cat.name}`,
        urgency: 0.4,
      };
    }

    return {
      kind: 'REPOSITION',
      player: activePlayer,
      targetFruitId: null,
      message: 'Claim the central clay and establish ring dominance',
      urgency: 0.3,
    };
  }
}
