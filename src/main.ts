import { Game } from "./game/Game";

const game = new Game();

game.init().then(() => {
  console.log("Plinko Idle Game started!");
});
