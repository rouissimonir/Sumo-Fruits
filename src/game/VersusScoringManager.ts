import {
  VersusScoreCategory,
  VersusScoreEvent,
  VersusTurnContext,
  VersusTurnSummary,
  VersusActionEvent,
} from '../types/versusEvents';
import { FRUIT_CATALOG } from '../types/game';

export class VersusScoringManager {
  private scoreEvents: VersusScoreEvent[] = [];
  private processedEventIds: Set<string> = new Set();

  public reset() {
    this.scoreEvents = [];
    this.processedEventIds.clear();
  }

  /**
   * Generates a stable event ID:
   * e.g. "turn-18:danger:fruit-42", "turn-18:rescue:fruit-17"
   */
  public static buildEventId(turnId: number, category: string, entityKey: string | number): string {
    return `turn-${turnId}:${category}:${entityKey}`;
  }

  /**
   * Records a normal merge event:
   * 100 * created tier
   */
  public recordMerge(
    turnContext: VersusTurnContext,
    resultingTier: number,
    fruitAId: number,
    fruitBId: number,
    resultingFruitOwner: 1 | 2
  ): VersusScoreEvent | null {
    const pairKey = [fruitAId, fruitBId].sort().join('+');
    const stableId = VersusScoringManager.buildEventId(turnContext.id, 'merge', pairKey);
    if (this.processedEventIds.has(stableId)) return null;
    this.processedEventIds.add(stableId);

    const basePoints = 100 * resultingTier;
    const cat = FRUIT_CATALOG[resultingTier - 1];
    const desc = resultingTier >= 11
      ? `Yokozuna ${cat.name} awakened! (+${basePoints})`
      : `Fused ${cat.name} Tier ${resultingTier} (+${basePoints})`;

    const event: VersusScoreEvent = {
      id: stableId,
      turnId: turnContext.id,
      player: resultingFruitOwner,
      category: resultingTier >= 11 ? 'YOKOZUNA' : 'MERGE',
      basePoints,
      multiplier: 1,
      finalPoints: basePoints,
      description: desc,
      timestamp: Date.now(),
    };

    this.scoreEvents.push(event);
    return event;
  }

  /**
   * Push into rim danger: +100
   * Awarded only once per fruit per shot if it was safe at turn start and pushed by active player
   */
  public recordRimPressure(
    turnContext: VersusTurnContext,
    victimFruitId: number,
    victimTier: number,
    rimDirection?: 'NORTH' | 'EAST' | 'SOUTH' | 'WEST'
  ): VersusScoreEvent | null {
    const stableId = VersusScoringManager.buildEventId(turnContext.id, 'danger', `fruit-${victimFruitId}`);
    if (this.processedEventIds.has(stableId)) return null;
    this.processedEventIds.add(stableId);

    const cat = FRUIT_CATALOG[victimTier - 1];
    const basePoints = 100;
    const desc = rimDirection
      ? `Opponent ${cat.name} forced into ${rimDirection.toLowerCase()} rim danger (+100)`
      : `Opponent ${cat.name} forced into rim danger (+100)`;

    const event: VersusScoreEvent = {
      id: stableId,
      turnId: turnContext.id,
      player: turnContext.actingPlayer,
      category: 'RIM_PRESSURE',
      basePoints,
      multiplier: 1,
      finalPoints: basePoints,
      description: desc,
      timestamp: Date.now(),
    };

    this.scoreEvents.push(event);
    return event;
  }

  /**
   * Rescue: +150
   * Awarded when owned fruit was in danger at turn start, contacted directly/indirectly,
   * and settles safely inside ring
   */
  public recordRescue(
    turnContext: VersusTurnContext,
    fruitId: number,
    tier: number
  ): VersusScoreEvent | null {
    const stableId = VersusScoringManager.buildEventId(turnContext.id, 'rescue', `fruit-${fruitId}`);
    if (this.processedEventIds.has(stableId)) return null;
    this.processedEventIds.add(stableId);

    const cat = FRUIT_CATALOG[tier - 1];
    const basePoints = 150;
    const desc = `Rescued ${cat.name} back to central safety (+150)`;

    const event: VersusScoreEvent = {
      id: stableId,
      turnId: turnContext.id,
      player: turnContext.actingPlayer,
      category: 'RESCUE',
      basePoints,
      multiplier: 1,
      finalPoints: basePoints,
      description: desc,
      timestamp: Date.now(),
    };

    this.scoreEvents.push(event);
    return event;
  }

  /**
   * Ring-out scoring:
   * Base = 300 * victim tier
   * Bank shot ring-out: +200 bonus
   * Multi-ring-out (>= 2 opponent victims in same shot): sum(base) * 2 + bank bonuses
   */
  public static calculateRingOutScore(
    victimTiers: number[],
    hadBankShot: boolean
  ): { baseTotal: number; multiplier: number; bankBonus: number; finalPoints: number } {
    const isMulti = victimTiers.length >= 2;
    const multiplier = isMulti ? 2 : 1;
    let baseTotal = 0;
    for (const t of victimTiers) {
      baseTotal += 300 * t;
    }
    const bankBonus = hadBankShot ? 200 : 0;
    const finalPoints = baseTotal * multiplier + bankBonus;
    return { baseTotal, multiplier, bankBonus, finalPoints };
  }

  /**
   * Records ring-out event(s) and awards points to the scoring player
   */
  public recordRingOuts(
    turnContext: VersusTurnContext,
    awardedPlayer: 1 | 2,
    victims: { fruitId: number; tier: number }[],
    hadBankShot: boolean,
    isSelfRingOut: boolean
  ): VersusScoreEvent[] {
    const results: VersusScoreEvent[] = [];
    if (victims.length === 0) return results;

    const tiers = victims.map((v) => v.tier);
    const scoreCalc = VersusScoringManager.calculateRingOutScore(tiers, hadBankShot && !isSelfRingOut);

    const isMulti = victims.length >= 2;
    const category: VersusScoreCategory = isMulti
      ? 'MULTI_RING_OUT'
      : hadBankShot && !isSelfRingOut
      ? 'BANK_RING_OUT'
      : 'RING_OUT';

    const victimDescriptions = victims
      .map((v) => `T${v.tier} ${FRUIT_CATALOG[v.tier - 1]?.name || 'Fruit'}`)
      .join(', ');

    let desc = '';
    if (isSelfRingOut) {
      desc = `Self-push ring-out! ${victimDescriptions} ejected (+${scoreCalc.finalPoints})`;
    } else if (isMulti) {
      desc = `Double Oshidashi! Ejected ${victimDescriptions} (2x multiplier: +${scoreCalc.finalPoints})`;
    } else if (hadBankShot) {
      desc = `Bank-shot Oshidashi! Ejected ${victimDescriptions} with Tawara rebound (+${scoreCalc.finalPoints})`;
    } else {
      desc = `Oshidashi! Ejected opponent ${victimDescriptions} (+${scoreCalc.finalPoints})`;
    }

    const stableId = VersusScoringManager.buildEventId(
      turnContext.id,
      'ringout',
      victims.map((v) => v.fruitId).join('-')
    );
    if (this.processedEventIds.has(stableId)) return results;
    this.processedEventIds.add(stableId);

    const event: VersusScoreEvent = {
      id: stableId,
      turnId: turnContext.id,
      player: awardedPlayer,
      category,
      basePoints: scoreCalc.baseTotal,
      multiplier: scoreCalc.multiplier,
      finalPoints: scoreCalc.finalPoints,
      description: desc,
      timestamp: Date.now(),
    };

    this.scoreEvents.push(event);
    results.push(event);
    return results;
  }

  /**
   * Summarizes the finished shot into a clear, high-priority VersusTurnSummary
   * Priority for headline:
   * 1. Match victory
   * 2. Ring-out (Double or Single)
   * 3. Yokozuna creation
   * 4. Attacker Claims fusion
   * 5. Multi-merge
   * 6. Rescue
   * 7. Rim pressure
   * 8. Reposition
   */
  public generateTurnSummary(
    turnContext: VersusTurnContext,
    stolenTier: number | null,
    isBoutWon: boolean,
    boutWinner: 1 | 2 | null
  ): VersusTurnSummary {
    const turnEvents = this.scoreEvents.filter(
      (e) => e.turnId === turnContext.id && e.player === turnContext.actingPlayer
    );
    const totalPoints = turnEvents.reduce((acc, e) => acc + e.finalPoints, 0);

    const ringOutEvents = turnEvents.filter(
      (e) => e.category === 'RING_OUT' || e.category === 'BANK_RING_OUT' || e.category === 'MULTI_RING_OUT'
    );
    const mergeEvents = turnEvents.filter((e) => e.category === 'MERGE');
    const yokozunaEvents = turnEvents.filter((e) => e.category === 'YOKOZUNA');
    const rescueEvents = turnEvents.filter((e) => e.category === 'RESCUE');
    const dangerEvents = turnEvents.filter((e) => e.category === 'RIM_PRESSURE');

    let headline = 'REPOSITION COMPLETED';
    let primaryCategory: VersusScoreCategory | undefined = undefined;
    let details: string[] = [];

    if (isBoutWon) {
      const winnerName = boutWinner === 1 ? 'P1 East 東' : 'P2 West 西';
      headline = `${winnerName} WINS BOUT!`;
    } else if (ringOutEvents.length > 0) {
      const hasMulti = ringOutEvents.some((e) => e.category === 'MULTI_RING_OUT');
      headline = hasMulti ? 'DOUBLE OSHIDASHI!' : 'OSHIDASHI PUSH-OUT!';
      primaryCategory = hasMulti ? 'MULTI_RING_OUT' : 'RING_OUT';
      details = ringOutEvents.map((e) => e.description);
    } else if (yokozunaEvents.length > 0) {
      headline = 'YOKOZUNA AWAKENED!';
      primaryCategory = 'YOKOZUNA';
      details = yokozunaEvents.map((e) => e.description);
    } else if (stolenTier !== null) {
      const cat = FRUIT_CATALOG[stolenTier - 1];
      const nextCat = FRUIT_CATALOG[stolenTier];
      headline = 'ATTACKER CLAIMS!';
      primaryCategory = 'MERGE';
      details.push(`Stole opponent ${cat.name} -> created ${nextCat ? nextCat.name : 'Heavyweight'}`);
    } else if (mergeEvents.length >= 2) {
      headline = `CHAIN MERGE x${mergeEvents.length}!`;
      primaryCategory = 'MERGE';
      details = mergeEvents.slice(0, 2).map((e) => e.description);
    } else if (mergeEvents.length === 1) {
      headline = 'MERGE SUCCESS!';
      primaryCategory = 'MERGE';
      details = [mergeEvents[0].description];
    } else if (rescueEvents.length > 0) {
      headline = 'RESCUE SUCCESS!';
      primaryCategory = 'RESCUE';
      details = rescueEvents.map((e) => e.description);
    } else if (dangerEvents.length > 0) {
      headline = 'RIM PRESSURE!';
      primaryCategory = 'RIM_PRESSURE';
      details = dangerEvents.map((e) => e.description);
    } else {
      headline = 'REPOSITION';
      details.push('Secured center ground for next tachiai');
    }

    // Add score badge to headline if points were scored and match is not over
    if (totalPoints > 0 && !isBoutWon) {
      headline = `${headline} · +${totalPoints.toLocaleString()}`;
    }

    return {
      turnId: turnContext.id,
      player: turnContext.actingPlayer,
      headline,
      totalPoints,
      primaryCategory,
      primaryEvent: null,
      details: details.slice(0, 2),
      ringOutCount: ringOutEvents.length,
      mergeCount: mergeEvents.length,
      stolenFruitTier: stolenTier || undefined,
      displayDuration: 0.9,
    };
  }
}
