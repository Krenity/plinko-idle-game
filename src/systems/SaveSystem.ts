import type { PegEffectManager, EffectSaveEntry } from "../game/PegEffectManager";
import type { ScoreSystem } from "./ScoreSystem";
import type { ShardSystem } from "./ShardSystem";
import type { UpgradeSystem } from "./UpgradeSystem";

const SAVE_KEY = "plinko-idle-save";

interface SaveData {
  currency: number;
  totalEarned: number;
  shards?: number;
  totalShards?: number;
  upgrades: Record<string, number>;
  prestigeLevel?: number;
  effectStates?: Record<string, EffectSaveEntry>;
  equippedRelics?: string[];
  purchasedRelics?: string[];
  timestamp: number;
}

export class SaveSystem {
  private scoreSystem: ScoreSystem;
  private upgradeSystem: UpgradeSystem;
  private shardSystem?: ShardSystem;
  private effectManager?: PegEffectManager;
  private getPrestigeLevel: () => number = () => 0;
  private setPrestigeLevel: (v: number) => void = () => {};
  private getEquippedRelics: () => string[] = () => [];
  private setEquippedRelics: (v: string[]) => void = () => {};
  private getPurchasedRelics: () => string[] = () => [];
  private setPurchasedRelics: (v: string[]) => void = () => {};
  constructor(scoreSystem: ScoreSystem, upgradeSystem: UpgradeSystem) {
    this.scoreSystem = scoreSystem;
    this.upgradeSystem = upgradeSystem;
  }

  setShardSystem(ss: ShardSystem): void {
    this.shardSystem = ss;
  }

  setEffectManager(em: PegEffectManager): void {
    this.effectManager = em;
  }

  setPrestigeLevelCallbacks(get: () => number, set: (v: number) => void): void {
    this.getPrestigeLevel = get;
    this.setPrestigeLevel = set;
  }

  setRelicCallbacks(get: () => string[], set: (v: string[]) => void, getPurchased?: () => string[], setPurchased?: (v: string[]) => void): void {
    this.getEquippedRelics = get;
    this.setEquippedRelics = set;
    if (getPurchased) this.getPurchasedRelics = getPurchased;
    if (setPurchased) this.setPurchasedRelics = setPurchased;
  }

  save(): void {
    const data: SaveData = {
      currency: this.scoreSystem.getCurrency(),
      totalEarned: this.scoreSystem.getTotalEarned(),
      shards: this.shardSystem?.getShards(),
      totalShards: this.shardSystem?.getTotalEarned(),
      upgrades: this.upgradeSystem.getUpgrades(),
      prestigeLevel: this.getPrestigeLevel(),
      effectStates: this.effectManager?.getSaveData(),
      equippedRelics: this.getEquippedRelics(),
      purchasedRelics: this.getPurchasedRelics(),
      timestamp: Date.now(),
    };

    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn("Failed to save game:", e);
    }
  }

  load(): boolean {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;

      const data: SaveData = JSON.parse(raw);
      this.scoreSystem.setCurrency(data.currency || 0);
      this.scoreSystem.setTotalEarned(data.totalEarned || 0);
      if (this.shardSystem) {
        this.shardSystem.setShards(data.shards ?? 0);
        this.shardSystem.setTotalEarned(data.totalShards ?? 0);
      }
      this.upgradeSystem.setUpgrades(data.upgrades || {});
      this.setPrestigeLevel(data.prestigeLevel ?? 0);
      this.setEquippedRelics(data.equippedRelics ?? []);
      this.setPurchasedRelics(data.purchasedRelics ?? []);

      if (data.effectStates && this.effectManager) {
        this.effectManager.loadSaveData(data.effectStates);
      }

      console.log("Game loaded successfully, prestigeLevel:", data.prestigeLevel ?? 0);
      return true;
    } catch (e) {
      console.warn("Failed to load game:", e);
      return false;
    }
  }

  clearSave(): void {
    localStorage.removeItem(SAVE_KEY);
  }

  hasSave(): boolean {
    return localStorage.getItem(SAVE_KEY) !== null;
  }
}
