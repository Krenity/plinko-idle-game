import { Container, Text } from "pixi.js";
import type { Game } from "../game/Game";
import { COLORS } from "../utils/constants";

export class HUD {
  private game: Game;
  private container: Container = new Container();
  private blobCountText?: Text;
  private fpsText?: Text;
  private shardText?: Text;

  constructor(game: Game) {
    this.game = game;
  }

  init(stage: Container): void {
    stage.addChild(this.container);
    this.createHUD();
  }

  private createHUD(): void {
    this.blobCountText = new Text("Blobs: 0", {
      fontFamily: "Courier New",
      fontSize: 14,
      fill: COLORS.text,
    });
    this.blobCountText.x = 10;
    this.blobCountText.y = 95;
    this.container.addChild(this.blobCountText);

    this.fpsText = new Text("FPS: 0", {
      fontFamily: "Courier New",
      fontSize: 12,
      fill: 0x888888,
    });
    this.fpsText.x = 10;
    this.fpsText.y = 115;
    this.container.addChild(this.fpsText);

    this.shardText = new Text("\u25C6 0", { // ◆ 0
      fontFamily: "Courier New",
      fontSize: 13,
      fill: COLORS.gold,
    });
    this.shardText.x = 10;
    this.shardText.y = 135;
    this.container.addChild(this.shardText);
  }

  update(): void {
    if (this.blobCountText) {
      this.blobCountText.text = `Blobs: ${this.game.dropper.getBlobCount()}`;
    }
    if (this.fpsText) {
      this.fpsText.text = `FPS: ${Math.round(this.game.app.ticker.FPS)}`;
    }
    if (this.shardText && this.game.shardSystem) {
      this.shardText.text = `\u25C6 ${this.game.shardSystem.getShards()}`;
    }
  }
}
