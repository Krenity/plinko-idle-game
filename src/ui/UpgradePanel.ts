import type { Container } from "pixi.js";
import type { Game } from "../game/Game";

export class UpgradePanel {
  private game: Game;
  private panel!: HTMLDivElement;
  private isOpen: boolean = false;
  private refreshInterval: number | null = null;
  private upgrades = [
    { key: "dropperSpeed", name: "Dropper Speed", desc: "Faster blob spawning" },
    { key: "unlockSquare", name: "Unlock Square", desc: "Enable square blobs (2x value)" },
    { key: "unlockCircle", name: "Unlock Circle", desc: "Enable circle blobs (3x value)" },
    { key: "slotMultiplier", name: "Slot Multiplier", desc: "Increase all slot values" },
  ];

  constructor(game: Game) {
    this.game = game;
  }

  init(_stage: Container): void {
    this.panel = document.createElement("div");
    this.createToggleButton();
    this.createPanel();
  }

  private createToggleButton(): void {
    const button = document.createElement("button");
    button.textContent = "Upgrades";
    button.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      padding: 8px 16px;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      background: #2a2a4a;
      color: #ffffff;
      border: 2px solid #5a5a7a;
      cursor: pointer;
      z-index: 101;
    `;
    button.addEventListener("click", () => this.togglePanel());
    document.body.appendChild(button);
  }

  private createPanel(): void {
    this.panel.id = "upgrade-panel";
    this.panel.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 300px;
      background: #2a2a4a;
      border: 2px solid #5a5a7a;
      font-family: 'Courier New', monospace;
      color: #ffffff;
      display: none;
      z-index: 200;
    `;

    const header = document.createElement("div");
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background: #1a1a2e;
      border-bottom: 2px solid #5a5a7a;
    `;
    header.innerHTML = `
      <span>Upgrades</span>
      <button id="close-upgrades" style="
        background: none;
        border: none;
        color: #ffffff;
        cursor: pointer;
        font-size: 16px;
      ">[x]</button>
    `;

    const content = document.createElement("div");
    content.style.cssText = `
      padding: 12px;
    `;

    for (const upgrade of this.upgrades) {
      const item = document.createElement("div");
      item.style.cssText = `
        margin-bottom: 12px;
        padding: 8px;
        background: #1a1a2e;
        border: 1px solid #3a3a5a;
      `;

      const name = document.createElement("div");
      name.style.cssText = `
        font-weight: bold;
        margin-bottom: 4px;
      `;
      name.textContent = upgrade.name;

      const desc = document.createElement("div");
      desc.style.cssText = `
        font-size: 11px;
        color: #888888;
        margin-bottom: 8px;
      `;
      desc.textContent = upgrade.desc;

      const buyButton = document.createElement("button");
      buyButton.id = `buy-${upgrade.key}`;
      buyButton.style.cssText = `
        width: 100%;
        padding: 6px;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        background: #3a5a3a;
        color: #ffffff;
        border: 1px solid #5a7a5a;
        cursor: pointer;
      `;

      buyButton.addEventListener("click", () => {
        if (this.game.upgradeSystem.purchase(upgrade.key)) {
          this.applyUpgradeEffect(upgrade.key);
          this.updatePanel();
        }
      });

      item.appendChild(name);
      item.appendChild(desc);
      item.appendChild(buyButton);
      content.appendChild(item);
    }

    this.panel.appendChild(header);
    this.panel.appendChild(content);
    document.body.appendChild(this.panel);

    document.getElementById("close-upgrades")?.addEventListener("click", () => {
      this.togglePanel();
    });

    this.updatePanel();
  }

  private applyUpgradeEffect(key: string): void {
    switch (key) {
      case "dropperSpeed": {
        const reduction = this.game.upgradeSystem.getSpeedReduction();
        this.game.dropper.setSpeed(1000 - reduction);
        break;
      }
      case "slotMultiplier": {
        const bonus = this.game.upgradeSystem.getMultiplierBonus();
        for (const slot of this.game.slots) {
          slot.addMultiplierBonus(bonus);
        }
        break;
      }
    }
  }

  togglePanel(): void {
    this.isOpen = !this.isOpen;
    this.panel.style.display = this.isOpen ? "block" : "none";

    if (this.isOpen) {
      this.updatePanel();
      this.refreshInterval = window.setInterval(() => {
        if (this.isOpen) {
          this.updatePanel();
        }
      }, 500);
    } else if (this.refreshInterval !== null) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  updatePanel(): void {
    for (const upgrade of this.upgrades) {
      const button = document.getElementById(`buy-${upgrade.key}`) as HTMLButtonElement;
      if (!button) continue;

      const canAfford = this.game.upgradeSystem.canAfford(upgrade.key);
      const isMaxed = this.game.upgradeSystem.isMaxLevel(upgrade.key);
      const cost = this.game.upgradeSystem.getUpgradeCost(upgrade.key);

      if (isMaxed) {
        button.textContent = "MAX";
        button.style.background = "#4a4a4a";
        button.disabled = true;
      } else {
        button.textContent = `Buy (${cost})`;
        button.style.background = canAfford ? "#3a5a3a" : "#5a3a3a";
        button.disabled = !canAfford;
      }
    }
  }
}
