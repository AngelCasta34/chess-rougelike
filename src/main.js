import Phaser from "phaser";
import GameScene from "./scenes/GameScene.js";

new Phaser.Game({
  type: Phaser.AUTO,
  width: 1100,
  height: 750,
  backgroundColor: "#1e1e1e",
  scene: [GameScene],
});