import { SumoFruitInstance, VersusBoutRecord, VersusState, FRUIT_CATALOG } from '../types/game';

export class VersusManager {
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
    isHandoverPending: false,
    tabletopInversion: false,
    passAndPlayPauseEnabled: false,
  };

  public reset(maxRounds = 3) {
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
      isHandoverPending: false,
      tabletopInversion: keepTabletop,
      passAndPlayPauseEnabled: keepPassAndPlay,
    };
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

  public advanceTurn(requireHandover = false) {
    this.state.playerTurn = this.state.playerTurn === 1 ? 2 : 1;
    this.state.isHandoverPending = requireHandover && (this.state.passAndPlayPauseEnabled ?? false);
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
      if (this.state.p1SaltCharges < 1) {
        this.state.p1SaltLaunchCount++;
        if (this.state.p1SaltLaunchCount >= 5) {
          this.state.p1SaltCharges = 1;
          this.state.p1SaltLaunchCount = 0;
        }
      }
    } else {
      if (this.state.p2SaltCharges < 1) {
        this.state.p2SaltLaunchCount++;
        if (this.state.p2SaltLaunchCount >= 5) {
          this.state.p2SaltCharges = 1;
          this.state.p2SaltLaunchCount = 0;
        }
      }
    }
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

  public recordBoutVictory(
    winner: 1 | 2,
    method: string,
    methodJp: string,
    decisiveFruitTier: number
  ): { isMatchOver: boolean; matchWinner: 1 | 2 | null } {
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
    }

    return {
      isMatchOver: this.state.isMatchOver,
      matchWinner: this.state.matchWinner,
    };
  }
}
