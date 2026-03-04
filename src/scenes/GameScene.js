import Phaser from "phaser";
import TurnManager from "../systems/TurnManager.js";
import LootTable from "../generators/LootTable.js";
import CardSystem from "../cards/CardSystem.js";

export default class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  create() {
    // --- Board settings ---
    this.gridSize = 9;
    this.tileSize = 55;
    this.gridOrigin = { x: 120, y: 80 };

    this.tiles = [];
    this.pieces = {}; // "x,y" -> piece object
    this.enemies = [];

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

    // --- Deckbuilder state ---
    this.maxEnergy = 3;
    this.energy = this.maxEnergy;

    this.drawPile = [];
    this.discardPile = [];
    this.hand = [];

    // starter deck for the run (deck grows when you pick rewards)
    this.runDeck = ["dash", "dash", "shield", "heal", "dash"];

    // systems
    this.turnManager = new TurnManager(this);
    this.lootTable = new LootTable();
    this.cardSystem = new CardSystem(this);

    // --- Create board tiles ---
    for (let y = 0; y < this.gridSize; y++) {
      this.tiles[y] = [];
      for (let x = 0; x < this.gridSize; x++) {
        const worldX = this.gridOrigin.x + x * this.tileSize;
        const worldY = this.gridOrigin.y + y * this.tileSize;

        const color = (x + y) % 2 === 0 ? 0x2f2f2f : 0x3a3a3a;

        const tile = this.add
          .rectangle(worldX, worldY, this.tileSize - 4, this.tileSize - 4, color)
          .setOrigin(0)
          .setStrokeStyle(2, 0x000000)
          .setInteractive();

        tile.gridPos = { x, y };
        this.tiles[y][x] = tile;
      }
    }

    // --- Spawn King (center-bottom) ---
    const kx = Math.floor(this.gridSize / 2);
    const ky = this.gridSize - 1;

    this.king = this.spawnPiece("KING", kx, ky, 0x4aa3ff);
    this.king.hp = 3;

    // --- Spawn enemies for Floor 1 ---
    this.spawnEncounter();

    // --- UI ---
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

      // discard remaining hand at end of turn (deckbuilder feel)
      while (this.hand.length > 0) {
        this.discardPile.push(this.hand.pop());
      }
      this.cardSystem.renderHand();

      this.turnManager.endPlayerTurn();

      // enemyTurn happens immediately, so if we didn't die,
      // a full "round" was survived.
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

  // ===== Roguelike loop =====
  onVictory() {
    this.inReward = true;
    this.isPlayerTurn = false;
    this.clearHighlights();

    const options = this.lootTable.drawOptions(3);

    this.cardSystem.showReward(options, (pickedCard) => {
      // add to run deck (deck grows during the run)
      this.runDeck.push(pickedCard.id);

      // optional immediate effect once
      pickedCard.apply(this);

      // next floor
      this.floor += 1;
      this.turnsSurvived = 0;
      this.updateFloorUI();
      this.updateSurviveUI();

      this.inReward = false;

      // new encounter
      this.resetEncounter();

      // start player turn again
      if (!this.isGameOver) this.turnManager.startPlayerTurn();
    });
  }

  resetEncounter() {
    // remove enemies from board + display
    for (const e of this.enemies) {
      delete this.pieces[`${e.x},${e.y}`];
      e.sprite.destroy();
      e.label.destroy();
    }
    this.enemies = [];

    // move king back to start position (keep HP/shield/DECK for roguelike continuity)
    const kx = Math.floor(this.gridSize / 2);
    const ky = this.gridSize - 1;
    this.movePiece(this.king, kx, ky);

    // new fight starts with fresh turn counters (deck stays)
    this.movesRemaining = 0;
    this.energy = this.maxEnergy;
    this.updateEnergyUI();

    // spawn new enemies scaled by floor
    this.spawnEncounter();
  }

  spawnEncounter() {
    // Simple scaling: more pawns as floor increases
    // (we’ll add knight templates next)
    const kx = Math.floor(this.gridSize / 2);
    const enemyCount = Math.min(2 + Math.floor(this.floor - 1), 6);

    for (let i = 0; i < enemyCount; i++) {
      const ex = Phaser.Math.Clamp(
        kx - Math.floor(enemyCount / 2) + i,
        0,
        this.gridSize - 1
      );
      const ey = 0;

      // if occupied, shift down a row
      const key = `${ex},${ey}`;
      const spawnY = this.pieces[key] ? 1 : 0;

      this.spawnEnemy("PAWN", ex, spawnY);
    }
  }

  // ===== Turn hooks =====
  onPlayerTurnStart() {
    // base chess move
    this.movesRemaining = 1;
    this.updateMovesUI();

    // refill energy each player turn
    this.energy = this.maxEnergy;
    this.updateEnergyUI();

    // draw a new hand each player turn
    this.drawHand(3);
    this.cardSystem.renderHand();
  }

  // ===== Deck helpers =====
  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  resetDrawPileIfNeeded() {
    if (this.drawPile.length > 0) return;

    // refill from discard if possible
    if (this.discardPile.length > 0) {
      this.drawPile = this.discardPile.splice(0);
      this.shuffle(this.drawPile);
      return;
    }

    // first time: seed from runDeck
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

  // ===== UI helpers =====
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

  // ===== Piece helpers =====
  spawnPiece(type, x, y, color) {
    const px = this.gridOrigin.x + x * this.tileSize + this.tileSize / 2;
    const py = this.gridOrigin.y + y * this.tileSize + this.tileSize / 2;

    const sprite = this.add.circle(px, py, 24, color).setStrokeStyle(3, 0x000000);

    const label = this.add.text(px - 10, py - 12, type[0], {
      fontSize: "20px",
      color: "#000000",
    });

    const piece = { type, x, y, sprite, label };
    this.pieces[`${x},${y}`] = piece;
    return piece;
  }

  spawnEnemy(type, x, y) {
    const enemy = this.spawnPiece(type, x, y, 0xff5555);
    enemy.isEnemy = true;
    this.enemies.push(enemy);
    return enemy;
  }

  movePiece(piece, newX, newY) {
    delete this.pieces[`${piece.x},${piece.y}`];

    piece.x = newX;
    piece.y = newY;

    this.pieces[`${newX},${newY}`] = piece;

    const px = this.gridOrigin.x + newX * this.tileSize + this.tileSize / 2;
    const py = this.gridOrigin.y + newY * this.tileSize + this.tileSize / 2;

    piece.sprite.setPosition(px, py);
    piece.label.setPosition(px - 10, py - 12);
  }

  // ===== Movement rules =====
  getKingMoves(x, y) {
    const moves = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;

        const nx = x + dx;
        const ny = y + dy;

        if (nx >= 0 && nx < this.gridSize && ny >= 0 && ny < this.gridSize) {
          if (!this.pieces[`${nx},${ny}`]) moves.push({ x: nx, y: ny });
        }
      }
    }
    return moves;
  }

  // ===== Tile visuals =====
  clearHighlights() {
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const color = (x + y) % 2 === 0 ? 0x2f2f2f : 0x3a3a3a;
        this.tiles[y][x].setFillStyle(color);
        this.tiles[y][x].setStrokeStyle(2, 0x000000);
      }
    }
  }

  showLegalMovesForKing() {
    this.clearHighlights();

    this.legalMoves = this.getKingMoves(this.king.x, this.king.y);

    for (const m of this.legalMoves) {
      this.tiles[m.y][m.x].setStrokeStyle(4, 0x00ff88);
    }

    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const tile = this.tiles[y][x];
        tile.removeAllListeners("pointerdown");

        tile.on("pointerdown", () => {
          const isLegal = this.legalMoves.some((p) => p.x === x && p.y === y);

          if (
            isLegal &&
            this.isPlayerTurn &&
            !this.inReward &&
            this.movesRemaining > 0
          ) {
            this.movePiece(this.king, x, y);

            this.movesRemaining -= 1;
            this.updateMovesUI();

            if (this.movesRemaining <= 0) {
              this.clearHighlights();
              return;
            }

            this.showLegalMovesForKing();
          }
        });
      }
    }
  }

  // ===== Enemy AI =====
  enemyTurn() {
    for (let enemy of this.enemies) {
      const dx = this.king.x - enemy.x;
      const dy = this.king.y - enemy.y;

      let moveX = enemy.x;
      let moveY = enemy.y;

      if (Math.abs(dx) > Math.abs(dy)) moveX += Math.sign(dx);
      else moveY += Math.sign(dy);

      if (
        moveX < 0 ||
        moveX >= this.gridSize ||
        moveY < 0 ||
        moveY >= this.gridSize
      ) {
        continue;
      }

      // attack if would step onto king
      if (moveX === this.king.x && moveY === this.king.y) {
        // shield blocks first
        if (this.shield > 0) {
          this.shield -= 1;
          this.updateShieldUI();
        } else {
          this.king.hp -= 1;
          this.updateHPUI();

          // flash
          this.king.sprite.setFillStyle(0xffffff);
          this.time.delayedCall(80, () =>
            this.king.sprite.setFillStyle(0x4aa3ff)
          );

          if (this.king.hp <= 0) {
            this.gameOver();
            return;
          }
        }

        continue;
      }

      if (!this.pieces[`${moveX},${moveY}`]) {
        this.movePiece(enemy, moveX, moveY);
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