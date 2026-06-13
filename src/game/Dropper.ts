import { Container, Graphics } from "pixi.js";
import { BLOB_TYPES, BOARD_WIDTH, DROPPER, SHAPE_UNLOCK_CHAIN, SHAPE_UNLOCK_TO_TYPE } from "../utils/constants";
import { Blob } from "./Blob";
import type { Game } from "./Game";

export class Dropper {
  private game: Game;
  private container: Container = new Container();
  private dropperGraphic: Graphics = new Graphics();
  private blobs: Blob[] = [];
  private bodyToBlob: Map<Matter.Body, Blob> = new Map();
  private dropTimer: number = 0;
  private currentInterval: number = DROPPER.baseInterval;
  private dropperX: number = 0;
  private time: number = 0;
  private sweepRange: number = 200;
  private dropperAngle: number = 0;

  constructor(game: Game) {
    this.game = game;
  }

  init(): void {
    this.game.app.stage.addChild(this.container);
    this.dropperGraphic.x = this.dropperX;
    this.dropperGraphic.y = this.game.board.getOffsetY() + DROPPER.spawnY;
    this.drawDropper();
    this.container.addChild(this.dropperGraphic);
  }

  update(delta: number): void {
    this.time += delta;
    const offsetX = this.game.board.getOffsetX();
    const boardY = this.game.board.getOffsetY();
    const centerX = offsetX + BOARD_WIDTH / 2;
    this.dropperX = centerX + Math.sin(this.time * 0.003) * this.sweepRange;

    this.dropperAngle += Math.PI * 2 * (delta / 2000);
    this.dropperGraphic.rotation = this.dropperAngle;
    this.dropperGraphic.x = this.dropperX;
    this.dropperGraphic.y = boardY + DROPPER.spawnY;

    this.dropTimer += delta;
    if (this.dropTimer >= this.currentInterval) {
      this.dropTimer = 0;
      this.spawnBlob();
    }

    for (let i = this.blobs.length - 1; i >= 0; i--) {
      const blob = this.blobs[i];
      const removed = blob.update();

      if (removed) {
        this.blobs.splice(i, 1);
      } else if (!blob.isDying() && blob.body.position.y > window.innerHeight + 50) {
        this.game.physics.removeBody(blob.body);
        this.bodyToBlob.delete(blob.body);
        blob.destroy();
        this.blobs.splice(i, 1);
      }
    }
  }

  private drawDropper(): void {
    this.dropperGraphic.clear();
    this.dropperGraphic.beginFill(0xaaaaaa);
    this.dropperGraphic.moveTo(0, -15);
    this.dropperGraphic.lineTo(-8, 0);
    this.dropperGraphic.lineTo(8, 0);
    this.dropperGraphic.closePath();
    this.dropperGraphic.endFill();
  }

  private spawnBlob(): void {
    let typeKey = this.randomType();

    const type = BLOB_TYPES[typeKey];
    if (!type) return;

    const x = this.dropperX;
    const y = this.game.board.getOffsetY() + DROPPER.spawnY;

    const body = this.game.physics.createBlob(x, y, type.radius, type.restitution);
    (body as any).blobValue = type.value;
    (body as any).blobType = typeKey;
    const blob = new Blob(body, type, this.container);
    this.blobs.push(blob);
    this.bodyToBlob.set(body, blob);
  }

  removeBlob(body: Matter.Body): void {
    const blob = this.bodyToBlob.get(body);
    if (blob) {
      blob.startDie();
      this.game.physics.removeBody(body);
      this.bodyToBlob.delete(body);
    }
  }

  private randomType(): string {
    const types = ["triangle"];
    const upgrades = this.game.upgradeSystem.upgrades;
    for (const key of SHAPE_UNLOCK_CHAIN) {
      if (upgrades[key] > 0) {
        types.push(SHAPE_UNLOCK_TO_TYPE[key]);
      }
    }
    return types[Math.floor(Math.random() * types.length)];
  }

  hasBlob(body: Matter.Body): boolean {
    return this.bodyToBlob.has(body);
  }

  spawnBlobAt(x: number, y: number, baseValue: number, typeKey: string): void {
    const type = BLOB_TYPES[typeKey];
    if (!type) return;

    const body = this.game.physics.createBlob(x, y, type.radius, type.restitution);
    (body as any).blobValue = baseValue;
    (body as any).blobType = typeKey;
    const blob = new Blob(body, type, this.container);
    this.blobs.push(blob);
    this.bodyToBlob.set(body, blob);
  }

  setSpeed(interval: number): void {
    this.currentInterval = Math.max(DROPPER.minInterval, interval);
  }

  getBlobCount(): number {
    return this.blobs.length;
  }

  killAllBlobs(): void {
    for (const blob of this.blobs) {
      this.game.physics.removeBody(blob.body);
      this.bodyToBlob.delete(blob.body);
      blob.destroy();
    }
    this.blobs.length = 0;
  }
}
