import { Game } from "./game/Game";
import { LoadingScreen } from "./ui/LoadingScreen";

async function main() {
  const loading = new LoadingScreen();
  const game = new Game();

  const startTime = performance.now();
  const minDisplayMs = 1000;

  await game.init();

  const tick = setInterval(() => {
    loading.setProgress(game.soundManager.getLoadProgress());
  }, 80);

  while (!game.soundManager.isReady()) {
    await new Promise(r => setTimeout(r, 50));
  }

  clearInterval(tick);
  loading.setProgress(1);

  const elapsed = performance.now() - startTime;
  if (elapsed < minDisplayMs) {
    await new Promise(r => setTimeout(r, minDisplayMs - elapsed));
  }

  await loading.hide();

  if (window.innerWidth < 1215) {
    await showSizeWarning();
  }

  game.start();
}

function showSizeWarning(): Promise<void> {
  return new Promise(resolve => {
    const overlay = document.createElement("div");
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 9999;
      background: rgba(10, 10, 24, 0.85);
      backdrop-filter: blur(12px);
      display: flex; align-items: center; justify-content: center;
    `;

    const box = document.createElement("div");
    box.style.cssText = `
      background: #1a1a2e; border: 1px solid #ffcc00;
      border-radius: 8px; padding: 24px 32px;
      max-width: 400px; width: 90%;
      font-family: 'Segoe UI', sans-serif; text-align: center;
      color: #fff;
    `;

    const warn = document.createElement("div");
    warn.style.cssText = "font-size: 36px; margin-bottom: 12px;";
    warn.textContent = "\u26A0\uFE0F";

    const title = document.createElement("div");
    title.style.cssText = "font-size: 16px; font-weight: bold; color: #ffcc00; margin-bottom: 12px;";
    title.textContent = "Window too small";

    const msg = document.createElement("div");
    msg.style.cssText = "font-size: 12px; color: #aaa; line-height: 1.6; margin-bottom: 20px;";
    msg.textContent = "The game requires a minimum width of 1215px. Your current window may not display everything properly.";

    const btn = document.createElement("button");
    btn.textContent = "Continue anyway";
    btn.style.cssText = `
      padding: 10px 24px; background: #ffcc00; color: #1a1a2e;
      border: none; border-radius: 4px; font-weight: bold;
      cursor: pointer; font-size: 14px;
    `;
    btn.onclick = () => {
      overlay.remove();
      resolve();
    };

    box.appendChild(warn);
    box.appendChild(title);
    box.appendChild(msg);
    box.appendChild(btn);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  });
}

main();
