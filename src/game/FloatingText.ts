import { Container, Text } from "pixi.js";

interface FloatText {
  text: Text;
  vy: number;
  life: number;
  maxLife: number;
  startX: number;
  startY: number;
  shakePhase: number;
}

export class FloatingTextManager {
  private container: Container;
  private texts: FloatText[] = [];

  constructor(stage: Container) {
    this.container = new Container();
    stage.addChild(this.container);
  }

  emit(x: number, y: number, amount: number, color: number): void {
    const t = new Text(`+${amount}`, {
      fontFamily: "Courier New",
      fontSize: Math.min(16 + Math.floor(amount / 5) * 2, 28),
      fill: color,
      fontWeight: "bold",
      stroke: 0x000000,
      strokeThickness: 3,
    });
    t.anchor.set(0.5);
    t.x = x;
    t.y = y;
    this.container.addChild(t);

    this.texts.push({
      text: t,
      vy: -2.5 - Math.random() * 0.5,
      life: 1200,
      maxLife: 1200,
      startX: x,
      startY: y,
      shakePhase: Math.random() * Math.PI * 2,
    });
  }

  update(delta: number): void {
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const ft = this.texts[i];
      ft.life -= delta;

      if (ft.life <= 0) {
        this.container.removeChild(ft.text);
        ft.text.destroy();
        this.texts.splice(i, 1);
        continue;
      }

      const t = ft.life / ft.maxLife;

      ft.vy *= 0.97;
      ft.text.y += ft.vy;

      ft.shakePhase += 0.3;
      ft.text.x = ft.startX + Math.sin(ft.shakePhase) * 2.5;
      ft.text.y += Math.cos(ft.shakePhase * 1.7) * 1.2;

      const scale = 0.2 + 0.8 * t;
      ft.text.scale.set(scale);
      ft.text.alpha = Math.min(1, t * 1.5);
    }
  }
}
