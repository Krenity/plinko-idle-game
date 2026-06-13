import { Container, Graphics } from "pixi.js";

type ParticleType = "ring" | "fountain" | "spark" | "vortex" | "shard";

interface Particle {
  graphics: Graphics;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  type: ParticleType;
}

export class ParticleSystem {
  private container: Container;
  private particles: Particle[] = [];

  // Portal vortex continuous emitters
  private portalVortexPositions: { x: number; y: number; color: number }[] = [];
  private vortexEmitTimer: number = 0;
  private readonly vortexEmitInterval = 50;

  constructor(stage: Container) {
    this.container = new Container();
    stage.addChild(this.container);
  }

  // ── Portal vortex control ──

  setPortalVortices(positions: { x: number; y: number; color: number }[]): void {
    this.portalVortexPositions = positions;
  }

  clearPortalVortices(): void {
    this.portalVortexPositions = [];
  }

  // ── Slot collection burst ──

  emit(x: number, y: number, colors: number[], _count: number = 14): void {
    const ring = new Graphics();
    ring.lineStyle(2.5, 0xffd93d, 0.9);
    ring.drawCircle(0, 0, 1);
    ring.x = x;
    ring.y = y;
    this.container.addChild(ring);
    this.particles.push({
      graphics: ring, vx: 0, vy: 0,
      life: 350, maxLife: 350,
      type: "ring",
    });

    for (let i = 0; i < _count; i++) {
      const g = new Graphics();
      const color = colors[Math.floor(Math.random() * colors.length)];
      g.beginFill(color);
      const size = 2 + Math.random() * 3;
      g.drawCircle(0, 0, size);
      g.endFill();
      g.x = x + (Math.random() - 0.5) * 10;
      g.y = y + (Math.random() - 0.5) * 6;
      this.container.addChild(g);

      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.8;
      const speed = 1.5 + Math.random() * 3;
      this.particles.push({
        graphics: g,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 500 + Math.random() * 400,
        maxLife: 500 + Math.random() * 400,
        type: "fountain",
      });
    }

    for (let i = 0; i < 3; i++) {
      const g = new Graphics();
      g.beginFill(0xffffff);
      g.drawCircle(0, 0, 1.5);
      g.endFill();
      g.x = x;
      g.y = y;
      this.container.addChild(g);

      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 3;
      this.particles.push({
        graphics: g,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 200 + Math.random() * 150,
        maxLife: 200 + Math.random() * 150,
        type: "spark",
      });
    }
  }

  // ── Shard collection sparkle ──

  emitShard(x: number, y: number): void {
    for (let i = 0; i < 5; i++) {
      const g = new Graphics();
      g.beginFill(0xffd93d, 0.9);
      g.drawCircle(0, 0, 1.5 + Math.random() * 2);
      g.endFill();
      g.x = x;
      g.y = y;
      this.container.addChild(g);

      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 2;
      this.particles.push({
        graphics: g,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 300 + Math.random() * 200,
        maxLife: 300 + Math.random() * 200,
        type: "shard",
      });
    }
  }

  // ── Portal vortex particle emission ──

  private emitVortexParticle(x: number, y: number, color: number): void {
    const g = new Graphics();
    g.beginFill(color, 0.7);
    g.drawCircle(0, 0, 1.5 + Math.random() * 1.5);
    g.endFill();

    const angle = Math.random() * Math.PI * 2;
    const radius = 3 + Math.random() * 8;
    g.x = x + Math.cos(angle) * radius;
    g.y = y + Math.sin(angle) * radius;
    this.container.addChild(g);

    this.particles.push({
      graphics: g,
      vx: Math.cos(angle + Math.PI / 2) * 0.5,
      vy: Math.sin(angle + Math.PI / 2) * 0.5,
      life: 800 + Math.random() * 400,
      maxLife: 800 + Math.random() * 400,
      type: "vortex",
    });
  }

  // ── Main update loop ──

  update(delta: number): void {
    // Emit portal vortex particles continuously
    if (this.portalVortexPositions.length > 0) {
      this.vortexEmitTimer += delta;
      while (this.vortexEmitTimer >= this.vortexEmitInterval) {
        this.vortexEmitTimer -= this.vortexEmitInterval;
        for (const pos of this.portalVortexPositions) {
          this.emitVortexParticle(pos.x, pos.y, pos.color);
        }
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;

      if (p.life <= 0) {
        this.container.removeChild(p.graphics);
        p.graphics.destroy();
        this.particles.splice(i, 1);
        continue;
      }

      const t = p.life / p.maxLife;

      switch (p.type) {
        case "ring": {
          const progress = 1 - t;
          const radius = 2 + progress * 40;
          p.graphics.clear();
          p.graphics.lineStyle(Math.max(0.5, 2.5 * (1 - progress * 0.5)), 0xffd93d, t * 0.6);
          p.graphics.drawCircle(0, 0, radius);
          break;
        }
        case "fountain": {
          p.graphics.x += p.vx;
          p.graphics.y += p.vy;
          p.vy += 0.1;
          p.graphics.alpha = Math.min(1, t * 2);
          p.graphics.scale.set(t * 0.5 + 0.5);
          break;
        }
        case "spark": {
          p.graphics.x += p.vx;
          p.graphics.y += p.vy;
          p.graphics.alpha = t * t;
          break;
        }
        case "vortex": {
          p.graphics.x += p.vx;
          p.graphics.y += p.vy;
          p.graphics.alpha = t * 0.7;
          p.graphics.scale.set(t);
          break;
        }
        case "shard": {
          p.graphics.x += p.vx;
          p.graphics.y += p.vy;
          p.graphics.alpha = t;
          p.graphics.scale.set(Math.max(0, 1 - (1 - t)));
          break;
        }
      }
    }
  }
}
