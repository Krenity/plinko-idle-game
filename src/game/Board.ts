import { Container, Graphics, Text } from "pixi.js";
import type Matter from "matter-js";
import { BOARD, BOARD_WIDTH, COLORS, PEG_SPAN, PEG_EFFECTS, TOTAL_PEGS } from "../utils/constants";
import type { Game } from "./Game";

interface WallState {
  graphics: Graphics;
  cx: number;
  y: number;
  w: number;
  h: number;
  pulsing: boolean;
  pulseTimer: number;
  pulseDuration: number;
}

export class Board {
  private container: Container = new Container();
  private pegGraphics: Graphics = new Graphics();
  private pegBodies: Matter.Body[] = [];
  private game?: Game;
  private offsetX: number = 0;
  private leftWall!: WallState;
  private rightWall!: WallState;
  pegPositions: { x: number; y: number }[] = [];

  // Spring recoil
  private pegScales: number[] = new Array(TOTAL_PEGS).fill(1.0);
  private pegScaleDirty: boolean = false;

  // Floating combo counter
  private comboText: Text | null = null;
  private comboShakeTimer: number = 0;
  private comboFadeTimer: number = 0;
  private comboFadeDuration: number = 300;

  // Bumper / portal overlays
  private bumperPegIndices: Set<number> = new Set();
  private portalPegIndices: Set<number> = new Set();
  private bumperPulseTimer: number = 0;
  private portalPulseTimers: Map<number, number> = new Map();

  init(stage: Container, game?: Game): void {
    this.game = game;
    this.offsetX = (window.innerWidth - BOARD_WIDTH) / 2;
    const boardHeight = this.getWallBottom();
    this.container.y = Math.max(0, (window.innerHeight - boardHeight) / 2);
    stage.addChild(this.container);

    // Enable sortable children so pegGraphics renders above comboText
    this.container.sortableChildren = true;

    // Combo text behind pegs
    this.comboText = new Text("1.0x", {
      fontFamily: "'Courier New', monospace",
      fontSize: 64,
      fontWeight: "bold",
      fill: 0xffffff,
      align: "center",
    });
    this.comboText.anchor.set(0.5);
    this.comboText.zIndex = 0;
    this.comboText.alpha = 0;
    this.comboText.x = this.offsetX + BOARD_WIDTH / 2;
    this.comboText.y = BOARD.pegStartY + ((BOARD.pegRows - 1) * BOARD.pegSpacing) / 2;
    this.container.addChild(this.comboText);

    this.pegGraphics.zIndex = 1;
    this.container.addChild(this.pegGraphics);
    this.createWalls();
    this.drawPegs();
  }

  private createWalls(): void {
    const wallH = this.getWallHeight();
    const leftCx = this.offsetX + BOARD.wallThickness / 2;
    const rightCx = this.offsetX + BOARD_WIDTH - BOARD.wallThickness / 2;

    const leftG = new Graphics();
    leftG.beginFill(COLORS.peg);
    leftG.drawRect(-BOARD.wallThickness / 2, 0, BOARD.wallThickness, wallH);
    leftG.endFill();
    leftG.x = leftCx;
    leftG.y = this.getWallTop();
    leftG.alpha = 0;
    this.container.addChild(leftG);

    const rightG = new Graphics();
    rightG.beginFill(COLORS.peg);
    rightG.drawRect(-BOARD.wallThickness / 2, 0, BOARD.wallThickness, wallH);
    rightG.endFill();
    rightG.x = rightCx;
    rightG.y = this.getWallTop();
    rightG.alpha = 0;
    this.container.addChild(rightG);

    const shared = { y: this.getWallTop(), w: BOARD.wallThickness, h: wallH, pulsing: false, pulseTimer: 0, pulseDuration: 250 };
    this.leftWall = { ...shared, graphics: leftG, cx: leftCx };
    this.rightWall = { ...shared, graphics: rightG, cx: rightCx };
  }

  private getWallTop(): number { return 0; }

  private getWallBottom(): number {
    return BOARD.pegStartY + (BOARD.pegRows - 1) * BOARD.pegSpacing + BOARD.pegRadius * 2 + 60;
  }
  private getWallHeight(): number { return this.getWallBottom() - this.getWallTop(); }

  pulseWall(side: "left" | "right"): void {
    const wall = side === "left" ? this.leftWall : this.rightWall;
    wall.pulsing = true;
    wall.pulseTimer = 0;
  }

  // ── Spring recoil ──

  onPegHit(pegIndex: number): void {
    if (pegIndex >= 0 && pegIndex < this.pegScales.length) {
      this.pegScales[pegIndex] = 1.4;
      this.pegScaleDirty = true;
    }
  }

  // ── Combo counter ──

  updateCombo(multiplier: number, active: boolean): void {
    if (!this.comboText) return;
    if (active && multiplier > 1.05) {
      this.comboText.text = `${multiplier.toFixed(1)}x`;
      this.comboText.alpha = 0.12 + ((multiplier - 1) / 4) * 0.18;
      // Color lerp white → gold
      const t = Math.min((multiplier - 1) / 4, 1);
      const r = 255;
      const g = Math.floor(255 - (255 - 217) * t);
      const b = Math.floor(255 - (255 - 61) * t);
      this.comboText.style.fill = (r << 16) | (g << 8) | b;
      this.comboShakeTimer = 200;
    } else {
      this.comboFadeTimer = this.comboFadeDuration;
    }
  }

  // ── Bumper / portal peg markers ──

  setBumperPegs(indices: Set<number>): void {
    this.bumperPegIndices = indices;
  }

  setPortalPegs(indices: Set<number>): void {
    this.portalPegIndices = indices;
  }

  triggerBumperPulse(): void {
    this.bumperPulseTimer = 300;
  }

  triggerPortalPulse(pegIndex: number): void {
    this.portalPulseTimers.set(pegIndex, 400);
  }

  // ── Peg drawing ──

  redrawPegs(enchantedMap: Map<number, number[]>): void {
    this.pegGraphics.clear();
    for (let i = 0; i < this.pegPositions.length; i++) {
      const pos = this.pegPositions[i];
      const effectColors = enchantedMap.get(i);
      const color = effectColors && effectColors.length > 0 ? effectColors[0] : COLORS.peg;
      const r = BOARD.pegRadius * (this.pegScales[i] ?? 1.0);
      this.pegGraphics.beginFill(color);
      this.pegGraphics.drawCircle(pos.x, pos.y - this.container.y, r);
      this.pegGraphics.endFill();
    }

    // Bumper glow overlay
    if (this.bumperPulseTimer > 0) {
      const alpha = 0.3 * (this.bumperPulseTimer / 300);
      for (const idx of this.bumperPegIndices) {
        const pos = this.pegPositions[idx];
        if (pos) {
          this.pegGraphics.beginFill(COLORS.orange, alpha);
          this.pegGraphics.drawCircle(pos.x, pos.y - this.container.y, BOARD.pegRadius * 2.5);
          this.pegGraphics.endFill();
        }
      }
    }

    // Portal swirl overlay
    for (const [pegIdx, timer] of this.portalPulseTimers) {
      if (timer > 0) {
        const pos = this.pegPositions[pegIdx];
        if (pos) {
          const alpha = 0.4 * (timer / 400);
          this.pegGraphics.lineStyle(2, COLORS.violet, alpha);
          this.pegGraphics.drawCircle(pos.x, pos.y - this.container.y, BOARD.pegRadius * 2.5);
          this.pegGraphics.lineStyle(0);
        }
      }
    }
  }

  flashPeg(pegIndex: number, color: number): void {
    const pos = this.pegPositions[pegIndex];
    if (!pos) return;

    const flash = new Graphics();
    flash.beginFill(color, 0.8);
    flash.drawCircle(pos.x, pos.y - this.container.y, BOARD.pegRadius * 1.5);
    flash.endFill();
    this.container.addChild(flash);

    const startTime = performance.now();
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / 200, 1);
      flash.alpha = 1 - t;
      flash.scale.set(1 + t * 0.5);
      if (t < 1) requestAnimationFrame(animate);
      else { this.container.removeChild(flash); flash.destroy(); }
    };
    requestAnimationFrame(animate);
  }

  private drawPegs(): void {
    this.pegGraphics.clear();
    this.pegPositions = [];

    const startX = this.offsetX + BOARD_WIDTH / 2 - PEG_SPAN / 2;
    const startY = BOARD.pegStartY;

    for (let row = 0; row < BOARD.pegRows; row++) {
      const cols = row % 2 === 0 ? BOARD.pegCols : BOARD.pegCols - 1;
      const offX = row % 2 === 0 ? 0 : BOARD.pegSpacing / 2;

      for (let col = 0; col < cols; col++) {
        const x = startX + col * BOARD.pegSpacing + offX;
        const y = startY + row * BOARD.pegSpacing;
        const absX = x;
        const absY = y + this.container.y;
        this.pegPositions.push({ x: absX, y: absY });

        this.pegGraphics.beginFill(COLORS.peg);
        this.pegGraphics.drawCircle(x, y, BOARD.pegRadius);
        this.pegGraphics.endFill();

        if (this.game) {
          const body = this.game.physics.createPeg(absX, absY, BOARD.pegRadius);
          this.pegBodies.push(body);
        }
      }
    }
  }

  update(delta: number): void {
    // ── Spring recoil ──
    if (this.pegScaleDirty) {
      let stillDirty = false;
      for (let i = 0; i < this.pegScales.length; i++) {
        if (this.pegScales[i] !== 1.0) {
          this.pegScales[i] += (1.0 - this.pegScales[i]) * 0.15;
          if (Math.abs(this.pegScales[i] - 1.0) < 0.001) this.pegScales[i] = 1.0;
          else stillDirty = true;
        }
      }
      this.pegScaleDirty = stillDirty;
    }

    // Redraw pegs when scales changed or overlays active
    const hasOverlays = this.bumperPulseTimer > 0 || this.portalPulseTimers.size > 0;
    if ((this.pegScaleDirty || hasOverlays) && this.game?.effectManager) {
      const raw = this.game.effectManager.getAllEnchantedPegIndices();
      const colorMap = new Map<number, number[]>();
      for (const [pegIdx, effectIds] of raw) {
        const colors = effectIds.map((id) => PEG_EFFECTS.find((e) => e.id === id)?.color ?? COLORS.pegHighlight);
        colorMap.set(pegIdx, colors);
      }
      this.redrawPegs(colorMap);
    }

    // ── Combo text shake ──
    if (this.comboShakeTimer > 0) {
      this.comboShakeTimer -= delta;
      const shake = Math.sin(this.comboShakeTimer * 0.03) * 3 * (this.comboShakeTimer / 200);
      if (this.comboText) {
        this.comboText.x = this.offsetX + BOARD_WIDTH / 2 + shake;
      }
    } else if (this.comboText) {
      this.comboText.x = this.offsetX + BOARD_WIDTH / 2;
    }

    // ── Combo text fade ──
    if (this.comboFadeTimer > 0) {
      this.comboFadeTimer -= delta;
      if (this.comboText && this.comboText.alpha > 0) {
        this.comboText.alpha = Math.max(0, this.comboText.alpha - (delta / this.comboFadeDuration) * 0.15);
      }
    }

    // ── Bumper / portal overlay timers ──
    if (this.bumperPulseTimer > 0) this.bumperPulseTimer -= delta;
    for (const [idx, timer] of this.portalPulseTimers) {
      if (timer > 0) this.portalPulseTimers.set(idx, timer - delta);
    }

    // ── Wall pulse ──
    for (const wall of [this.leftWall, this.rightWall]) {
      if (!wall.pulsing) continue;
      wall.pulseTimer += delta;
      const t = Math.min(wall.pulseTimer / wall.pulseDuration, 1);

      wall.graphics.clear();
      wall.graphics.alpha = 1;
      const brightness = 1 - t * t;
      const r = Math.floor(58 + (255 - 58) * brightness);
      const g = Math.floor(58 + (255 - 58) * brightness);
      const b = Math.floor(90 + (255 - 90) * brightness);
      wall.graphics.beginFill((r << 16) | (g << 8) | b);
      const ew = wall.w + 4 * (1 - t);
      const eh = wall.h + 8 * (1 - t);
      wall.graphics.drawRect(-ew / 2, -(eh - wall.h) / 2, ew, eh);
      wall.graphics.endFill();

      if (t >= 1) {
        wall.pulsing = false;
        wall.graphics.clear();
        wall.graphics.alpha = 0;
      }
    }
  }

  getPegBodies(): Matter.Body[] { return this.pegBodies; }
  getPegIndex(body: Matter.Body): number { return this.pegBodies.indexOf(body); }
  getOffsetX(): number { return this.offsetX; }
  getOffsetY(): number { return this.container.y; }
}
