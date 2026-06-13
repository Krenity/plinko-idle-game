import { Container, Graphics, Text } from "pixi.js";
import { SLOT_COLORS, SLOT_MULTIPLIERS } from "../utils/constants";
import type Matter from "matter-js";

export class MultiplierSlot {
  graphics!: Graphics;
  label!: Text;
  index: number;
  container: Container = new Container();
  rectX: number;
  rectY: number;
  width: number;
  height: number;

  private multiplier: number;
  private multiplierBonus: number = 0;
  private flashTimer: number = 0;
  private flashDuration: number = 300;
  private flashing: boolean = false;
  private flashOverlay: Graphics = new Graphics();
  private sensor: Matter.Body | null = null;
  private slotColor: number;

  private dropOffset: number = 0;
  private dropTimer: number = 0;
  private isDropping: boolean = false;
  private readonly DROP_DURATION: number = 400;

  constructor(index: number, slotWidth: number, slotY: number, offsetX: number) {
    this.index = index;
    this.rectX = offsetX + index * slotWidth;
    this.rectY = slotY;
    this.width = slotWidth;
    this.height = 40;
    this.multiplier = SLOT_MULTIPLIERS[index];
    this.slotColor = SLOT_COLORS[index];
  }

  init(stage: Container): void {
    stage.addChild(this.container);

    this.graphics = new Graphics();
    this.graphics.beginFill(SLOT_COLORS[this.index]);
    this.graphics.drawRect(this.rectX, this.rectY, this.width, this.height);
    this.graphics.endFill();
    this.container.addChild(this.graphics);

    this.label = new Text(this.getMultiplierText(), {
      fontFamily: "Courier New",
      fontSize: 14,
      fill: 0xffffff,
    });
    this.label.anchor.set(0.5);
    this.label.x = this.rectX + this.width / 2;
    this.label.y = this.rectY + this.height / 2;
    this.container.addChild(this.label);

    this.container.addChild(this.flashOverlay);
  }

  private getMultiplierText(): string {
    return `${(this.multiplier + this.multiplierBonus).toFixed(1)}x`;
  }

  private updateLabel(): void {
    this.label.text = this.getMultiplierText();
  }

  getCenterX(): number {
    return this.rectX + this.width / 2;
  }

  getCenterY(): number {
    return this.rectY + this.height / 2;
  }

  flash(): void {
    this.flashing = true;
    this.flashTimer = 0;

    this.isDropping = true;
    this.dropOffset = 0;
    this.dropTimer = 0;
  }

  private easeOutBounce(t: number): number {
    if (t < 1 / 2.75) return 7.5625 * t * t;
    if (t < 2 / 2.75) { t -= 1.5 / 2.75; return 7.5625 * t * t + 0.75; }
    if (t < 2.5 / 2.75) { t -= 2.25 / 2.75; return 7.5625 * t * t + 0.9375; }
    t -= 2.625 / 2.75;
    return 7.5625 * t * t + 0.984375;
  }

  resetMultiplierBonus(): void {
    this.multiplierBonus = 0;
    this.updateLabel();
  }

  update(delta: number): void {
    if (this.flashing) {
      this.flashTimer += delta;
      const t = Math.min(this.flashTimer / this.flashDuration, 1);

      this.flashOverlay.clear();
      this.flashOverlay.beginFill(0xffffff, 1 - t * t);
      this.flashOverlay.drawRect(this.rectX, this.rectY, this.width, this.height);
      this.flashOverlay.endFill();

      if (t >= 1) {
        this.flashing = false;
        this.flashOverlay.clear();
      }
    }

    if (this.isDropping) {
      this.dropTimer += delta;
      const t = this.dropTimer / this.DROP_DURATION;

      if (t < 0.25) {
        const dropT = t / 0.25;
        this.dropOffset = 6 * dropT;
      } else if (t < 1) {
        const bounceT = (t - 0.25) / 0.75;
        this.dropOffset = 6 * (1 - this.easeOutBounce(bounceT));
      } else {
        this.dropOffset = 0;
        this.isDropping = false;
      }

      this.container.y = this.dropOffset;
    } else {
      this.container.y = 0;
    }
  }

  getMultiplier(): number {
    return this.multiplier + this.multiplierBonus;
  }

  getSlotColor(): number {
    return this.slotColor;
  }

  addMultiplierBonus(bonus: number): void {
    this.multiplierBonus += bonus;
    this.updateLabel();
  }

  setSensor(s: Matter.Body): void {
    this.sensor = s;
  }
}
