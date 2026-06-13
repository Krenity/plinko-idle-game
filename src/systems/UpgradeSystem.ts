import { RELICS, UPGRADES } from "../utils/constants";
import type { ScoreSystem } from "./ScoreSystem";

export class UpgradeSystem {
  private scoreSystem: ScoreSystem;
  upgrades: Record<string, number> = {
    dropperSpeed: 0,
    unlockSquare: 0,
    unlockCircle: 0,
    unlockDiamond: 0,
    unlockPentagon: 0,
    unlockHexagon: 0,
    unlockStar: 0,
    slotMultiplier: 0,
    goldTouch: 0,
    splitShot: 0,
    treasure: 0,
    doubleDown: 0,
    jackpot: 0,
    luckySlot: 0,
    magnet: 0,
    goldenHour: 0,
    bumper: 0,
    portal: 0,
    shardChance: 0,
    relicSlots: 0,
  };

  constructor(scoreSystem: ScoreSystem) {
    this.scoreSystem = scoreSystem;
  }

  getUpgradeCost(upgrade: string): number {
    const config = UPGRADES[upgrade as keyof typeof UPGRADES];
    if (!config) return Infinity;
    const level = this.upgrades[upgrade] || 0;
    return Math.floor(config.baseCost * config.costMultiplier ** level);
  }

  canAfford(upgrade: string): boolean {
    return this.scoreSystem.getCurrency() >= this.getUpgradeCost(upgrade);
  }

  isMaxLevel(upgrade: string): boolean {
    if (upgrade === "relicSlots") {
      const max = Math.max(0, RELICS.length - 2);
      return (this.upgrades.relicSlots || 0) >= max;
    }
    const config = UPGRADES[upgrade as keyof typeof UPGRADES];
    if (!config) return true;
    return (this.upgrades[upgrade] || 0) >= config.maxLevel;
  }

  purchase(upgrade: string): boolean {
    if (this.isMaxLevel(upgrade)) return false;
    if (!this.canAfford(upgrade)) return false;

    const cost = this.getUpgradeCost(upgrade);
    if (this.scoreSystem.spendCurrency(cost)) {
      this.upgrades[upgrade] = (this.upgrades[upgrade] || 0) + 1;
      return true;
    }
    return false;
  }

  getSpeedReduction(): number {
    return this.upgrades.dropperSpeed * UPGRADES.dropperSpeed.effect;
  }

  getMultiplierBonus(): number {
    return this.upgrades.slotMultiplier * UPGRADES.slotMultiplier.effect;
  }

  getUpgrades(): Record<string, number> {
    return { ...this.upgrades };
  }

  setUpgrades(upgrades: Record<string, number>): void {
    const merged = { ...this.upgrades };
    for (const [key, val] of Object.entries(upgrades)) {
      if (key in merged) {
        merged[key] = val;
      }
    }
    this.upgrades = merged;
  }
}
