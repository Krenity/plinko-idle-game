import { type Container, Graphics } from "pixi.js";
import type { BlobType } from "../utils/constants";

export class Blob {
  body: Matter.Body;
  graphics: Graphics;
  type: BlobType;
  private container: Container;
  private dying: boolean = false;
  private dieProgress: number = 0;
  private dieSpeed: number = 0.05;

  // Ghost trail
  private positionHistory: { x: number; y: number }[] = [];
  private readonly maxTrailLength = 5;
  private trailGraphics: Graphics = new Graphics();

  constructor(body: Matter.Body, type: BlobType, container: Container) {
    this.body = body;
    this.type = type;
    this.container = container;
    this.graphics = new Graphics();

    // Trail behind main shape
    this.container.addChildAt(this.trailGraphics, 0);
    this.draw();
    this.container.addChild(this.graphics);
  }

  private draw(): void {
    this.graphics.clear();

    switch (this.type.name) {
      case "triangle": this.drawTriangle(); break;
      case "square": this.drawSquare(); break;
      case "circle": this.drawCircleShape(); break;
      case "diamond": this.drawDiamond(); break;
      case "pentagon": this.drawPolygon(5); break;
      case "hexagon": this.drawPolygon(6); break;
      case "star": this.drawStar(); break;
      default: this.drawCircleShape();
    }
  }

  // ── Trail shape drawing (positioned, with alpha + scale) ──

  private drawTrailShape(x: number, y: number, alpha: number, scale: number): void {
    const s = this.type.radius * scale;
    this.trailGraphics.beginFill(this.type.color, alpha);

    switch (this.type.name) {
      case "triangle": {
        this.trailGraphics.moveTo(x, y - s);
        this.trailGraphics.lineTo(x + s * 0.866, y + s * 0.5);
        this.trailGraphics.lineTo(x - s * 0.866, y + s * 0.5);
        this.trailGraphics.closePath();
        break;
      }
      case "square": {
        const hs = s * 0.8;
        this.trailGraphics.drawRect(x - hs, y - hs, hs * 2, hs * 2);
        break;
      }
      case "circle": {
        this.trailGraphics.drawCircle(x, y, s);
        break;
      }
      case "diamond": {
        this.trailGraphics.moveTo(x, y - s);
        this.trailGraphics.lineTo(x + s * 0.7, y);
        this.trailGraphics.lineTo(x, y + s);
        this.trailGraphics.lineTo(x - s * 0.7, y);
        this.trailGraphics.closePath();
        break;
      }
      case "pentagon":
      case "hexagon": {
        const sides = this.type.name === "pentagon" ? 5 : 6;
        for (let i = 0; i < sides; i++) {
          const angle = -Math.PI / 2 + (2 * Math.PI * i) / sides;
          const px = x + Math.cos(angle) * s;
          const py = y + Math.sin(angle) * s;
          if (i === 0) this.trailGraphics.moveTo(px, py);
          else this.trailGraphics.lineTo(px, py);
        }
        this.trailGraphics.closePath();
        break;
      }
      case "star": {
        const outer = s;
        const inner = outer * 0.4;
        for (let i = 0; i < 10; i++) {
          const angle = -Math.PI / 2 + (Math.PI * i) / 5;
          const r = i % 2 === 0 ? outer : inner;
          const px = x + Math.cos(angle) * r;
          const py = y + Math.sin(angle) * r;
          if (i === 0) this.trailGraphics.moveTo(px, py);
          else this.trailGraphics.lineTo(px, py);
        }
        this.trailGraphics.closePath();
        break;
      }
      default: {
        this.trailGraphics.drawCircle(x, y, s);
      }
    }

    this.trailGraphics.endFill();
  }

  private shouldShowTrail(): boolean {
    const value = (this.body as any).blobValue ?? this.type.value;
    const pendingMult = (this.body as any).pendingMultiplier ?? 1;
    return value * pendingMult > 10;
  }

  // ── Shape drawing methods ──

  private drawTriangle(): void {
    const s = this.type.radius;
    this.graphics.beginFill(this.type.color);
    this.graphics.moveTo(0, -s);
    this.graphics.lineTo(s * 0.866, s * 0.5);
    this.graphics.lineTo(-s * 0.866, s * 0.5);
    this.graphics.closePath();
    this.graphics.endFill();
  }

  private drawSquare(): void {
    const s = this.type.radius * 0.8;
    this.graphics.beginFill(this.type.color);
    this.graphics.drawRect(-s, -s, s * 2, s * 2);
    this.graphics.endFill();
  }

  private drawCircleShape(): void {
    this.graphics.beginFill(this.type.color);
    this.graphics.drawCircle(0, 0, this.type.radius);
    this.graphics.endFill();
  }

  private drawDiamond(): void {
    const s = this.type.radius;
    this.graphics.beginFill(this.type.color);
    this.graphics.moveTo(0, -s);
    this.graphics.lineTo(s * 0.7, 0);
    this.graphics.lineTo(0, s);
    this.graphics.lineTo(-s * 0.7, 0);
    this.graphics.closePath();
    this.graphics.endFill();
  }

  private drawPolygon(sides: number): void {
    const s = this.type.radius;
    this.graphics.beginFill(this.type.color);
    for (let i = 0; i < sides; i++) {
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / sides;
      const x = Math.cos(angle) * s;
      const y = Math.sin(angle) * s;
      if (i === 0) this.graphics.moveTo(x, y);
      else this.graphics.lineTo(x, y);
    }
    this.graphics.closePath();
    this.graphics.endFill();
  }

  private drawStar(): void {
    const outer = this.type.radius;
    const inner = outer * 0.4;
    this.graphics.beginFill(this.type.color);
    for (let i = 0; i < 10; i++) {
      const angle = -Math.PI / 2 + (Math.PI * i) / 5;
      const r = i % 2 === 0 ? outer : inner;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) this.graphics.moveTo(x, y);
      else this.graphics.lineTo(x, y);
    }
    this.graphics.closePath();
    this.graphics.endFill();
  }

  startDie(): void {
    this.dying = true;
    this.dieProgress = 0;
  }

  isDying(): boolean {
    return this.dying;
  }

  isDead(): boolean {
    return this.dying && this.dieProgress >= 1;
  }

  update(): boolean {
    if (this.dying) {
      this.dieProgress += this.dieSpeed;
      const scale = 1 - this.dieProgress;
      this.graphics.scale.set(Math.max(0, scale));
      this.graphics.alpha = Math.max(0, 1 - this.dieProgress);
      this.trailGraphics.clear();
      if (this.isDead()) {
        this.destroy();
        return true;
      }
      return false;
    }

    // Ghost trail
    const showTrail = this.shouldShowTrail();
    if (showTrail) {
      this.positionHistory.push({ x: this.body.position.x, y: this.body.position.y });
      if (this.positionHistory.length > this.maxTrailLength) {
        this.positionHistory.shift();
      }
    }

    this.trailGraphics.clear();
    if (showTrail && this.positionHistory.length > 1) {
      for (let i = 0; i < this.positionHistory.length - 1; i++) {
        const pos = this.positionHistory[i];
        const t = i / this.positionHistory.length;
        const alpha = 0.03 + t * 0.22;
        const sc = 0.5 + t * 0.4;
        this.drawTrailShape(pos.x, pos.y, alpha, sc);
      }
    }

    this.graphics.x = this.body.position.x;
    this.graphics.y = this.body.position.y;
    this.graphics.rotation = this.body.angle;
    return false;
  }

  destroy(): void {
    this.trailGraphics.clear();
    this.container.removeChild(this.trailGraphics);
    this.trailGraphics.destroy();
    this.container.removeChild(this.graphics);
    this.graphics.destroy();
  }
}
