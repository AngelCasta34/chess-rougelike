export default class TurnManager {
  constructor(scene) {
    this.scene = scene;
    this.state = "PLAYER"; // "PLAYER" | "ENEMY"
  }

  startPlayerTurn() {
    this.state = "PLAYER";
    this.scene.isPlayerTurn = true;

    this.scene.onPlayerTurnStart();

    this.scene.updateTurnUI();
    this.scene.showLegalMovesForKing();
  }

  startEnemyTurn() {
    this.state = "ENEMY";
    this.scene.isPlayerTurn = false;
    this.scene.updateTurnUI();

    // enemies act once
    this.scene.enemyTurn();

    // back to player
    this.startPlayerTurn();
  }

  endPlayerTurn() {
    if (this.state !== "PLAYER") return;
    this.startEnemyTurn();
  }
}