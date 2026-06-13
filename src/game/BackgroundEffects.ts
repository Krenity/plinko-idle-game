import { Container, Graphics, Sprite, Texture, type IRenderer } from "pixi.js";
import { COLORS } from "../utils/constants";

interface DriftParticle {
  sprite: Sprite;
  speed: number;
  rotSpeed: number;
  layer: "far" | "near";
}

export class BackgroundEffects {
  private container: Container;
  renderer: IRenderer | null = null;
  private bgRect: Graphics | null = null;
  private particles: DriftParticle[] = [];
  private poolSize: number = 40;

  private currentColor: number = COLORS.background;
  private targetColor: number = COLORS.background;
  private lerpSpeed: number = 0.02;

  constructor(stage: Container) {
    this.container = new Container();
    this.container.sortableChildren = true;
    this.container.zIndex = 0;
    stage.addChildAt(this.container, 0);
  }

  init(renderer: IRenderer): void {
    this.renderer = renderer;
    this.bgRect = new Graphics();
    this.bgRect.beginFill(this.currentColor);
    this.bgRect.drawRect(0, 0, window.innerWidth, window.innerHeight);
    this.bgRect.endFill();
    this.container.addChild(this.bgRect);
    this.createParticlePool();
  }

  private createParticlePool(): void {
    const shapeTextures = this.generateShapeTextures();
    for (let i = 0; i < this.poolSize; i++) {
      const layer: "far" | "near" = i < this.poolSize / 2 ? "far" : "near";
      const tex = shapeTextures[i % shapeTextures.length];
      const sprite = new Sprite(tex);
      sprite.anchor.set(0.5);

      if (layer === "far") {
        sprite.scale.set(0.3 + Math.random() * 0.3);
        sprite.alpha = 0.01 + Math.random() * 0.02;
        this.particles.push({ sprite, speed: 8 + Math.random() * 7, rotSpeed: (Math.random() - 0.5) * 0.02, layer });
      } else {
        sprite.scale.set(0.8 + Math.random() * 0.6);
        sprite.alpha = 0.03 + Math.random() * 0.04;
        this.particles.push({ sprite, speed: 20 + Math.random() * 15, rotSpeed: (Math.random() - 0.5) * 0.04, layer });
      }

      this.container.addChild(sprite);
    }
  }

  private generateShapeTextures(): Texture[] {
    const textures: Texture[] = [];
    const shapes: ((g: Graphics, size: number) => void)[] = [
      (g, s) => {
        g.beginFill(0xffffff);
        g.moveTo(s / 2, 2);
        g.lineTo(s - 2, s - 2);
        g.lineTo(2, s - 2);
        g.closePath();
        g.endFill();
      },
      (g, s) => {
        g.beginFill(0xffffff);
        g.drawRect(2, 2, s - 4, s - 4);
        g.endFill();
      },
      (g, s) => {
        g.beginFill(0xffffff);
        g.drawCircle(s / 2, s / 2, s / 2 - 2);
        g.endFill();
      },
    ];

    for (const draw of shapes) {
      const size = 12;
      const g = new Graphics();
      draw(g, size);
      if (this.renderer) {
        const tex = this.renderer.generateTexture(g);
        textures.push(tex);
      }
      g.destroy();
    }
    return textures;
  }

  private scatterParticle(p: DriftParticle): void {
    const padding = 50;
    p.sprite.x = Math.random() * (window.innerWidth + padding * 2) - padding;
    p.sprite.y = Math.random() * (window.innerHeight + padding * 2) - padding;
  }

  handleResize(): void {
    for (const p of this.particles) {
      this.scatterParticle(p);
    }
  }

  setTargetColor(hex: number): void {
    const intensity = 0.35;
    const bg = COLORS.background;
    const br = (bg >> 16) & 0xff;
    const bg_ = (bg >> 8) & 0xff;
    const bb = bg & 0xff;
    const er = (hex >> 16) & 0xff;
    const eg = (hex >> 8) & 0xff;
    const eb = hex & 0xff;
    const r = Math.round(br + (er - br) * intensity);
    const g = Math.round(bg_ + (eg - bg_) * intensity);
    const b = Math.round(bb + (eb - bb) * intensity);
    this.targetColor = (r << 16) | (g << 8) | b;
  }

  resetColor(): void {
    this.targetColor = COLORS.background;
  }

  update(delta: number): void {
    const dt = delta / 1000;
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Particle drift
    const padding = 50;
    for (const p of this.particles) {
      p.sprite.y -= p.speed * dt;
      p.sprite.rotation += p.rotSpeed * dt;
      if (p.sprite.y < -padding) {
        p.sprite.y = h + padding;
        p.sprite.x = Math.random() * (w + padding * 2) - padding;
      }
    }

    // Color interpolation
    if (this.currentColor !== this.targetColor && this.bgRect) {
      const curR = (this.currentColor >> 16) & 0xff;
      const curG = (this.currentColor >> 8) & 0xff;
      const curB = this.currentColor & 0xff;
      const tgtR = (this.targetColor >> 16) & 0xff;
      const tgtG = (this.targetColor >> 8) & 0xff;
      const tgtB = this.targetColor & 0xff;
      const f = Math.min(1, this.lerpSpeed * (delta / 16));
      const newR = Math.round(curR + (tgtR - curR) * f);
      const newG = Math.round(curG + (tgtG - curG) * f);
      const newB = Math.round(curB + (tgtB - curB) * f);
      if (Math.abs(newR - tgtR) < 2 && Math.abs(newG - tgtG) < 2 && Math.abs(newB - tgtB) < 2) {
        this.currentColor = this.targetColor;
      } else {
        this.currentColor = (newR << 16) | (newG << 8) | newB;
      }
    }

    // Always redraw background at window size
    if (this.bgRect) {
      this.bgRect.clear();
      this.bgRect.beginFill(this.currentColor);
      this.bgRect.drawRect(0, 0, w, h);
      this.bgRect.endFill();
    }
  }
}
