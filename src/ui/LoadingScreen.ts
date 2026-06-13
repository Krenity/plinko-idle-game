export class LoadingScreen {
  private overlay: HTMLDivElement;
  private pctEl: HTMLDivElement;

  constructor() {
    this.overlay = document.createElement("div");
    this.overlay.id = "loading-screen";

    const spinner = document.createElement("div");
    spinner.className = "ls-spinner";

    this.pctEl = document.createElement("div");
    this.pctEl.className = "ls-pct";
    this.pctEl.textContent = "0%";

    const label = document.createElement("div");
    label.className = "ls-label";
    label.textContent = "Loading";

    const center = document.createElement("div");
    center.className = "ls-center";
    center.appendChild(spinner);
    center.appendChild(this.pctEl);
    center.appendChild(label);
    this.overlay.appendChild(center);

    this.injectStyles();
    document.body.appendChild(this.overlay);
  }

  setProgress(val: number): void {
    const pct = Math.min(100, Math.round(val * 100));
    this.pctEl.textContent = `${pct}%`;
  }

  async hide(): Promise<void> {
    this.overlay.classList.add("ls-fade");
    await new Promise(resolve => setTimeout(resolve, 500));
    this.overlay.remove();
  }

  private injectStyles(): void {
    const style = document.createElement("style");
    style.textContent = `
      #loading-screen {
        position: fixed; inset: 0;
        z-index: 9999;
        background: rgba(10, 10, 24, 0.85);
        backdrop-filter: blur(12px);
        display: flex; align-items: center; justify-content: center;
        transition: opacity 0.5s ease;
      }
      #loading-screen.ls-fade {
        opacity: 0;
      }
      .ls-center {
        text-align: center;
      }
      .ls-spinner {
        width: 48px; height: 48px;
        margin: 0 auto 16px;
        border: 3px solid rgba(255,255,255,0.1);
        border-top-color: #00f0ff;
        border-radius: 50%;
        animation: ls-spin 0.8s linear infinite;
      }
      @keyframes ls-spin {
        to { transform: rotate(360deg); }
      }
      .ls-pct {
        font-size: 32px; font-weight: 700;
        color: #fff;
        margin-bottom: 8px;
      }
      .ls-label {
        font-size: 13px; color: #6d6d8d;
        text-transform: uppercase; letter-spacing: 2px;
      }
    `;
    document.head.appendChild(style);
  }
}
