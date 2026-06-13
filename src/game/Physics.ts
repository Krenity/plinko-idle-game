import Matter from "matter-js";
import { BOARD, BOARD_WIDTH, PHYSICS } from "../utils/constants";

export type SlotCollisionCallback = (blob: Matter.Body, slot: Matter.Body) => void;
export type WallCollisionCallback = (blob: Matter.Body, side: "left" | "right") => void;
export type PegCollisionCallback = (blob: Matter.Body, peg: Matter.Body) => void;

export class Physics {
  engine: Matter.Engine;
  world: Matter.World;
  bodies: Matter.Body[] = [];
  private onSlotCollision?: SlotCollisionCallback;
  private onWallCollision?: WallCollisionCallback;
  private onPegCollision?: PegCollisionCallback;

  constructor() {
    this.engine = Matter.Engine.create({
      gravity: { x: 0, y: PHYSICS.gravity },
    });
    this.world = this.engine.world;
  }

  init(): void {
    this.createScreenWalls();
    this.setupCollisionEvents();
  }

  private createScreenWalls(): void {
    const opts = { isStatic: true, restitution: 0.3, friction: 0.1, render: { visible: false } };

    const floor = Matter.Bodies.rectangle(
      window.innerWidth / 2,
      window.innerHeight + 50,
      window.innerWidth * 2,
      100,
      opts,
    );
    Matter.Composite.add(this.world, floor);
  }

  createBoardWalls(offsetX: number, topY: number, bottomY: number): void {
    const thickness = BOARD.wallThickness;
    const wallH = bottomY - topY;
    const midY = topY + wallH / 2;
    const leftCx = offsetX + thickness / 2;
    const rightCx = offsetX + BOARD_WIDTH - thickness / 2;
    const opts = { isStatic: true, restitution: 0.3, friction: 0.1, render: { visible: false } };

    const leftWall = Matter.Bodies.rectangle(leftCx, midY, thickness, wallH, opts);
    (leftWall as any).isBoardWall = true;
    (leftWall as any).wallSide = "left";

    const rightWall = Matter.Bodies.rectangle(rightCx, midY, thickness, wallH, opts);
    (rightWall as any).isBoardWall = true;
    (rightWall as any).wallSide = "right";

    Matter.Composite.add(this.world, [leftWall, rightWall]);
  }

  private setupCollisionEvents(): void {
    Matter.Events.on(this.engine, "collisionStart", (event) => {
      for (const pair of event.pairs) {
        this.handlePair(pair.bodyA, pair.bodyB);
        this.handlePair(pair.bodyB, pair.bodyA);
      }
    });
  }

  private handlePair(bodyA: Matter.Body, bodyB: Matter.Body): void {
    const aIsBlob = (bodyA as any).blobValue !== undefined;
    if (!aIsBlob) return;

    if ((bodyB as any).isSlot === true && this.onSlotCollision) {
      this.onSlotCollision(bodyA, bodyB);
    }
    if ((bodyB as any).isBoardWall === true && this.onWallCollision) {
      this.onWallCollision(bodyA, (bodyB as any).wallSide);
    }
    if ((bodyB as any).isPeg === true && this.onPegCollision) {
      this.onPegCollision(bodyA, bodyB);
    }
  }

  onBlobSlotCollision(callback: SlotCollisionCallback): void { this.onSlotCollision = callback; }
  onBlobWallCollision(callback: WallCollisionCallback): void { this.onWallCollision = callback; }
  onBlobPegCollision(callback: PegCollisionCallback): void { this.onPegCollision = callback; }

  addBody(body: Matter.Body): void {
    this.bodies.push(body);
    Matter.Composite.add(this.world, body);
  }

  removeBody(body: Matter.Body): void {
    const index = this.bodies.indexOf(body);
    if (index > -1) {
      this.bodies.splice(index, 1);
      Matter.Composite.remove(this.world, body);
    }
  }

  update(delta: number): void {
    Matter.Engine.update(this.engine, delta);
  }

  createPeg(x: number, y: number, radius: number): Matter.Body {
    const peg = Matter.Bodies.circle(x, y, radius, {
      isStatic: true,
      restitution: PHYSICS.pegRestitution,
      friction: 0.05,
      render: { visible: true },
    });
    (peg as any).isPeg = true;
    Matter.Composite.add(this.world, peg);
    return peg;
  }

  createBlob(x: number, y: number, radius: number, restitution: number): Matter.Body {
    const blob = Matter.Bodies.circle(x, y, radius, {
      restitution,
      friction: 0.05,
      frictionAir: PHYSICS.blobFrictionAir,
      density: PHYSICS.blobDensity,
      render: { visible: true },
    });
    this.addBody(blob);
    return blob;
  }

  createSlotSensor(x: number, y: number, width: number, height: number): Matter.Body {
    const slot = Matter.Bodies.rectangle(x, y, width, height, {
      isStatic: true,
      isSensor: true,
      render: { visible: false },
    });
    (slot as any).isSlot = true;
    Matter.Composite.add(this.world, slot);
    return slot;
  }
}
