import { PEG_EFFECTS, TOTAL_PEGS } from "../utils/constants";
import type { PegEffectConfig } from "../utils/constants";

export type EffectStatus = "locked" | "ready" | "active" | "cooldown";

export interface EffectState {
  config: PegEffectConfig;
  status: EffectStatus;
  timeRemaining: number;
  level: number;
  enchantedPegs: Set<number>;
  sessionEarnings: number;
  portalPairs: { entrance: number; exit: number }[];
}

export interface EffectSaveEntry {
  status: EffectStatus;
  timeRemaining: number;
  sessionEarnings: number;
}

export class PegEffectManager {
  private effects: Map<string, EffectState> = new Map();
  private totalPegs: number = TOTAL_PEGS;
  private paused: boolean = false;

  constructor() {
    for (const cfg of PEG_EFFECTS) {
      this.effects.set(cfg.id, {
        config: cfg,
        status: "ready",
        timeRemaining: 0,
        level: 0,
        enchantedPegs: new Set(),
        sessionEarnings: 0,
        portalPairs: [],
      });
    }
  }

  setLevel(id: string, level: number): void {
    const ef = this.effects.get(id);
    if (!ef) return;
    ef.level = level;
  }

  getLevel(id: string): number {
    return this.effects.get(id)?.level ?? 0;
  }

  getState(id: string): EffectState | undefined {
    return this.effects.get(id);
  }

  getAllStates(): EffectState[] {
    return Array.from(this.effects.values());
  }

  addEarnings(effectId: string, amount: number): void {
    const ef = this.effects.get(effectId);
    if (ef) {
      ef.sessionEarnings += amount;
    }
  }

  reset(): void {
    for (const [, ef] of this.effects) {
      ef.status = "ready";
      ef.timeRemaining = 0;
      ef.level = 0;
      ef.enchantedPegs.clear();
      ef.sessionEarnings = 0;
      ef.portalPairs = [];
    }
  }

  private getPegCount(cfg: PegEffectConfig, level: number): number {
    return Math.min(this.totalPegs, cfg.basePegCount + cfg.pegCountUpgrade * level);
  }

  private getDuration(cfg: PegEffectConfig, level: number): number {
    return cfg.baseDuration + cfg.durationUpgrade * level;
  }

  private getCooldown(cfg: PegEffectConfig, level: number): number {
    return Math.max(5000, cfg.baseCooldown - cfg.cooldownUpgrade * level);
  }

  private pickRandomPegs(count: number, exclude: Set<number>): Set<number> {
    const pool: number[] = [];
    for (let i = 0; i < this.totalPegs; i++) {
      if (!exclude.has(i)) pool.push(i);
    }

    const result = new Set<number>();
    const shuffled = pool.sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(count, shuffled.length); i++) {
      result.add(shuffled[i]);
    }
    return result;
  }

  private autoActivate(ef: EffectState): void {
    ef.status = "active";
    ef.timeRemaining = this.getDuration(ef.config, ef.level);
    ef.sessionEarnings = 0;

    const allEnchanted = this.getAllEnchantedPegs();
    const count = this.getPegCount(ef.config, ef.level);
    ef.enchantedPegs = this.pickRandomPegs(count, allEnchanted);

    // For portal effect, create pairs from enchanted pegs
    if (ef.config.id === "portal") {
      ef.portalPairs = [];
      const pegArr = Array.from(ef.enchantedPegs);
      // Shuffle and pair up
      const shuffled = pegArr.sort(() => Math.random() - 0.5);
      for (let i = 0; i + 1 < shuffled.length; i += 2) {
        ef.portalPairs.push({ entrance: shuffled[i], exit: shuffled[i + 1] });
      }
    }
  }

  private getAllEnchantedPegs(): Set<number> {
    const all = new Set<number>();
    for (const [, state] of this.effects) {
      for (const idx of state.enchantedPegs) {
        all.add(idx);
      }
    }
    return all;
  }

  onPegHit(effectId: string, pegIndex: number): void {
    const ef = this.effects.get(effectId);
    if (!ef || ef.status !== "active") return;

    ef.enchantedPegs.delete(pegIndex);

    const allEnchanted = this.getAllEnchantedPegs();
    const newPeg = this.pickRandomPegs(1, allEnchanted);
    if (newPeg.size > 0) {
      const [idx] = newPeg;
      ef.enchantedPegs.add(idx);
    }
  }

  isPegEnchanted(effectId: string, pegIndex: number): boolean {
    const ef = this.effects.get(effectId);
    return ef?.enchantedPegs.has(pegIndex) ?? false;
  }

  getEnchantedPegsForEffect(effectId: string): Set<number> {
    return this.effects.get(effectId)?.enchantedPegs ?? new Set();
  }

  getAllEnchantedPegIndices(): Map<number, string[]> {
    const map = new Map<number, string[]>();
    for (const [id, state] of this.effects) {
      if (state.status !== "active") continue;
      for (const idx of state.enchantedPegs) {
        const arr = map.get(idx);
        if (arr) arr.push(id);
        else map.set(idx, [id]);
      }
    }
    return map;
  }

  getSaveData(): Record<string, EffectSaveEntry> {
    const data: Record<string, EffectSaveEntry> = {};
    for (const [id, ef] of this.effects) {
      data[id] = {
        status: ef.status,
        timeRemaining: ef.timeRemaining,
        sessionEarnings: ef.sessionEarnings,
      };
    }
    return data;
  }

  loadSaveData(data: Record<string, EffectSaveEntry>): void {
    for (const [id, saved] of Object.entries(data)) {
      const ef = this.effects.get(id);
      if (!ef) continue;
      ef.status = saved.status;
      ef.timeRemaining = saved.timeRemaining;
      ef.sessionEarnings = saved.sessionEarnings ?? 0;
      if (saved.status === "active") {
        const allEnchanted = this.getAllEnchantedPegs();
        const count = this.getPegCount(ef.config, ef.level);
        ef.enchantedPegs = this.pickRandomPegs(count, allEnchanted);
      } else {
        ef.enchantedPegs.clear();
      }
    }
  }

  getPortalExit(entrancePegIndex: number): number | null {
    for (const [, ef] of this.effects) {
      if (ef.status !== "active") continue;
      for (const pair of ef.portalPairs) {
        if (pair.entrance === entrancePegIndex) return pair.exit;
      }
    }
    return null;
  }

  triggerAllReady(): void {
    for (const [, ef] of this.effects) {
      if (ef.status === "ready" && ef.level > 0) {
        this.autoActivate(ef);
      }
    }
  }

  setPaused(v: boolean): void { this.paused = v; }
  isPaused(): boolean { return this.paused; }

  update(delta: number): void {
    for (const [, ef] of this.effects) {
      if (ef.status === "locked") continue;

      ef.timeRemaining -= delta;

      if (ef.status === "ready") {
        if (ef.level > 0 && !this.paused) {
          this.autoActivate(ef);
        }
      } else if (ef.status === "active" && ef.timeRemaining <= 0) {
        ef.status = "cooldown";
        ef.timeRemaining = this.getCooldown(ef.config, ef.level);
        ef.enchantedPegs.clear();
        ef.portalPairs = [];
      } else if (ef.status === "cooldown" && ef.timeRemaining <= 0) {
        ef.status = "ready";
        ef.timeRemaining = 0;
      }
    }
  }
}
