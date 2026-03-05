import Phaser from "phaser";
import TurnManager from "../systems/TurnManager.js";
import LootTable from "../generators/LootTable.js";
import CardSystem from "../cards/CardSystem.js";
import { EncounterTemplates } from "../systems/EncounterTemplates.js";
import Board from "../board/Board.js";

export default class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  create() {
    //Board settings 
    this.gridSize = 9;
    this.tileSize = 55;
    this.gridOrigin = { x: 120, y: 80 };

    //Run/turn state 
    this.isPlayerTurn = false;
    this.movesRemaining = 0;

    this.isGameOver = false;
    this.inReward = false;

    // roguelike run state
    this.floor = 1;
    this.surviveTarget = 6;
    this.turnsSurvived = 0;

    // defense stat
    this.shield = 0;

    //Deckbuilder state
    this.maxEnergy = 3;
    this.energy = this.maxEnergy;

    this.drawPile = [];
    this.discardPile = [];
    this.hand = [];

    // starter deck for the run 
    this.runDeck = ["dash", "dash", "shield", "heal", "dash"];

    // systems
    this.turnManager = new TurnManager(this);
    this.lootTable = new LootTable();
    this.cardSystem = new CardSystem(this);

    // Board 
    this.board = new Board(this, {
      gridSize: this.gridSize,
      tileSize: this.tileSize,
      origin: this.gridOrigin,
    });

    this.board.createTiles();

    // Spawn King 
    const kx = Math.floor(this.gridSize / 2);
    const ky = this.gridSize - 1;

    this.king = this.board.spawnPiece("KING", kx, ky, 0x4aa3ff);
    this.king.hp = 3;

    // generate walls BEFORE spawning encounter
    this.board.generateWalls(this.floor, kx, ky);

    // Spawn enemies 
    this.spawnEncounter();

    // UI 
    this.add.text(20, 20, "Click green tiles to move the King", {
      fontSize: "18px",
      color: "#ffffff",
    });

    this.hpText = this.add.text(20, 45, `HP: ${this.king.hp}`, {
      fontSize: "18px",
      color: "#ffffff",
    });

    this.shieldText = this.add.text(20, 70, `SHIELD: ${this.shield}`, {
      fontSize: "18px",
      color: "#ffffff",
    });

    this.floorText = this.add.text(20, 95, `FLOOR: ${this.floor}`, {
      fontSize: "18px",
      color: "#ffffff",
    });

    this.surviveText = this.add.text(
      20,
      120,
      `SURVIVE: ${this.turnsSurvived}/${this.surviveTarget}`,
      { fontSize: "18px", color: "#ffffff" }
    );

    this.turnText = this.add.text(20, 145, "TURN: PLAYER", {
      fontSize: "18px",
      color: "#ffffff",
    });

    this.movesText = this.add.text(20, 170, "MOVES: 1", {
      fontSize: "18px",
      color: "#ffffff",
    });

    this.energyText = this.add.text(
      20,
      195,
      `ENERGY: ${this.energy}/${this.maxEnergy}`,
      { fontSize: "18px", color: "#ffffff" }
    );

    // simple End Turn button
    this.endTurnBtn = this.add
      .rectangle(760, 40, 120, 40, 0x444444)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive();

    this.endTurnLabel = this.add.text(725, 30, "END TURN", {
      fontSize: "16px",
      color: "#ffffff",
    });

    this.endTurnBtn.on("pointerdown", () => {
      if (this.isGameOver || this.inReward) return;

      // discard remaining hand at end of turn 
      while (this.hand.length > 0) {
        this.discardPile.push(this.hand.pop());
      }
      this.cardSystem.renderHand();

      this.turnManager.endPlayerTurn();

      if (!this.isGameOver) {
        this.turnsSurvived += 1;
        this.updateSurviveUI();

        if (this.turnsSurvived >= this.surviveTarget) {
          this.onVictory();
        }
      }
    });

    // start first player turn
    this.turnManager.startPlayerTurn();
  }

  // Roguelike loop 
  onVictory() {
    this.inReward = true;
    this.isPlayerTurn = false;
    this.board.clearHighlights();

    const options = this.lootTable.drawOptions(3);

    this.cardSystem.showReward(options, (pickedCard) => {
      this.runDeck.push(pickedCard.id);
      pickedCard.apply(this);

      this.floor += 1;
      this.turnsSurvived = 0;
      this.updateFloorUI();
      this.updateSurviveUI();

      this.inReward = false;

      this.resetEncounter();
      if (!this.isGameOver) this.turnManager.startPlayerTurn();
    });
  }

  resetEncounter() {
    // clear enemies
    this.board.clearEnemies();

    this.board.clearHighlights();

    const kx = Math.floor(this.gridSize / 2);
    const ky = this.gridSize - 1;

    this.board.generateWalls(this.floor, kx, ky);

    // move king back to start (keep HP/shield/deck)
    this.board.movePiece(this.king, kx, ky);

    // spawn new encounter
    this.spawnEncounter();
  }

  pickEncounterTemplate() {
    const pool =
      this.floor >= 3
        ? EncounterTemplates
        : EncounterTemplates.filter((t) => t.id !== "knight_pressure");

    return pool[Math.floor(Math.random() * pool.length)];
  }

  spawnEncounter() {
    const chosen = this.pickEncounterTemplate();
    this.currentEncounter = chosen.id;
    chosen.spawn(this); 
  }

  spawnEnemy(type, x, y) {
    return this.board.spawnEnemy(type, x, y);
  }

  //Turn hooks 
  onPlayerTurnStart() {
    this.movesRemaining = 1;
    this.updateMovesUI();

    this.energy = this.maxEnergy;
    this.updateEnergyUI();

    this.drawHand(3);
    this.cardSystem.renderHand();

    // show king moves with click callback
    this.showLegalMovesForKing();
  }

  // Deck helpers 
  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  resetDrawPileIfNeeded() {
    if (this.drawPile.length > 0) return;

    if (this.discardPile.length > 0) {
      this.drawPile = this.discardPile.splice(0);
      this.shuffle(this.drawPile);
      return;
    }

    this.drawPile = [...this.runDeck];
    this.shuffle(this.drawPile);
  }

  drawHand(n = 3) {
    this.hand = [];

    for (let i = 0; i < n; i++) {
      this.resetDrawPileIfNeeded();
      if (this.drawPile.length === 0) break;
      this.hand.push(this.drawPile.pop());
    }
  }

  // UI helpers 
  updateHPUI() {
    if (this.hpText) this.hpText.setText(`HP: ${this.king.hp}`);
  }

  updateShieldUI() {
    if (this.shieldText) this.shieldText.setText(`SHIELD: ${this.shield}`);
  }

  updateFloorUI() {
    if (this.floorText) this.floorText.setText(`FLOOR: ${this.floor}`);
  }

  updateSurviveUI() {
    if (this.surviveText) {
      this.surviveText.setText(
        `SURVIVE: ${this.turnsSurvived}/${this.surviveTarget}`
      );
    }
  }

  updateTurnUI() {
    if (!this.turnText) return;
    this.turnText.setText(`TURN: ${this.turnManager.state}`);
  }

  updateMovesUI() {
    if (this.movesText) this.movesText.setText(`MOVES: ${this.movesRemaining}`);
  }

  updateEnergyUI() {
    if (this.energyText) {
      this.energyText.setText(`ENERGY: ${this.energy}/${this.maxEnergy}`);
    }
  }

  // King move/capture 
  showLegalMovesForKing() {
    this.board.showLegalMovesForKing(this.king, (move) => {
      if (this.isGameOver || this.inReward) return;
      if (!this.isPlayerTurn) return;
      if (this.movesRemaining <= 0) return;

      this.board.captureAt(move.x, move.y);
      this.board.movePiece(this.king, move.x, move.y);

      this.movesRemaining -= 1;
      this.updateMovesUI();

      if (this.movesRemaining <= 0) {
        this.board.clearHighlights();
        this.board.renderWalls();
        return;
      }

      // keep showing moves if you still have moves
      this.showLegalMovesForKing();
    });
  }

  // Enemy AI 
  enemyTurn() {
    for (let enemy of this.board.enemies) {
      const dx = this.king.x - enemy.x;
      const dy = this.king.y - enemy.y;

      let moveX = enemy.x;
      let moveY = enemy.y;

      if (enemy.type === "KNIGHT") {
        const moves = this.board.getKnightMoves(enemy.x, enemy.y);

        let best = null;
        let bestDist = Infinity;
        for (const m of moves) {
          const dist = Math.abs(this.king.x - m.x) + Math.abs(this.king.y - m.y);
          if (dist < bestDist) {
            bestDist = dist;
            best = m;
          }
        }

        if (best) {
          moveX = best.x;
          moveY = best.y;
        }
      } else {
        if (Math.abs(dx) > Math.abs(dy)) moveX += Math.sign(dx);
        else moveY += Math.sign(dy);
      }

      if (!this.board.inBounds(moveX, moveY)) continue;
      if (this.board.isWall(moveX, moveY)) continue;

      // attack if would step onto king
      if (moveX === this.king.x && moveY === this.king.y) {
        if (this.shield > 0) {
          this.shield -= 1;
          this.updateShieldUI();
        } else {
          this.king.hp -= 1;
          this.updateHPUI();

          this.king.sprite.setFillStyle(0xffffff);
          this.time.delayedCall(80, () => this.king.sprite.setFillStyle(0x4aa3ff));

          if (this.king.hp <= 0) {
            this.gameOver();
            return;
          }
        }
        continue;
      }

      // move into empty tile only
      if (!this.board.pieces[this.board.key(moveX, moveY)]) {
        this.board.movePiece(enemy, moveX, moveY);
      }
    }
  }

  gameOver() {
    this.isGameOver = true;
    this.inReward = false;

    this.add.text(330, 40, "GAME OVER", {
      fontSize: "48px",
      color: "#ff4444",
    });

    this.scene.pause();
  }
}