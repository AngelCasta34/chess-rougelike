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

    // Show where enemies WILL move (telegraph), then execute after delay
    this.scene.showEnemyTelegraphs();

    this.scene.time.delayedCall(650, () => {
      if (this.scene.isGameOver) return;
      this.scene.clearEnemyTelegraphs();
      this.scene.enemyTurn();
      if (!this.scene.isGameOver) this.startPlayerTurn();
    });
  }

  endPlayerTurn() {
    if (this.state !== "PLAYER") return;
    this.startEnemyTurn();
  }
}