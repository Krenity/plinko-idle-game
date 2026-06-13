import type { Game } from "../game/Game";

interface SlotLogEntry {
  shape: string;
  multiplier: number;
  color: number;
}

export class LeftDashboard {
  private game: Game;
  private container: HTMLDivElement;
  private historyEl: HTMLDivElement;
  private refreshInterval: number | null = null;

  private slotHistory: SlotLogEntry[] = [];
  private static readonly MAX_SLOT_LOG = 15;

  private balanceVal: HTMLDivElement;
  private rateVal: HTMLDivElement;
  private rateMin: HTMLDivElement;
  private rateHour: HTMLDivElement;
  private blobsVal: HTMLDivElement;
  private totalEarnedVal: HTMLDivElement;
  private fpsVal: HTMLDivElement;
  private shardsVal: HTMLDivElement;

  constructor(game: Game) {
    this.game = game;

    this.container = document.createElement("div");
    this.container.id = "left-dashboard";
    document.body.appendChild(this.container);
    this.injectStyles();

    // ── Balance ──
    const balanceLabel = document.createElement("div");
    balanceLabel.className = "ld-section-title";
    balanceLabel.textContent = "Balance";
    this.container.appendChild(balanceLabel);

    this.balanceVal = document.createElement("div");
    this.balanceVal.className = "ld-big";
    this.balanceVal.textContent = "0";
    this.container.appendChild(this.balanceVal);

    // ── Rates row ──
    const rateRow = document.createElement("div");
    rateRow.className = "ld-rate-row";
    this.rateVal = this.createInlineStat(rateRow, "0/s");
    this.rateMin = this.createInlineStat(rateRow, "0/m");
    this.rateHour = this.createInlineStat(rateRow, "0/h");
    this.container.appendChild(rateRow);

    // ── Total Earned (full width) ──
    const earnedLabel = document.createElement("div");
    earnedLabel.className = "ld-section-title";
    earnedLabel.textContent = "Total Earned";
    this.container.appendChild(earnedLabel);

    this.totalEarnedVal = document.createElement("div");
    this.totalEarnedVal.className = "ld-total-earned";
    this.totalEarnedVal.textContent = "0";
    this.container.appendChild(this.totalEarnedVal);

    // ── Active Blobs (full width) ──
    const blobsLabel = document.createElement("div");
    blobsLabel.className = "ld-section-title";
    blobsLabel.textContent = "Active Blobs";
    this.container.appendChild(blobsLabel);

    this.blobsVal = document.createElement("div");
    this.blobsVal.className = "ld-total-earned";
    this.blobsVal.textContent = "0";
    this.container.appendChild(this.blobsVal);

    // ── FPS (full width) ──
    const fpsLabel = document.createElement("div");
    fpsLabel.className = "ld-section-title";
    fpsLabel.textContent = "FPS";
    this.container.appendChild(fpsLabel);

    this.fpsVal = document.createElement("div");
    this.fpsVal.className = "ld-total-earned";
    this.fpsVal.textContent = "0";
    this.container.appendChild(this.fpsVal);

    // ── Total Shards ──
    const shardsLabel = document.createElement("div");
    shardsLabel.className = "ld-section-title";
    shardsLabel.textContent = "Shards";
    this.container.appendChild(shardsLabel);

    this.shardsVal = document.createElement("div");
    this.shardsVal.className = "ld-total-earned";
    this.shardsVal.textContent = "0";
    this.container.appendChild(this.shardsVal);

    // ── Recent Drops (fills remaining space) ──
    const dropsTitle = document.createElement("div");
    dropsTitle.className = "ld-section-title";
    dropsTitle.style.marginTop = "8px";
    dropsTitle.textContent = "Recent Drops";
    this.container.appendChild(dropsTitle);

    this.historyEl = document.createElement("div");
    this.historyEl.className = "ld-log";
    this.container.appendChild(this.historyEl);

    // ── Mute button (bottom of panel) ──
    this.createMuteButton();
  }

  init(): void {
    this.startRefresh();
  }

  private injectStyles(): void {
    const style = document.createElement("style");
    style.textContent = `
      #left-dashboard {
        position: fixed; top: 0; left: 0;
        width: 200px; height: 100vh;
        background: #16162e;
        border-right: 1px solid #2a2a4a;
        font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
        color: #fff; z-index: 150;
        display: flex; flex-direction: column;
        padding: 10px; box-sizing: border-box;
        overflow: hidden;
      }
      #left-dashboard::-webkit-scrollbar { width: 4px; }
      #left-dashboard::-webkit-scrollbar-track { background: transparent; }
      #left-dashboard::-webkit-scrollbar-thumb { background: #2a2a4a; border-radius: 2px; }

      .ld-section-title {
        font-size: 10px; color: #6d6d8d;
        text-transform: uppercase; letter-spacing: 1px;
        font-weight: 600;
        margin-bottom: 4px;
      }

      .ld-big {
        font-size: 32px; font-weight: 700; color: #fff;
        margin-bottom: 6px;
      }

      .ld-total-earned {
        font-size: 16px; font-weight: 600; color: #c0c0e0;
        font-family: 'Courier New', monospace;
        margin-bottom: 6px;
      }

      .ld-rate-row {
        display: flex; gap: 6px; margin-bottom: 6px;
      }
      .ld-inline-stat {
        flex: 1; text-align: center;
        border-radius: 4px; padding: 4px 2px;
      }
      .ld-inline-val {
        font-size: 12px; font-weight: 600; color: #fff;
      }

      .ld-log {
        display: flex; flex-direction: column; gap: 3px;
        flex: 1; overflow-y: auto; min-height: 0;
      }

      .slot-entry {
        display: flex; align-items: center; gap: 8px;
        padding: 3px 8px; border-radius: 6px;
        transition: background 0.2s, transform 0.15s;
      }
      .slot-entry.flash {
        background: rgba(255, 215, 61, 0.15);
        transform: scaleY(1.15);
      }
      .slot-entry.entering {
        opacity: 0; transform: translateY(-8px);
      }
      .slot-badge {
        display: inline-block; padding: 1px 6px; border-radius: 8px;
        font-size: 10px; font-weight: bold; color: #fff;
        min-width: 32px; text-align: center;
        transition: background 0.2s, color 0.2s, transform 0.15s;
      }
      .slot-badge.flash {
        background: #ffd93d !important;
        color: #000;
        transform: scale(1.2);
      }
      .slot-shape {
        font-size: 10px; color: #8f8fad;
      }
    `;
    document.head.appendChild(style);
  }

  private createInlineStat(parent: HTMLDivElement, value: string): HTMLDivElement {
    const box = document.createElement("div");
    box.className = "ld-inline-stat";
    const val = document.createElement("div");
    val.className = "ld-inline-val";
    val.textContent = value;
    box.appendChild(val);
    parent.appendChild(box);
    return val;
  }

  addSlotEntry(shape: string, multiplier: number, color: number): void {
    const newEntry: SlotLogEntry = { shape, multiplier, color };

    if (this.slotHistory.length > 0) {
      const top = this.slotHistory[0];
      if (top.shape === shape && top.multiplier === multiplier) {
        this.flashTopEntry();
        return;
      }
    }

    this.slotHistory.unshift(newEntry);
    if (this.slotHistory.length > LeftDashboard.MAX_SLOT_LOG) {
      this.slotHistory.pop();
    }
    this.renderSlotHistory();
  }

  private flashTopEntry(): void {
    const first = this.historyEl.firstChild as HTMLElement | null;
    if (!first) return;

    first.classList.remove("flash");
    void (first as HTMLElement).offsetWidth;
    first.classList.add("flash");
    const badge = first.querySelector(".slot-badge");
    if (badge) {
      badge.classList.remove("flash");
      void (badge as HTMLElement).offsetWidth;
      badge.classList.add("flash");
    }

    setTimeout(() => {
      first.classList.remove("flash");
      if (badge) badge.classList.remove("flash");
    }, 300);
  }

  resetStats(): void {
    this.slotHistory = [];
    this.renderSlotHistory();
  }

  private startRefresh(): void {
    this.refreshInterval = window.setInterval(() => this.update(), 1000);
  }

  private update(): void {
    const ss = this.game.scoreSystem;

    this.balanceVal.textContent = this.formatNum(ss.getCurrency());
    this.rateVal.textContent = `${this.formatNum(ss.getEarningsPerSecond())}/s`;
    this.rateMin.textContent = `${this.formatNum(ss.getEarningsPerMinute())}/m`;
    this.rateHour.textContent = `${this.formatNum(ss.getEarningsPerHour())}/h`;
    this.totalEarnedVal.textContent = this.formatNum(ss.getTotalEarned());
    this.blobsVal.textContent = this.game.dropper.getBlobCount().toString();
    this.fpsVal.textContent = Math.round(this.game.app.ticker.FPS).toString();
    if (this.game.shardSystem) {
      this.shardsVal.textContent = this.formatNum(this.game.shardSystem.getShards());
    }
  }

  private renderSlotHistory(): void {
    this.historyEl.innerHTML = "";
    for (const entry of this.slotHistory) {
      const row = document.createElement("div");
      row.className = "slot-entry";
      const badgeColor = `#${entry.color.toString(16).padStart(6, "0")}`;
      row.innerHTML = `<span class="slot-badge" style="background:${badgeColor}">${entry.multiplier.toFixed(1)}x</span><span class="slot-shape">${entry.shape.charAt(0).toUpperCase() + entry.shape.slice(1)}</span>`;
      this.historyEl.appendChild(row);
    }
    const first = this.historyEl.firstChild as HTMLElement | null;
    if (first) {
      first.classList.add("entering");
      requestAnimationFrame(() => first.classList.remove("entering"));
    }
  }

  private formatNum(val: number): string {
    if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)}B`;
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
    return Math.floor(val).toString();
  }

  private createMuteButton(): void {
    const btn = document.createElement("button");
    btn.id = "mute-btn";
    btn.textContent = "\u266A";
    btn.title = "Toggle sound";
    btn.addEventListener("click", () => {
      this.game.soundManager.toggleMuted();
      btn.textContent = this.game.soundManager.isMuted() ? "\u2715" : "\u266A";
      btn.classList.toggle("muted", this.game.soundManager.isMuted());
    });

    // Inject CSS for the button
    const style = document.createElement("style");
    style.textContent = `
      #mute-btn {
        position: fixed; top: 40px; right: 256px;
        width: 28px; height: 28px;
        border: 1px solid #3a3a5a; border-radius: 4px;
        background: #2a2a4a; color: #a0a0c0;
        font-size: 13px; cursor: pointer; z-index: 200;
        display: flex; align-items: center; justify-content: center;
        transition: background 0.15s, color 0.15s;
        line-height: 1;
      }
      #mute-btn:hover { background: #3a3a5a; color: #fff; }
      #mute-btn.muted { color: #ef4444; border-color: #5a2a2a; }
      #mute-btn.muted:hover { background: #2a1a1a; }
    `;
    document.head.appendChild(style);
    document.body.appendChild(btn);
  }
}
