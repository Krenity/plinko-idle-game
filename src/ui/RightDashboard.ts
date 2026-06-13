import type { Game } from "../game/Game";
import { PEG_EFFECTS, RELICS, SHAPE_UNLOCK_CHAIN, SHARDS, UPGRADES } from "../utils/constants";
import type { PegEffectConfig, RelicConfig } from "../utils/constants";
import type { EffectState } from "../game/PegEffectManager";

type Tab = "effects" | "upgrades" | "relics";

const effectUpgradeMeta: { key: string; effectId: string }[] = [
  { key: "goldTouch", effectId: "goldTouch" },
  { key: "splitShot", effectId: "splitShot" },
  { key: "treasure", effectId: "treasure" },
  { key: "doubleDown", effectId: "doubleDown" },
  { key: "jackpot", effectId: "jackpot" },
  { key: "luckySlot", effectId: "luckySlot" },
  { key: "magnet", effectId: "magnet" },
  { key: "goldenHour", effectId: "goldenHour" },
  { key: "bumper", effectId: "bumper" },
  { key: "portal", effectId: "portal" },
];

const SHAPE_NAMES: Record<string, string> = {
  unlockSquare: "Square",
  unlockCircle: "Circle",
  unlockDiamond: "Diamond",
  unlockPentagon: "Pentagon",
  unlockHexagon: "Hexagon",
  unlockStar: "Star",
};

function camelToKebab(s: string): string {
  return s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

const STYLE = document.createElement("style");
STYLE.textContent = `
#side-panel {
  scrollbar-width: thin;
  scrollbar-color: #2a2a4a #121224;
}
#side-panel::-webkit-scrollbar { width: 6px; }
#side-panel::-webkit-scrollbar-track { background: #121224; }
#side-panel::-webkit-scrollbar-thumb { background: #2a2a4a; border-radius: 3px; }
#side-panel::-webkit-scrollbar-thumb:hover { background: #3f3f70; }

.effect-card[data-effect="gold-touch"]   { --accent: #ffd700; --accent-rgb: 255,215,0; }
.effect-card[data-effect="split-shot"]   { --accent: #00f0ff; --accent-rgb: 0,240,255; }
.effect-card[data-effect="treasure"]     { --accent: #10b981; --accent-rgb: 16,185,129; }
.effect-card[data-effect="double-down"]  { --accent: #a855f7; --accent-rgb: 168,85,247; }
.effect-card[data-effect="jackpot"]      { --accent: #ef4444; --accent-rgb: 239,68,68; }
.effect-card[data-effect="lucky-slot"]   { --accent: #f59e0b; --accent-rgb: 245,158,11; }
.effect-card[data-effect="magnet"]       { --accent: #3b82f6; --accent-rgb: 59,130,246; }
.effect-card[data-effect="golden-hour"]  { --accent: #eab308; --accent-rgb: 234,179,8; }
.effect-card[data-effect="bumper"]       { --accent: #ff8844; --accent-rgb: 255,136,68; }
.effect-card[data-effect="portal"]       { --accent: #dd88ff; --accent-rgb: 221,136,255; }

.effect-card {
  border: 1px solid #2a2a4a;
  border-left: 4px solid var(--accent);
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
}


.effect-card .card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.effect-card .card-title { font-size: 14px; font-weight: 700; color: #fff; letter-spacing: 0.3px; }
.effect-card .level-badge {
  font-size: 11px; font-weight: bold;
  background: rgba(var(--accent-rgb), 0.15);
  color: var(--accent);
  padding: 2px 6px; border-radius: 4px;
  border: 1px solid rgba(var(--accent-rgb), 0.25);
  font-family: monospace;
}
.effect-card .card-desc { margin: 0; font-size: 12px; color: #a0a0c0; line-height: 1.4; }
.effect-card .card-footer {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 4px; font-size: 11px;
}
.effect-card .status-text { font-weight: 600; color: #6d6d8d; }
.effect-card .stat-value { color: #ffd700; font-weight: bold; font-family: monospace; }
.effect-card .stat-label { color: #6d6d8d; font-size: 9px; font-weight: normal; }
.effect-card .progress-track {
  width: 100%; height: 4px;
  background: #121224; border-radius: 2px; overflow: hidden;
  margin-top: 6px;
}
.effect-card .progress-bar {
  height: 100%;
  background: var(--accent);
  border-radius: 2px;
  transition: width 0.1s linear;
}

.effect-card.active {
  box-shadow: 0 0 8px rgba(var(--accent-rgb), 0.15);
  border-color: rgba(var(--accent-rgb), 0.4) rgba(var(--accent-rgb), 0.4) rgba(var(--accent-rgb), 0.4) var(--accent);
}
.effect-card.active .status-text { color: var(--accent); }
.effect-card.cooldown { opacity: 0.65; }
.effect-card.cooldown .status-text { color: #a855f7; }
.effect-card.cooldown .progress-bar { background: #4a4a6a; }
.effect-card.ready { border-color: var(--accent); }
.effect-card.ready .status-text { color: #10b981; }
.effect-card.ready .progress-bar { width: 100% !important; }
`;

export class RightDashboard {
  private game: Game;
  private panel!: HTMLDivElement;
  private tab: Tab = "effects";
  private refreshInterval: number | null = null;
  private styleInjected = false;

  constructor(game: Game) {
    this.game = game;
  }

  init(): void {
    if (!this.styleInjected) {
      document.head.appendChild(STYLE);
      this.styleInjected = true;
    }

    this.panel = document.createElement("div");
    this.panel.id = "side-panel";
    this.panel.style.cssText = `
      position: fixed; top: 0; right: 0;
      width: 240px; height: 100%;
      background: #121224;
      border-left: 1px solid #2a2a4a;
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
      color: #fff; z-index: 150;
      overflow-y: scroll; display: flex; flex-direction: column;
    `;
    document.body.appendChild(this.panel);
    this.playTimeEl = this.createPlayTimeClock();
    this.createHelpButton();
    this.render();
    this.refreshInterval = window.setInterval(() => this.update(), 1000);
  }

  private render(): void {
    const scrollTop = this.panel.scrollTop;
    this.panel.innerHTML = "";

    const header = document.createElement("div");
    header.style.cssText = "display:flex;background:#16162a;border-bottom:1px solid #2a2a4a;";

    const effBtn = document.createElement("button");
    effBtn.textContent = "Effects";
    effBtn.style.cssText = this.tabBtnStyle(this.tab === "effects");
    effBtn.addEventListener("click", () => { this.tab = "effects"; this.render(); });

    const upgBtn = document.createElement("button");
    upgBtn.textContent = "Upgrades";
    upgBtn.style.cssText = this.tabBtnStyle(this.tab === "upgrades");
    upgBtn.addEventListener("click", () => { this.tab = "upgrades"; this.render(); });

    const relicBtn = document.createElement("button");
    relicBtn.textContent = "Relics";
    relicBtn.style.cssText = this.tabBtnStyle(this.tab === "relics");
    relicBtn.addEventListener("click", () => { this.tab = "relics"; this.render(); });

    header.appendChild(effBtn);
    header.appendChild(upgBtn);
    header.appendChild(relicBtn);
    this.panel.appendChild(header);

    const body = document.createElement("div");
    body.style.cssText = "flex:1;padding:12px;";

    if (this.tab === "effects") this.renderEffects(body);
    else if (this.tab === "upgrades") this.renderUpgrades(body);
    else if (this.tab === "relics") this.renderRelics(body);

    this.panel.appendChild(body);
    requestAnimationFrame(() => {
      this.panel.scrollTop = Math.min(scrollTop, this.panel.scrollHeight);
    });
  }

  private tabBtnStyle(active: boolean): string {
    return [
      "flex:1;background:transparent;border:none;padding:12px;",
      `color:${active ? "#fff" : "#8f8fad"};`,
      "font-weight:600;font-size:13px;letter-spacing:0.5px;cursor:pointer;",
      "transition:all 0.2s ease;",
      `border-bottom:2px solid ${active ? "#00f0ff" : "transparent"};`,
      `background:${active ? "rgba(0,240,255,0.04)" : "transparent"};`,
    ].join("");
  }

  private renderEffects(container: HTMLDivElement): void {
    // Time Freeze toggle
    if (this.game.hasRelic("timeFreeze")) {
      const paused = this.game.effectManager.isPaused();
      const row = document.createElement("div");
      row.style.cssText = "display:flex;align-items:center;gap:8px;margin-bottom:10px;padding:6px 8px;border:1px solid #3a3a5a;border-radius:4px;";
      const lbl = document.createElement("span");
      lbl.style.cssText = "flex:1;font-size:11px;color:#a0a0c0;";
      lbl.textContent = paused ? "Effects Paused" : "Effects Running";
      const btn = document.createElement("button");
      btn.style.cssText = `padding:4px 10px;border:none;border-radius:3px;font-weight:bold;font-size:11px;cursor:pointer;${paused ? "background:#f59e0b;color:#000" : "background:#2a2a4a;color:#888"};`;
      btn.textContent = paused ? "UNPAUSE & FIRE" : "PAUSE";
      btn.addEventListener("click", () => {
        if (paused) {
          this.game.effectManager.setPaused(false);
          this.game.effectManager.triggerAllReady();
        } else {
          this.game.effectManager.setPaused(true);
        }
        this.render();
      });
      row.appendChild(lbl);
      row.appendChild(btn);
      container.appendChild(row);
    }

    const sortedEffects = [...PEG_EFFECTS].sort((a, b) => {
      const costA = UPGRADES[a.id]?.baseCost ?? 0;
      const costB = UPGRADES[b.id]?.baseCost ?? 0;
      return costA - costB;
    });

    for (const cfg of sortedEffects) {
      const state = this.game.effectManager.getState(cfg.id);
      if (!state) continue;

      const isLocked = state.level === 0;
      const stateClass = isLocked ? "" : state.status;

      const card = document.createElement("div");
      card.className = `effect-card${stateClass ? " " + stateClass : ""}`;
      card.setAttribute("data-effect", camelToKebab(cfg.id));

      const header = document.createElement("div");
      header.className = "card-header";

      const title = document.createElement("span");
      title.className = "card-title";
      title.textContent = cfg.name;
      header.appendChild(title);

      if (!isLocked) {
        const badge = document.createElement("span");
        badge.className = "level-badge";
        badge.textContent = `Lv.${state.level}`;
        header.appendChild(badge);
      }
      card.appendChild(header);

      const desc = document.createElement("p");
      desc.className = "card-desc";
      desc.textContent = isLocked ? "Locked — purchase in Upgrades" : cfg.desc;
      card.appendChild(desc);

      const footer = document.createElement("div");
      footer.className = "card-footer";

      const st = document.createElement("span");
      st.className = "status-text";
      st.textContent = this.statusText(state);
      footer.appendChild(st);

      if (state.sessionEarnings > 0) {
        const sv = document.createElement("span");
        sv.className = "stat-value";
        sv.innerHTML = `+${this.formatNum(state.sessionEarnings)} <span class="stat-label">this run</span>`;
        footer.appendChild(sv);
      }
      card.appendChild(footer);

      if (!isLocked && (state.status === "active" || state.status === "cooldown" || state.status === "ready")) {
        const track = document.createElement("div");
        track.className = "progress-track";

        const bar = document.createElement("div");
        bar.className = "progress-bar";

        if (state.status === "ready") {
          bar.style.width = "100%";
        } else {
          const total = state.status === "active"
            ? this.getEffectDuration(cfg, state.level)
            : this.getEffectCooldown(cfg, state.level);
          const pct = total > 0 ? Math.max(0, state.timeRemaining / total) : 0;
          bar.style.width = `${pct * 100}%`;
        }

        track.appendChild(bar);
        card.appendChild(track);
      }

      container.appendChild(card);
    }
  }

  // ── Relics tab ──

  private renderRelics(container: HTMLDivElement): void {
    const equipped = this.game.equippedRelics || [];
    const purchased = this.game.purchasedRelics || [];
    const byCost = (a: typeof RELICS[0], b: typeof RELICS[0]) => a.cost - b.cost;
    const unowned = RELICS.filter(r => !purchased.includes(r.id)).sort(byCost);
    const owned = RELICS.filter(r => purchased.includes(r.id) && !equipped.includes(r.id)).sort(byCost);
    const eqRelics = RELICS.filter(r => equipped.includes(r.id)).sort(byCost);

    const maxSlots = 2 + (this.game.upgradeSystem.upgrades.relicSlots || 0);
    const slotCap = Math.max(0, RELICS.length);
    const slotsRemaining = maxSlots - equipped.length;

    // Slot indicator
    const slotInfo = document.createElement("div");
    slotInfo.style.cssText = "font-size:11px;color:#a0a0c0;margin-bottom:8px;text-align:center;";
    slotInfo.textContent = `Equip Slots: ${equipped.length} / ${maxSlots} (max ${slotCap})`;
    container.appendChild(slotInfo);

    const section = (title: string) => {
      const h = document.createElement("div");
      h.style.cssText = "font-weight:bold;font-size:12px;margin:10px 0 6px;padding:4px 0;border-bottom:1px solid #2a2a4a;color:#a0a0c0;";
      h.textContent = title;
      container.appendChild(h);
    };

    // ── Equipped ──
    if (eqRelics.length > 0) {
      section("Equipped");
      for (const relic of eqRelics) {
        this.renderRelicCard(container, relic, "equipped", maxSlots);
      }
    }

    // ── Owned (not equipped) ──
    if (owned.length > 0) {
      section("Collection");
      for (const relic of owned) {
        this.renderRelicCard(container, relic, "owned", maxSlots);
      }
    }

    // ── Unowned ──
    if (unowned.length > 0) {
      section("For Sale");
      for (const relic of unowned) {
        this.renderRelicCard(container, relic, "unowned", maxSlots);
      }
    }
  }

  private renderRelicCard(container: HTMLDivElement, relic: RelicConfig, state: "equipped" | "owned" | "unowned", maxSlots: number): void {
    const equipped = this.game.equippedRelics || [];
    const purchased = this.game.purchasedRelics || [];
    const isEquipped = equipped.includes(relic.id);
    const isPurchased = purchased.includes(relic.id);
    const canAfford = this.game.shardSystem.getShards() >= relic.cost;
    const slotsFull = equipped.length >= maxSlots;

    const card = document.createElement("div");
    card.style.cssText = `margin-bottom:8px;padding:8px;border:1px solid ${isEquipped ? "#4a4a7a" : isPurchased ? "#2a4a2a" : "#2a2a4a"};border-left:3px solid ${isEquipped ? "#a855f7" : isPurchased ? "#10b981" : "#3a3a5a"};border-radius:4px;`;

    const nameRow = document.createElement("div");
    nameRow.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;";
    const name = document.createElement("span");
    name.style.cssText = "font-weight:bold;font-size:12px;color:#fff;";
    name.textContent = relic.name;
    nameRow.appendChild(name);

    if (isEquipped) {
      const badge = document.createElement("span");
      badge.style.cssText = "font-size:9px;color:#a855f7;font-weight:bold;";
      badge.textContent = "EQUIPPED";
      nameRow.appendChild(badge);
    } else if (isPurchased) {
      const badge = document.createElement("span");
      badge.style.cssText = "font-size:9px;color:#10b981;font-weight:bold;";
      badge.textContent = "OWNED";
      nameRow.appendChild(badge);
    }
    card.appendChild(nameRow);

    const desc = document.createElement("div");
    desc.style.cssText = "font-size:10px;color:#8f8fad;margin-bottom:6px;";
    desc.textContent = relic.desc;
    card.appendChild(desc);

    const btn = document.createElement("button");
    if (!isPurchased) {
      btn.style.cssText = `width:100%;padding:6px;border:none;border-radius:3px;font-family:inherit;font-size:11px;font-weight:600;cursor:${canAfford ? "pointer" : "default"};background:${canAfford ? "#3a1a5a" : "#2a2a4a"};color:${canAfford ? "#fff" : "#666"};`;
      btn.textContent = `Purchase (${this.formatNum(relic.cost)}\u25C6)`;
      btn.disabled = !canAfford;
      btn.addEventListener("click", () => {
        if (this.game.shardSystem.spendShards(relic.cost)) {
          this.game.purchasedRelics.push(relic.id);
          this.render();
        }
      });
    } else if (isEquipped) {
      btn.style.cssText = "width:100%;padding:6px;border:none;border-radius:3px;font-family:inherit;font-size:11px;font-weight:600;cursor:pointer;background:#3a1a3a;color:#a855f7;";
      btn.textContent = "Unequip";
      btn.addEventListener("click", () => {
        this.game.equippedRelics = this.game.equippedRelics.filter((id: string) => id !== relic.id);
        this.render();
      });
    } else {
      btn.style.cssText = `width:100%;padding:6px;border:none;border-radius:3px;font-family:inherit;font-size:11px;font-weight:600;cursor:${slotsFull ? "default" : "pointer"};background:${slotsFull ? "#2a2a4a" : "#1a3a2a"};color:${slotsFull ? "#666" : "#fff"};`;
      btn.textContent = slotsFull ? "Slots Full" : "Equip";
      btn.disabled = slotsFull;
      if (!slotsFull) {
        btn.addEventListener("click", () => {
          this.game.equippedRelics.push(relic.id);
          this.render();
        });
      }
    }
    card.appendChild(btn);
    container.appendChild(card);
  }

  private renderUpgrades(container: HTMLDivElement): void {
    const section = (title: string) => {
      const h = document.createElement("div");
      h.style.cssText = "font-weight:bold;font-size:13px;margin:8px 0 6px;padding:4px 0;border-bottom:1px solid #2a2a4a;color:#a0a0c0;";
      h.textContent = title;
      container.appendChild(h);
    };

    section("General");
    this.renderUpgradeCard(container, "dropperSpeed", "Dropper Speed", "Faster blob spawning");
    this.renderUpgradeCard(container, "slotMultiplier", "Upgrade Slots", "Increase all slot values");
    this.renderUpgradeCard(container, "shardChance", "Shard Chance", "Higher shard drop rate");
    this.renderUpgradeCard(container, "relicSlots", "Relic Slots", "More relic equip slots");

    section("Shape Unlocks");
    this.renderShapeUnlockProgression(container);

    section("Effect Upgrades");
    const sortedEffectMeta = [...effectUpgradeMeta].sort((a, b) => {
      const costA = UPGRADES[a.key]?.baseCost ?? 0;
      const costB = UPGRADES[b.key]?.baseCost ?? 0;
      return costA - costB;
    });
    for (const meta of sortedEffectMeta) {
      const cfg = PEG_EFFECTS.find((e) => e.id === meta.effectId);
      if (!cfg) continue;
      const level = this.game.effectManager.getLevel(meta.effectId);
      const isLocked = level === 0;
      const dur = this.getEffectDuration(cfg, level + 1);
      const cd = this.getEffectCooldown(cfg, level + 1);
      this.renderUpgradeCard(container, meta.key, cfg.name, `Dur: ${(dur / 1000).toFixed(1)}s | CD: ${(cd / 1000).toFixed(0)}s`, isLocked);
    }

    section("Prestige");
    this.renderPrestige(container);
  }

  private renderShapeUnlockProgression(container: HTMLDivElement): void {
    let nextLocked = -1;
    for (let i = 0; i < SHAPE_UNLOCK_CHAIN.length; i++) {
      const key = SHAPE_UNLOCK_CHAIN[i];
      if ((this.game.upgradeSystem.upgrades[key] || 0) === 0) {
        nextLocked = i;
        break;
      }
    }

    if (nextLocked === -1) {
      const allDone = document.createElement("div");
      allDone.style.cssText = "padding:4px 0;font-size:11px;color:#10b981;";
      allDone.textContent = "All shapes unlocked!";
      container.appendChild(allDone);
      return;
    }

    const nextKey = SHAPE_UNLOCK_CHAIN[nextLocked];
    const nextName = SHAPE_NAMES[nextKey] || nextKey;
    this.renderUpgradeCard(container, nextKey, nextName, "Next shape to unlock");
  }

  private showPrestigeDialog(): void {
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:1000;display:flex;align-items:center;justify-content:center;";

    const dialog = document.createElement("div");
    dialog.style.cssText = "background:#2a1a3a;border:2px solid #8a4aaa;border-radius:8px;padding:20px;max-width:300px;width:90%;font-family:'Segoe UI',sans-serif;color:#fff;";

    const title = document.createElement("div");
    title.style.cssText = "font-size:16px;font-weight:bold;color:#cc66ff;margin-bottom:12px;";
    title.textContent = "Prestige Confirmation";

    const body = document.createElement("div");
    body.style.cssText = "font-size:12px;color:#aaa;margin-bottom:16px;line-height:1.5;";
    body.innerHTML = `Reset all currency and upgrades?<br>You will gain a permanent <b style="color:#ffd700">x${this.getNextPrestigeMult()}</b> income multiplier.`;

    const btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;gap:8px;";

    const confirmBtn = document.createElement("button");
    confirmBtn.textContent = "PRESTIGE";
    confirmBtn.style.cssText = "flex:1;padding:8px;background:#7c3aed;color:#fff;border:none;cursor:pointer;font-weight:bold;border-radius:4px;";

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.style.cssText = "flex:1;padding:8px;background:#2a2a4a;color:#888;border:none;cursor:pointer;border-radius:4px;";

    btnRow.appendChild(confirmBtn);
    btnRow.appendChild(cancelBtn);
    dialog.appendChild(title);
    dialog.appendChild(body);
    dialog.appendChild(btnRow);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    confirmBtn.onclick = () => {
      this.game.doPrestige();
      document.body.removeChild(overlay);
      this.render();
    };
    cancelBtn.onclick = () => {
      document.body.removeChild(overlay);
    };
  }

  private showMasterResetDialog(): void {
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:1000;display:flex;align-items:center;justify-content:center;";

    const dialog = document.createElement("div");
    dialog.style.cssText = "background:#2a1a1a;border:2px solid #ff4444;border-radius:8px;padding:20px;max-width:320px;width:90%;font-family:'Segoe UI',sans-serif;color:#fff;";

    const title = document.createElement("div");
    title.style.cssText = "font-size:16px;font-weight:bold;color:#ff4444;margin-bottom:12px;";
    title.textContent = "Master Reset";

    const body = document.createElement("div");
    body.style.cssText = "font-size:12px;color:#ccc;margin-bottom:16px;line-height:1.5;";
    body.innerHTML = `This will permanently erase ALL progress:<br><br>
      • Currency &amp; shards<br>
      • All upgrades &amp; prestige level<br>
      • All relics (equipped &amp; purchased)<br>
      • Auto-drop patterns<br><br>
      <b style="color:#ff6666;">This cannot be undone.</b><br><br>
      Type <b style="color:#ff6666;">RESET</b> below to confirm:`;

    const input = document.createElement("input");
    input.type = "text";
    input.style.cssText = "width:100%;padding:8px;margin-bottom:12px;background:#121224;color:#fff;border:1px solid #3a2a2a;border-radius:4px;font-family:inherit;font-size:13px;text-align:center;outline:none;box-sizing:border-box;";

    const btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;gap:8px;";

    const confirmBtn = document.createElement("button");
    confirmBtn.textContent = "RESET EVERYTHING";
    confirmBtn.style.cssText = "flex:1;padding:8px;background:#ff3333;color:#fff;border:none;cursor:pointer;font-weight:bold;border-radius:4px;opacity:0.5;";
    confirmBtn.disabled = true;

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.style.cssText = "flex:1;padding:8px;background:#2a2a4a;color:#888;border:none;cursor:pointer;border-radius:4px;";

    input.addEventListener("input", () => {
      const match = input.value.trim().toUpperCase() === "RESET";
      confirmBtn.disabled = !match;
      confirmBtn.style.opacity = match ? "1" : "0.5";
    });

    btnRow.appendChild(confirmBtn);
    btnRow.appendChild(cancelBtn);
    dialog.appendChild(title);
    dialog.appendChild(body);
    dialog.appendChild(input);
    dialog.appendChild(btnRow);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    confirmBtn.onclick = () => {
      if (input.value.trim().toUpperCase() !== "RESET") return;
      this.game.doMasterReset();
      document.body.removeChild(overlay);
      this.render();
    };
    cancelBtn.onclick = () => document.body.removeChild(overlay);
  }

  private getNextPrestigeMult(): string {
    const nextLevel = this.game.prestigeLevel + 1;
    return (1 + nextLevel * 0.5).toFixed(1);
  }

  private renderPrestige(container: HTMLDivElement): void {
    const threshold = this.game.getPrestigeThreshold();
    const totalEarned = this.game.scoreSystem.getTotalEarned();
    const canDo = this.game.canPrestige();
    const maxed = this.game.prestigeLevel >= 10;

    const card = document.createElement("div");
    card.style.cssText = "padding:12px;border:1px solid #3a2a5a;border-left:4px solid #a855f7;border-radius:6px;";

    const levelRow = document.createElement("div");
    levelRow.style.cssText = "display:flex;justify-content:space-between;margin-bottom:4px;";
    const ll = document.createElement("span");
    ll.textContent = "Prestige Level";
    ll.style.color = "#c084fc";
    const lv = document.createElement("span");
    lv.style.cssText = "font-weight:bold;color:#c084fc;";
    lv.textContent = `${this.game.prestigeLevel} / 10`;
    levelRow.appendChild(ll);
    levelRow.appendChild(lv);
    card.appendChild(levelRow);

    const multRow = document.createElement("div");
    multRow.style.cssText = "display:flex;justify-content:space-between;margin-bottom:4px;";
    const ml = document.createElement("span");
    ml.textContent = "Multiplier";
    ml.style.color = "#a0a0c0";
    const mv = document.createElement("span");
    mv.style.cssText = "font-weight:bold;color:#ffd700;";
    mv.textContent = `x${this.game.prestigeMultiplier.toFixed(1)}`;
    multRow.appendChild(ml);
    multRow.appendChild(mv);
    card.appendChild(multRow);

    if (!maxed) {
      const pct = Math.min(1, totalEarned / threshold);
      const progBar = document.createElement("div");
      progBar.style.cssText = "margin:6px 0;height:6px;background:#121224;border-radius:3px;overflow:hidden;";
      const progFill = document.createElement("div");
      progFill.style.cssText = `height:100%;width:${pct * 100}%;background:${canDo ? "#a855f7" : "#4a3a5a"};border-radius:3px;transition:width 0.3s;`;
      progBar.appendChild(progFill);
      card.appendChild(progBar);

      const thRow = document.createElement("div");
      thRow.style.cssText = "display:flex;justify-content:space-between;font-size:10px;color:#6d6d8d;margin-bottom:8px;";
      const thL = document.createElement("span");
      thL.textContent = "Progress";
      const thV = document.createElement("span");
      thV.textContent = `${this.formatNum(totalEarned)} / ${this.formatNum(threshold)}`;
      thRow.appendChild(thL);
      thRow.appendChild(thV);
      card.appendChild(thRow);

      const btn = document.createElement("button");
      btn.style.cssText = `width:100%;padding:8px;border:none;font-weight:bold;font-size:12px;border-radius:4px;cursor:${canDo ? "pointer" : "default"};background:${canDo ? "#7c3aed" : "#2a2a4a"};color:${canDo ? "#fff" : "#666"};`;
      btn.textContent = canDo ? "PRESTIGE NOW" : "Not ready";
      btn.disabled = !canDo;
      if (canDo) {
        btn.addEventListener("click", () => this.showPrestigeDialog());
      }
      card.appendChild(btn);
    } else {
      const maxedMsg = document.createElement("div");
      maxedMsg.style.cssText = "margin-top:6px;font-size:12px;color:#c084fc;text-align:center;font-weight:bold;";
      maxedMsg.textContent = "MAX PRESTIGE REACHED";
      card.appendChild(maxedMsg);
    }

    container.appendChild(card);

    // Master reset
    const resetBtn = document.createElement("button");
    resetBtn.style.cssText = "width:100%;margin-top:10px;padding:8px;border:none;font-weight:bold;font-size:12px;border-radius:4px;cursor:pointer;background:#3a1a1a;color:#f87171;";
    resetBtn.textContent = "MASTER RESET";
    resetBtn.addEventListener("click", () => this.showMasterResetDialog());
    container.appendChild(resetBtn);
  }

  private renderUpgradeCard(container: HTMLDivElement, key: string, name: string, desc: string, isLocked?: boolean): void {
    const card = document.createElement("div");
    card.style.cssText = `margin-bottom:8px;padding:8px;border:1px solid ${isLocked ? "#4a2a2a" : "#2a2a4a"};border-left:3px solid ${isLocked ? "#ef4444" : "#4a4a7a"};border-radius:4px;`;

    const nameRow = document.createElement("div");
    nameRow.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;";

    const n = document.createElement("span");
    n.style.cssText = "font-weight:bold;font-size:12px;color:#fff;";
    n.textContent = name;
    nameRow.appendChild(n);

    if (isLocked) {
      const badge = document.createElement("span");
      badge.style.cssText = "font-size:9px;color:#ef4444;font-weight:bold;padding:1px 5px;border:1px solid #ef4444;border-radius:3px;";
      badge.textContent = "LOCKED";
      nameRow.appendChild(badge);
    }

    card.appendChild(nameRow);

    const d = document.createElement("div");
    d.style.cssText = "font-size:10px;color:#8f8fad;margin-bottom:6px;";
    d.textContent = desc;
    card.appendChild(d);

    const canAfford = this.game.upgradeSystem.canAfford(key);
    const isMaxed = this.game.upgradeSystem.isMaxLevel(key);
    const cost = this.game.upgradeSystem.getUpgradeCost(key);

    const btn = document.createElement("button");
    btn.style.cssText = `width:100%;padding:6px;border:none;border-radius:3px;font-family:inherit;font-size:11px;font-weight:600;cursor:${isMaxed ? "default" : "pointer"};background:${isMaxed ? "#2a2a4a" : canAfford ? "#1a4a2a" : "#3a1a1a"};color:${isMaxed ? "#6d6d8d" : "#fff"};`;
    btn.textContent = isMaxed ? "MAX" : isLocked ? `Unlock (${this.formatNum(cost)})` : `Buy (${this.formatNum(cost)})`;
    btn.disabled = isMaxed || !canAfford;

    if (!isMaxed) {
      btn.addEventListener("click", () => {
        if (this.game.upgradeSystem.purchase(key)) {
          this.game.soundManager.playUpgrade();
          this.applyUpgrade(key);
          this.render();
        }
      });
    }

    card.appendChild(btn);
    container.appendChild(card);
  }

  private applyUpgrade(key: string): void {
    switch (key) {
      case "dropperSpeed": {
        const reduction = this.game.upgradeSystem.getSpeedReduction();
        this.game.dropper.setSpeed(1000 - reduction);
        break;
      }
      case "slotMultiplier": {
        for (const slot of this.game.slots) slot.resetMultiplierBonus();
        const bonus = this.game.upgradeSystem.getMultiplierBonus();
        for (const slot of this.game.slots) slot.addMultiplierBonus(bonus);
        break;
      }
    }
    for (const meta of effectUpgradeMeta) {
      if (meta.key === key) {
        const level = this.game.upgradeSystem.upgrades[key] || 0;
        this.game.effectManager.setLevel(meta.effectId, level);
        break;
      }
    }
  }

  private helpTooltipRef: HTMLDivElement | null = null;
  private playTimeEl: HTMLDivElement | null = null;
  private lastPlayTime: number = 0;

  private createHelpButton(): void {
    const btn = document.createElement("div");
    btn.textContent = "?";
    btn.style.cssText = `
      position: fixed; top: 8px; right: 256px;
      width: 28px; height: 28px; border-radius: 4px;
      background: #2a2a4a; color: #a0a0c0;
      font-family: 'Segoe UI', sans-serif; font-size: 14px; font-weight: bold;
      line-height: 1; padding: 0;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; z-index: 200; user-select: none;
      border: 1px solid #3a3a5a; transition: background 0.15s, color 0.15s;
    `;
    btn.addEventListener("mouseenter", () => { btn.style.background = "#3a3a5a"; btn.style.color = "#fff"; this.showHelp(); });
    btn.addEventListener("mouseleave", () => { btn.style.background = "#2a2a4a"; btn.style.color = "#a0a0c0"; this.hideHelp(); });
    document.body.appendChild(btn);
  }

  private showHelp(): void {
    if (this.helpTooltipRef) return;
    const tt = document.createElement("div");
    tt.style.cssText = `
      position: fixed; top: 40px; right: 256px;
      width: 220px; padding: 10px 12px;
      background: #1a1a32; border: 1px solid #2a2a4a; border-radius: 6px;
      font-family: 'Segoe UI', sans-serif; font-size: 11px; color: #c0c0d8;
      z-index: 200; line-height: 1.5;
    `;

    const shardLevel = this.game.upgradeSystem.upgrades.shardChance ?? 0;
    let shardPct = SHARDS.baseDropChance + shardLevel * 0.01;
    if (this.game.hasRelic("shardMagnet")) shardPct *= 2;
    const shardDisplay = (shardPct * 100).toFixed(1);

    tt.innerHTML = `
      <b style="color:#e0e0ff;">Combo</b><br>
      Each peg hit adds +0.1x to the combo multiplier (displayed above the board).
      Combo resets when any blob lands in a slot.
      Caps at 5x (or 7.5x with <b>Combo Extender</b> relic).<br><br>
      <b style="color:#e0e0ff;">Shard Drops</b><br>
      Peg hits have a ${shardDisplay}% chance to drop a shard (◆).
      Enchanted pegs add an extra ${(SHARDS.enchantedDropChance * 100).toFixed(0)}% chance.
      Shards are used to purchase relics.<br><br>
      <b style="color:#e0e0ff;">Peg Effects</b><br>
      Effects auto-activate on cooldown cycles. Each enchants a random set of pegs.
      Blobs passing through enchanted pegs trigger bonus earnings for that effect.<br><br>
      <b style="color:#e0e0ff;">Relics</b><br>
      Purchased with shards (◆). Equip relics to unlock passive bonuses.
      Base 2 equip slots; upgrade <b>Relic Slots</b> to equip more.<br><br>
      <b style="color:#e0e0ff;">Prestige</b><br>
      Resets currency, upgrades, and effect levels for a permanent +0.5x multiplier.
      Threshold: ${this.formatNum(this.game.getPrestigeThreshold())} earned.
    `;
    this.helpTooltipRef = tt;
    document.body.appendChild(tt);
  }

  private hideHelp(): void {
    if (this.helpTooltipRef) {
      this.helpTooltipRef.parentNode?.removeChild(this.helpTooltipRef);
      this.helpTooltipRef = null;
    }
  }

  private createPlayTimeClock(): HTMLDivElement {
    const el = document.createElement("div");
    el.style.cssText = `
      position: fixed; bottom: 14px; right: 256px;
      font-size: 11px; color: #6d6d8d;
      z-index: 200; user-select: none; text-align: right;
    `;
    el.textContent = "0:00:00";
    document.body.appendChild(el);
    return el;
  }

  private formatPlayTime(ms: number): string {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  update(): void {
    if (this.panel) this.render();
    const pt = this.game.playTime;
    if (this.playTimeEl && pt !== this.lastPlayTime) {
      this.playTimeEl.textContent = this.formatPlayTime(pt);
      this.lastPlayTime = pt;
    }
  }

  private statusText(state: EffectState): string {
    if (state.level === 0) return "LOCKED";
    switch (state.status) {
      case "ready": return "READY";
      case "active": return `Active (${Math.ceil(state.timeRemaining / 1000)}s)`;
      case "cooldown": return `Cooldown (${Math.ceil(state.timeRemaining / 1000)}s)`;
    }
    return "";
  }

  private getEffectDuration(cfg: PegEffectConfig, level: number): number {
    return cfg.baseDuration + cfg.durationUpgrade * level;
  }

  private getEffectCooldown(cfg: PegEffectConfig, level: number): number {
    return Math.max(5000, cfg.baseCooldown - cfg.cooldownUpgrade * level);
  }

  private formatNum(val: number): string {
    if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)}B`;
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
    return Math.floor(val).toString();
  }
}
