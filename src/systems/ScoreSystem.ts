export class ScoreSystem {
  private currency: number = 0;
  private totalEarned: number = 0;
  private earnings: { timestamp: number; amount: number }[] = [];
  private currencyDisplay!: HTMLDivElement;
  private totalDisplay!: HTMLDivElement;
  private rateDisplay!: HTMLDivElement;

  init(): void {
    this.currencyDisplay = document.createElement("div");
    this.totalDisplay = document.createElement("div");
    this.rateDisplay = document.createElement("div");
    this.setupUI();
  }

  private setupUI(): void {
    const container = document.createElement("div");
    container.id = "score-display";
    container.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      font-family: 'Courier New', monospace;
      color: #ffffff;
      z-index: 100;
    `;

    this.currencyDisplay.style.cssText = `
      font-size: 24px;
      text-shadow: 2px 2px 0px #000000;
    `;
    this.currencyDisplay.textContent = "0";

    this.totalDisplay.style.cssText = `
      font-size: 12px;
      color: #888888;
    `;
    this.totalDisplay.textContent = "Total: 0";

    this.rateDisplay.style.cssText = `
      font-size: 11px;
      color: #666666;
      margin-top: 2px;
    `;
    this.rateDisplay.textContent = "";

    container.appendChild(this.currencyDisplay);
    container.appendChild(this.totalDisplay);
    container.appendChild(this.rateDisplay);
    document.body.appendChild(container);
  }

  addCurrency(amount: number): void {
    this.currency += amount;
    this.totalEarned += amount;
    this.earnings.push({ timestamp: Date.now(), amount });
    this.pruneOld();
    this.updateDisplay();
  }

  private pruneOld(): void {
    const cutoff = Date.now() - 3600000;
    while (this.earnings.length > 0 && this.earnings[0].timestamp < cutoff) {
      this.earnings.shift();
    }
  }

  private sumSince(ms: number): number {
    const cutoff = Date.now() - ms;
    let sum = 0;
    for (const e of this.earnings) {
      if (e.timestamp >= cutoff) sum += e.amount;
    }
    return sum;
  }

  getEarningsPerSecond(): number {
    return this.sumSince(60000) / 60;
  }

  getEarningsPerMinute(): number {
    return this.sumSince(60000);
  }

  getEarningsPerHour(): number {
    return this.sumSince(60000) * 60;
  }

  spendCurrency(amount: number): boolean {
    if (this.currency >= amount) {
      this.currency -= amount;
      this.updateDisplay();
      return true;
    }
    return false;
  }

  getCurrency(): number {
    return this.currency;
  }

  getTotalEarned(): number {
    return this.totalEarned;
  }

  setCurrency(amount: number): void {
    this.currency = amount;
    this.updateDisplay();
  }

  setTotalEarned(amount: number): void {
    this.totalEarned = amount;
    this.updateDisplay();
  }

  private updateDisplay(): void {
    this.currencyDisplay.textContent = this.formatNumber(this.currency);
    this.totalDisplay.textContent = `Total: ${this.formatNumber(this.totalEarned)}`;

    const perSec = this.getEarningsPerSecond();
    const perMin = this.getEarningsPerMinute();
    const perHour = this.getEarningsPerHour();
    this.rateDisplay.textContent = `${this.formatRate(perSec)}/s  ${this.formatRate(perMin)}/m  ${this.formatRate(perHour)}/h`;
  }

  private formatRate(val: number): string {
    if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)}B`;
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
    return val.toFixed(1);
  }

  private formatNumber(num: number): string {
    if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
    return Math.floor(num).toString();
  }
}
