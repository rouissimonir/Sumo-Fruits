import { SumoFruitInstance, VersusBoutRecord, VersusState, FRUIT_CATALOG } from '../types/game';
import { VersusTurnObjective, VersusTurnSummary } from '../types/versusEvents';

export class VersusManager {
  private boutResolved = false;
  private pairedTierStream: number[] = [1, 2];
  private p1TierIndex = 0;
  private p2TierIndex = 0;

  public state: VersusState = {
    playerTurn: 1,
    p1Score: 0,
    p2Score: 0,
    p1RoundsWon: 0,
    p2RoundsWon: 0,
    currentBout: 1,
    maxRounds: 3, // Best of 3 (first to 2 wins)
    p1SaltCharges: 1,
    p2SaltCharges: 1,
    p1SaltLaunchCount: 0,
    p2SaltLaunchCount: 0,
    p1NextTiers: [1, 2],
    p2NextTiers: [1, 2],
    tugOfWarMassP1: 0,
    tugOfWarMassP2: 0,
    lastBoutResult: null,
    boutHistory: [],
    isMatchOver: false,
    matchWinner: null,
    boutTransitionPending: false,
    isHandoverPending: false,
    tabletopInversion: false,
    passAndPlayPauseEnabled: false,
    shotsPerPlayer: 5, // 10 total shots per bout
    p1ShotsUsed: 0,
    p2ShotsUsed: 0,
    p1RingOutsThisBout: 0,
    p2RingOutsThisBout: 0,
    hasP1Yokozuna: false,
    hasP2Yokozuna: false,
    isSuddenDeath: false,
    suddenDeathPairCount: 0,
    turnPhase: 'PREPARE',
    activeObjective: null,
    latestTurnSummary: null,
  };

  public reset(maxRounds = 3) {
    this.boutResolved = false;
    const keepPassAndPlay = this.state.passAndPlayPauseEnabled ?? false;
    const keepTabletop = this.state.tabletopInversion;
    this.pairedTierStream = [this.rollTier(), this.rollTier()];
    this.p1TierIndex = 0;
    this.p2TierIndex = 0;
    this.state = {
      playerTurn: 1,
      p1Score: 0,
      p2Score: 0,
      p1RoundsWon: 0,
      p2RoundsWon: 0,
      currentBout: 1,
      maxRounds,
      p1SaltCharges: 1,
      p2SaltCharges: 1,
      p1SaltLaunchCount: 0,
      p2SaltLaunchCount: 0,
      p1NextTiers: [this.pairedTierStream[0], this.pairedTierStream[1]],
      p2NextTiers: [this.pairedTierStream[0], this.pairedTierStream[1]],
      tugOfWarMassP1: 0,
      tugOfWarMassP2: 0,
      lastBoutResult: null,
      boutHistory: [],
      isMatchOver: false,
      matchWinner: null,
      boutTransitionPending: false,
      isHandoverPending: false,
      tabletopInversion: keepTabletop,
      passAndPlayPauseEnabled: keepPassAndPlay,
      shotsPerPlayer: 5,
      p1ShotsUsed: 0,
      p2ShotsUsed: 0,
      p1RingOutsThisBout: 0,
      p2RingOutsThisBout: 0,
      hasP1Yokozuna: false,
      hasP2Yokozuna: false,
      isSuddenDeath: false,
      suddenDeathPairCount: 0,
      turnPhase: 'PREPARE',
      activeObjective: null,
      latestTurnSummary: null,
    };
  }

  public resetForNextBout() {
    this.boutResolved = false;
    this.state.boutTransitionPending = false;
    this.state.p1Score = 0;
    this.state.p2Score = 0;
    this.state.p1SaltCharges = 1;
    this.state.p2SaltCharges = 1;
    this.state.p1SaltLaunchCount = 0;
    this.state.p2SaltLaunchCount = 0;
    this.state.isHandoverPending = false;
    this.pairedTierStream = [this.rollTier(), this.rollTier()];
    this.p1TierIndex = 0;
    this.p2TierIndex = 0;
    this.state.playerTurn = 1;
    this.state.p1ShotsUsed = 0;
    this.state.p2ShotsUsed = 0;
    this.state.p1RingOutsThisBout = 0;
    this.state.p2RingOutsThisBout = 0;
    this.state.hasP1Yokozuna = false;
    this.state.hasP2Yokozuna = false;
    this.state.isSuddenDeath = false;
    this.state.suddenDeathPairCount = 0;
    this.state.turnPhase = 'PREPARE';
    this.state.latestTurnSummary = null;
    this.state.p1NextTiers = [this.pairedTierStream[0], this.pairedTierStream[1]];
    this.state.p2NextTiers = [this.pairedTierStream[0], this.pairedTierStream[1]];
  }

  public rollTier(): number {
    const r = Math.random();
    if (r < 0.55) return 1;
    if (r < 0.85) return 2;
    return 3;
  }

  public consumeCurrentLoadedTier(): { tier: number; nextTiers: [number, number] } {
    const isP1 = this.state.playerTurn === 1;
    const index = isP1 ? this.p1TierIndex : this.p2TierIndex;
    while (this.pairedTierStream.length <= index + 2) this.pairedTierStream.push(this.rollTier());
    const tier = this.pairedTierStream[index];
    const nextTiers: [number, number] = [
      this.pairedTierStream[index + 1],
      this.pairedTierStream[index + 2],
    ];
    if (isP1) {
      this.p1TierIndex++;
      this.state.p1NextTiers = nextTiers;
    } else {
      this.p2TierIndex++;
      this.state.p2NextTiers = nextTiers;
    }
    return { tier, nextTiers };
  }

  public setTurnPhase(phase: VersusState['turnPhase']) {
    this.state.turnPhase = phase;
  }

  public setActiveObjective(objective: VersusTurnObjective | null) {
    this.state.activeObjective = objective;
  }

  public setLatestTurnSummary(summary: VersusTurnSummary | null) {
    this.state.latestTurnSummary = summary;
  }

  public advanceTurn(requireHandover = false) {
    this.state.playerTurn = this.state.playerTurn === 1 ? 2 : 1;
    this.state.isHandoverPending = requireHandover && (this.state.passAndPlayPauseEnabled ?? false);
    this.state.turnPhase = 'PREPARE';
  }

  public setHandoverPending(pending: boolean) {
    this.state.isHandoverPending = pending;
  }

  public setPassAndPlayPauseEnabled(enabled: boolean) {
    this.state.passAndPlayPauseEnabled = enabled;
  }

  public togglePassAndPlayPause() {
    this.state.passAndPlayPauseEnabled = !this.state.passAndPlayPauseEnabled;
  }

  public setTabletopInversion(enabled: boolean) {
    this.state.tabletopInversion = enabled;
  }

  public toggleTabletopInversion() {
    this.state.tabletopInversion = !this.state.tabletopInversion;
  }

  public updateTugOfWar(fruits: SumoFruitInstance[]) {
    let m1 = 0;
    let m2 = 0;
    for (const f of fruits) {
      if (f.state !== 'IN_RING' || f.entryPending) continue;
      const mass = FRUIT_CATALOG[f.tier - 1]?.mass || 1;
      if (f.team === 'PLAYER_1' || f.team === 'PLAYER') {
        m1 += mass;
      } else if (f.team === 'PLAYER_2') {
        m2 += mass;
      }
    }
    this.state.tugOfWarMassP1 = m1;
    this.state.tugOfWarMassP2 = m2;
  }

  public addScore(player: 1 | 2, amount: number) {
    if (player === 1) {
      this.state.p1Score += amount;
    } else {
      this.state.p2Score += amount;
    }
  }

  public onPlayerLaunch() {
    if (this.state.playerTurn === 1) {
      this.state.p1ShotsUsed++;
      if (this.state.p1SaltCharges < 1) {
        this.state.p1SaltLaunchCount++;
        if (this.state.p1SaltLaunchCount >= 5) {
          this.state.p1SaltCharges = 1;
          this.state.p1SaltLaunchCount = 0;
        }
      }
    } else {
      this.state.p2ShotsUsed++;
      if (this.state.p2SaltCharges < 1) {
        this.state.p2SaltLaunchCount++;
        if (this.state.p2SaltLaunchCount >= 5) {
          this.state.p2SaltCharges = 1;
          this.state.p2SaltLaunchCount = 0;
        }
      }
    }
    this.state.turnPhase = 'SHOT_IN_PLAY';
  }

  public canThrowSalt(): boolean {
    return this.state.playerTurn === 1 ? this.state.p1SaltCharges > 0 : this.state.p2SaltCharges > 0;
  }

  public consumeSalt(): boolean {
    if (!this.canThrowSalt()) return false;
    if (this.state.playerTurn === 1) {
      this.state.p1SaltCharges = 0;
      this.state.p1SaltLaunchCount = 0;
    } else {
      this.state.p2SaltCharges = 0;
      this.state.p2SaltLaunchCount = 0;
    }
    return true;
  }

  public recordRingOutOccurred(victimOwner: 1 | 2) {
    if (victimOwner === 1) {
      // P2 scored an opponent ring-out
      this.state.p2RingOutsThisBout++;
    } else {
      // P1 scored an opponent ring-out
      this.state.p1RingOutsThisBout++;
    }
  }

  public recordYokozunaCreated(owner: 1 | 2) {
    if (owner === 1) {
      this.state.hasP1Yokozuna = true;
    } else {
      this.state.hasP2Yokozuna = true;
    }
  }

  /**
   * Check whether the regulation shot limit has completed:
   * Both players have completed 5 shots each (or equal shots in sudden death)
   */
  public hasCompletedShotLimit(): boolean {
    if (this.state.isSuddenDeath) {
      return (
        this.state.p1ShotsUsed === this.state.p2ShotsUsed &&
        this.state.p1ShotsUsed >= this.state.shotsPerPlayer + this.state.suddenDeathPairCount
      );
    }
    return (
      this.state.p1ShotsUsed >= this.state.shotsPerPlayer &&
      this.state.p2ShotsUsed >= this.state.shotsPerPlayer &&
      this.state.p1ShotsUsed === this.state.p2ShotsUsed
    );
  }

  /**
   * Decides tiebreak outcome when shot limit is reached with no sudden ringout
   * 1. More opponent ring-outs wins.
   * 2. Higher versus score wins.
   * 3. Yokozuna priority wins.
   * 4. Greater remaining owned mass wins.
   * 5. If still tied, enter sudden death.
   */
  public evaluateShotLimitBoutOutcome(fruits: SumoFruitInstance[]): {
    winner: 1 | 2 | null;
    method: string;
    methodJp: string;
    enterSuddenDeath: boolean;
  } {
    this.updateTugOfWar(fruits);

    // 1. More opponent ring-outs
    if (this.state.p1RingOutsThisBout !== this.state.p2RingOutsThisBout) {
      const winner = this.state.p1RingOutsThisBout > this.state.p2RingOutsThisBout ? 1 : 2;
      return {
        winner,
        method: 'Ring-Out Advantage',
        methodJp: '技有勝',
        enterSuddenDeath: false,
      };
    }

    // 2. Higher versus score
    if (this.state.p1Score !== this.state.p2Score) {
      const winner = this.state.p1Score > this.state.p2Score ? 1 : 2;
      return {
        winner,
        method: 'Points Decision (Yūsei)',
        methodJp: '優勢勝ち',
        enterSuddenDeath: false,
      };
    }

    // 3. Yokozuna priority
    if (this.state.hasP1Yokozuna !== this.state.hasP2Yokozuna) {
      const winner = this.state.hasP1Yokozuna ? 1 : 2;
      return {
        winner,
        method: 'Yokozuna Awakening',
        methodJp: '横綱優先',
        enterSuddenDeath: false,
      };
    }

    // 4. Greater remaining owned mass
    if (this.state.tugOfWarMassP1 !== this.state.tugOfWarMassP2) {
      const winner = this.state.tugOfWarMassP1 > this.state.tugOfWarMassP2 ? 1 : 2;
      return {
        winner,
        method: 'Rikishi Mass Dominance',
        methodJp: '重量判定',
        enterSuddenDeath: false,
      };
    }

    // 5. Enter sudden death
    this.state.isSuddenDeath = true;
    this.state.suddenDeathPairCount++;
    return {
      winner: null,
      method: 'Sudden Death Encho-sen',
      methodJp: '延長戦',
      enterSuddenDeath: true,
    };
  }

  public recordBoutVictory(
    winner: 1 | 2,
    method: string,
    methodJp: string,
    decisiveFruitTier: number
  ): { isMatchOver: boolean; matchWinner: 1 | 2 | null } {
    if (this.boutResolved || this.state.isMatchOver) {
      return { isMatchOver: this.state.isMatchOver, matchWinner: this.state.matchWinner };
    }
    this.boutResolved = true;
    if (winner === 1) {
      this.state.p1RoundsWon++;
    } else {
      this.state.p2RoundsWon++;
    }

    const record: VersusBoutRecord = {
      bout: this.state.currentBout,
      winner,
      method,
      methodJp,
      p1Score: this.state.p1Score,
      p2Score: this.state.p2Score,
      decisiveFruitTier,
    };

    this.state.lastBoutResult = record;
    this.state.boutHistory.push(record);

    const neededWins = Math.ceil(this.state.maxRounds / 2);
    if (this.state.p1RoundsWon >= neededWins) {
      this.state.isMatchOver = true;
      this.state.matchWinner = 1;
    } else if (this.state.p2RoundsWon >= neededWins) {
      this.state.isMatchOver = true;
      this.state.matchWinner = 2;
    } else {
      this.state.currentBout++;
      this.state.boutTransitionPending = true;
    }

    return {
      isMatchOver: this.state.isMatchOver,
      matchWinner: this.state.matchWinner,
    };
  }

  /**
   * Finalizes the current turn with the turn summary, transitions to RESULT,
   * and prepares for handover/advance.
   */
  public finalizeTurn(summary: VersusTurnSummary, requireHandover = false) {
    this.state.latestTurnSummary = summary;
    this.state.turnPhase = 'RESULT';
    this.state.playerTurn = this.state.playerTurn === 1 ? 2 : 1;
    this.state.isHandoverPending = requireHandover && (this.state.passAndPlayPauseEnabled ?? false);
  }
}
