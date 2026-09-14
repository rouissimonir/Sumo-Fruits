import { TechniqueRibbon } from '../types/game';

export class TechniqueRibbonManager {
  private activeRibbons: TechniqueRibbon[] = [];
  private nextId = 1;

  public getActiveRibbons(): TechniqueRibbon[] {
    return this.activeRibbons;
  }

  public addRibbon(
    title: string,
    subtitle: string,
    color: string = '#F1C40F',
    duration: number = 2.6,
    kanji?: string,
    icon?: string,
    kimariteTag?: string
  ) {
    // Avoid spamming duplicate titles
    if (this.activeRibbons.some((r) => r.title === title)) return;

    this.activeRibbons.push({
      id: this.nextId++,
      title,
      subtitle,
      color,
      duration,
      kanji,
      icon,
      kimariteTag,
    });

    if (this.activeRibbons.length > 3) {
      this.activeRibbons.shift();
    }
  }

  public update(dt: number) {
    for (let i = this.activeRibbons.length - 1; i >= 0; i--) {
      this.activeRibbons[i].duration -= dt;
      if (this.activeRibbons[i].duration <= 0) {
        this.activeRibbons.splice(i, 1);
      }
    }
  }

  public clear() {
    this.activeRibbons = [];
  }
}
