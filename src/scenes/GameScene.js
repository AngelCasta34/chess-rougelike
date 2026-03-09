import Phaser from "phaser";
import TurnManager from "../systems/TurnManager.js";
import LootTable from "../generators/LootTable.js";
import CardSystem from "../cards/CardSystem.js";
import ShopSystem from "../systems/ShopSystem.js";
import { spawnGenerativeEncounter } from "../systems/EncounterTemplates.js";
import Board from "../board/Board.js";
import { getEnemyMoves, chooseBestMove } from "../systems/EnemyAI.js";
import { processStatuses, consumeWeakened } from "../systems/StatusEffects.js";
import { buildEnemy } from "../generators/EnemyFactory.js";
import CardList from "../cards/CardList.js";

// Gold earned per piece type
const GOLD_TABLE = { PAWN: 4, KNIGHT: 8, BISHOP: 8, ROOK: 14, QUEEN: 25 };

// Room choice visual config
const ROOM_CONFIG = {
  fight: { label: "FIGHT",     icon: "⚔",  color: 0x334455, desc: "Clear enemies.\nEarn a card reward." },
  elite: { label: "ELITE",     icon: "💀",  color: 0x553333, desc: "Harder enemies.\nBetter card reward." },
  rest:  { label: "REST",      icon: "♥",   color: 0x335533, desc: "Heal 3 HP.\nNo combat." },
  shop:  { label: "SHOP",      icon: "★",   color: 0x555533, desc: "Buy or remove cards." },
  boss:  { label: "BOSS",      icon: "👑",  color: 0x553300, desc: "BOSS FIGHT!\nLegendary reward." },
};

export default class GameScene extends Phaser.Scene {
  constructor() { super("GameScene"); }

  preload() {
    const base = "assets/chessPieces/chess-pack";
    for (const color of ["white", "black"]) {
      for (const piece of ["pawn", "knight", "bishop", "rook", "queen", "king"]) {
        this.load.image(`chess-${piece}-${color}`, `${base}/chess-${piece}-${color}.png`);
      }
    }
  }

  create() {
    // Board settings 
    this.gridSize   = 9;
    this.tileSize   = 62;
    this.gridOrigin = { x: 105, y: 45 };

    // Turn / game state 
    this.isPlayerTurn   = false;
    this.movesRemaining = 0;
    this.isGameOver     = false;
    this.inReward       = false;

    // Run state 
    this.floor           = 1;
    this.killCount       = 0;
    this.gold            = 0;
    this.currentRoomType = "fight";
    this.activeBoss      = null;

    // Player stats 
    this.shield    = 0;
    this.bonusMoves       = 0;
    this.bonusStartShield = 0;
    this.kingAtk          = 1;
    this.isFirstTurnOfRoom = true;

    // Deckbuilder 
    this.maxEnergy   = 3;
    this.energy      = this.maxEnergy;
    this.drawPile    = [];
    this.discardPile = [];
    this.hand        = [];
    this.runDeck     = ["dash", "dash", "shield", "heal", "dash"];
    this.noRareStreak = 0;

    // Systems 
    this.turnManager = new TurnManager(this);
    this.lootTable   = new LootTable();
    this.cardSystem  = new CardSystem(this);
    this.shopSystem  = new ShopSystem(this);

    //  Board 
    this.board = new Board(this, {
      gridSize: this.gridSize, tileSize: this.tileSize, origin: this.gridOrigin,
    });
    this.board.createTiles();

    // Kill callback = gold, boss bar, kill count
    this.board.onKillCallback = (enemy) => {
      let gold = GOLD_TABLE[enemy.type] ?? 4;
      if (enemy.modifier?.id === "elite")   gold = Math.floor(gold * 1.5);
      if (enemy.modifier?.id === "armored") gold += 2;
      if (enemy.isBoss) gold += 30;
      this.addGold(gold);
      this.killCount += 1;
      this.updateEnemyCountUI();
      // Update boss bar if alive
      if (enemy.isBoss) this.clearBossBar();
    };

    // Boss HP bar update on damage
    this.board.onEnemyDamaged = (enemy) => {
      if (enemy.isBoss && enemy.hp > 0) this.updateBossBar(enemy);
    };

    // Spawn king 
    const kx = Math.floor(this.board.gridSize / 2);
    const ky = this.board.gridSize - 1;
    this.king       = this.board.spawnPiece("KING", kx, ky);
    this.king.hp    = 5;
    this.king.maxHp = 5;

    this.board.generateWalls(this.floor, kx, ky);
    this.spawnEncounter();

    // Layout panels 
    // Main board panel
    this.add.rectangle(384, 324, 572, 572, 0x111111).setStrokeStyle(3, 0x2a2a3a).setDepth(-1);
    // Right sidebar panel
    this.add.rectangle(886, 375, 324, 750, 0x0d0d1a).setDepth(-1);
    // Sidebar left border
    this.add.rectangle(725, 375, 2, 750, 0x1e1e30).setDepth(-1);
    // Bottom card strip
    this.add.rectangle(363, 684, 726, 132, 0x0a0a14).setDepth(-1);
    this.add.rectangle(363, 618, 726, 2, 0x1a1a2e).setDepth(-1);

    // Right panel UI 
    // Floor heading
    this.floorText = this.add.text(886, 18, `FLOOR  ${this.floor}`, {
      fontSize: "20px", color: "#ccccdd", align: "center",
    }).setOrigin(0.5, 0);

    // HP label / visual bar
    this.hpText = this.add.text(735, 55, `HP  ${this.king.hp} / ${this.king.maxHp}`, {
      fontSize: "14px", color: "#ff8888",
    });
    this.hpBarBg   = this.add.rectangle(735, 75, 196, 11, 0x3a1010).setOrigin(0, 0.5);
    this.hpBarFill = this.add.rectangle(735, 75, 196, 11, 0xee3344).setOrigin(0, 0.5);

    // Shield / Gold / Enemies / Kills
    this.shieldText     = this.add.text(735, 90,  `SHIELD  ${this.shield}`,                    { fontSize: "14px", color: "#88ccff" });
    this.goldText       = this.add.text(735, 110, `GOLD  ${this.gold}g`,                       { fontSize: "14px", color: "#ffdd44" });
    this.enemyCountText = this.add.text(735, 130, `ENEMIES  ${this.board.enemies.length}`,     { fontSize: "14px", color: "#ff7777" });
    this.killText       = this.add.text(735, 150, `KILLS  ${this.killCount}`,                  { fontSize: "14px", color: "#888899" });

    // Turn / moves
    this.turnText  = this.add.text(735, 175, "TURN: PLAYER", { fontSize: "14px", color: "#cccccc" });
    this.movesText = this.add.text(735, 195, "MOVES: 1",      { fontSize: "14px", color: "#cccccc" });

    // Energy pips
    this.add.text(735, 220, "ENERGY", { fontSize: "12px", color: "#666677" });
    this.energyPips = [];
    for (let i = 0; i < this.maxEnergy; i++) {
      const pip = this.add.circle(749 + i * 28, 244, 10, 0x3366cc).setStrokeStyle(2, 0x112244);
      this.energyPips.push(pip);
    }

    // Divider
    this.add.rectangle(886, 268, 280, 1, 0x252535);

    // END TURN button (large, prominent)
    this.endTurnBtn = this.add.rectangle(886, 312, 216, 62, 0x112211)
      .setStrokeStyle(3, 0x44ee88).setInteractive();
    this.add.text(886, 312, "END TURN\n[SPACE]", {
      fontSize: "18px", color: "#44ee88", align: "center",
    }).setOrigin(0.5);
    this.endTurnBtn.on("pointerover",  () => this.endTurnBtn.setFillStyle(0x1c3a22));
    this.endTurnBtn.on("pointerout",   () => this.endTurnBtn.setFillStyle(0x112211));
    this.endTurnBtn.on("pointerdown", () => {
      if (this.isGameOver || this.inReward) return;
      if (!this.isPlayerTurn) return;
      while (this.hand.length > 0) this.discardPile.push(this.hand.pop());
      this.cardSystem.renderHand();
      this.clearThreatMap();
      this.turnManager.endPlayerTurn();
    });

    this.input.keyboard.on("keydown-SPACE", () => {
      if (this.isGameOver || this.inReward) return;
      if (!this.isPlayerTurn) return;
      while (this.hand.length > 0) this.discardPile.push(this.hand.pop());
      this.cardSystem.renderHand();
      this.clearThreatMap();
      this.turnManager.endPlayerTurn();
    });

    // VIEW DECK button
    const deckBtn = this.add.rectangle(886, 386, 188, 42, 0x0e0e22)
      .setStrokeStyle(2, 0x3355aa).setInteractive();
    this.add.text(886, 386, "VIEW DECK", { fontSize: "15px", color: "#4466cc", align: "center" }).setOrigin(0.5);
    deckBtn.on("pointerover",  () => deckBtn.setFillStyle(0x181838));
    deckBtn.on("pointerout",   () => deckBtn.setFillStyle(0x0e0e22));
    deckBtn.on("pointerdown", () => this.toggleDeckViewer());

    // Hint text
    this.add.text(10, 738, "Orange = attack  •  Green = move  •  SPACE = end turn", {
      fontSize: "11px", color: "#333344",
    });

    // Boss HP bar/spans top of board, hidden until boss fight
    this.bossBarBg   = this.add.rectangle(384, 26, 558, 16, 0x440000).setDepth(10).setVisible(false);
    this.bossBarFill = this.add.rectangle(105, 26, 558, 16, 0xff2244).setOrigin(0, 0.5).setDepth(11).setVisible(false);
    this.bossBarText = this.add.text(384, 14, "", { fontSize: "12px", color: "#ffffff", align: "center" }).setOrigin(0.5, 0).setDepth(12).setVisible(false);

    this.turnManager.startPlayerTurn();
  }

  // Encounter management 
  spawnEncounter() {
    if (this.isBossFloor()) {
      this.spawnBossEncounter();
    } else if (this.currentRoomType === "elite") {
      spawnGenerativeEncounter(this, { eliteBoost: true });
    } else {
      spawnGenerativeEncounter(this);
    }
    this.updateEnemyCountUI();
  }

  isBossFloor() { return this.floor > 0 && this.floor % 5 === 0; }
  isEliteFloor() { return this.currentRoomType === "elite"; }

  spawnBossEncounter() {
    const hp     = 10 + this.floor * 2;
    const boss   = this.board.spawnEnemy(
      { type: "QUEEN", hp, maxHp: hp, atk: 3, color: 0xcc0055, label: "Q★", modifier: { id: "boss", suffix: "★" } },
      Math.floor(this.board.gridSize / 2), 1
    );
    if (boss) {
      boss.isBoss = true;
      this.activeBoss = boss;
      this.showBossBar(boss);
    }
    // Minion guards
    const guards = [buildEnemy("ROOK", this.floor), buildEnemy("ROOK", this.floor)];
    this.board.spawnEnemy(guards[0], 2, 2);
    this.board.spawnEnemy(guards[1], this.board.gridSize - 3, 2);
    for (let x = 1; x < this.board.gridSize - 1; x += 2) {
      this.board.spawnEnemy(buildEnemy("PAWN", this.floor), x, 0);
    }
  }

  // Boss HP bar 
  showBossBar(boss) {
    this.bossBarBg.setVisible(true);
    this.bossBarFill.setVisible(true);
    this.bossBarText.setVisible(true);
    this.updateBossBar(boss);
  }

  updateBossBar(boss) {
    if (!boss || !this.bossBarFill) return;
    const pct = Math.max(0, boss.hp / boss.maxHp);
    this.bossBarFill.setScale(pct, 1);
    this.bossBarText.setText(`THE BLACK QUEEN  ${boss.hp}/${boss.maxHp}`);
  }

  clearBossBar() {
    this.activeBoss = null;
    this.bossBarBg.setVisible(false);
    this.bossBarFill.setVisible(false);
    this.bossBarText.setVisible(false);
  }

  // Wave clear 
  checkWaveCleared() {
    if (this.isGameOver || this.inReward) return;
    if (this.board.enemies.length === 0) {
      this.time.delayedCall(300, () => {
        if (this.board.enemies.length === 0 && !this.isGameOver && !this.inReward) {
          this.onVictory();
        }
      });
    }
  }

  // Roguelike loop 
  onVictory() {
    this.inReward     = true;
    this.isPlayerTurn = false;
    this.board.clearHighlights();
    this.board.renderWalls();
    this.clearBossBar();

    // Card reward
    const rewardTable = this.isBossFloor() ? "reward_elite"
                      : this.isEliteFloor() ? "reward_elite"
                      : "reward_fight";
    const pity = Math.min(this.noRareStreak, 5);

    const options = [
      ...this.lootTable.drawOptions(rewardTable, 1, { floor: this.floor, tag: "movement", pity }),
      ...this.lootTable.drawOptions(rewardTable, 1, { floor: this.floor, tag: "defense",  pity }),
      ...this.lootTable.drawOptions(rewardTable, 1, { floor: this.floor, pity }),
    ];

    const hadRarePlus = options.some((c) => ["Rare", "Epic", "Legendary"].includes(c.rarity));
    if (hadRarePlus) this.noRareStreak = 0; else this.noRareStreak += 1;

    this.cardSystem.showReward(options, (pickedCard) => {
      if (!pickedCard.permanent) {
        this.runDeck.push(pickedCard.id);
        this.discardPile.push(pickedCard.id);
      }
      pickedCard.apply(this);
      this.inReward = false;

      // Show room choice for next floor
      const roomOptions = this._generateRoomOptions();
      this.showRoomChoice(roomOptions, (chosenType) => {
        this._applyRoomBonus(chosenType, () => {
          this.floor += 1;
          this.currentRoomType = chosenType;
          this.updateFloorUI();
          this.resetEncounter();
          if (!this.isGameOver) this.turnManager.startPlayerTurn();
        });
      });
    });
  }

  _generateRoomOptions() {
    if (this.floor % 5 === 4) return ["boss"]; // next floor is boss
    let pool = [
      "fight","fight","fight","fight","fight",
      "elite","elite",
      "rest","rest","rest",
      "shop","shop",
    ];
    if (this.floor < 2) pool = pool.filter((t) => t !== "elite");
    const picked = new Set();
    while (picked.size < 3 && pool.length > 0) {
      const idx = Math.floor(Math.random() * pool.length);
      picked.add(pool[idx]);
      pool.splice(idx, 1);
    }
    return [...picked];
  }

  showRoomChoice(options, onChosen) {
    const objs = [];
    const bg   = this.add.rectangle(450, 300, 900, 600, 0x000000, 0.75).setDepth(150).setInteractive();
    const title = this.add.text(450, 100, "Choose Your Next Room", {
      fontSize: "30px", color: "#ffffff",
    }).setOrigin(0.5, 0).setDepth(151);
    objs.push(bg, title);

    options.forEach((type, i) => {
      const cfg = ROOM_CONFIG[type] ?? ROOM_CONFIG.fight;
      const x   = 180 + i * 230;
      const y   = 310;

      const box = this.add.rectangle(x, y, 210, 230, cfg.color)
        .setStrokeStyle(3, 0xffffff).setInteractive().setDepth(151);
      const icon = this.add.text(x, y - 90, cfg.icon, { fontSize: "38px" }).setOrigin(0.5, 0).setDepth(152);
      const lbl  = this.add.text(x, y - 42, cfg.label, { fontSize: "18px", color: "#ffffff" }).setOrigin(0.5, 0).setDepth(152);
      const desc = this.add.text(x - 88, y,  cfg.desc, { fontSize: "13px", color: "#cccccc", wordWrap: { width: 178 }, align: "center" }).setDepth(152);

      box.on("pointerover",  () => box.setFillStyle(cfg.color + 0x111111));
      box.on("pointerout",   () => box.setFillStyle(cfg.color));
      box.on("pointerdown",  () => { objs.forEach((o) => o.destroy()); onChosen(type); });

      objs.push(box, icon, lbl, desc);
    });
  }

  _applyRoomBonus(type, callback) {
    if (type === "rest") {
      this.showRestOverlay(callback);
    } else if (type === "shop") {
      this.shopSystem.show(callback);
    } else {
      callback();
    }
  }

  showRestOverlay(callback) {
    const heal = 3;
    this.king.hp = Math.min(this.king.hp + heal, this.king.maxHp);
    this.updateHPUI();
    this.addGold(15); // small bonus for resting

    const objs  = [];
    const bg    = this.add.rectangle(450, 300, 900, 600, 0x002211, 0.88).setDepth(150).setInteractive();
    const title = this.add.text(450, 195, "♥  REST POINT", { fontSize: "40px", color: "#44ff88" }).setOrigin(0.5, 0).setDepth(151);
    const info  = this.add.text(450, 265, `Healed ${heal} HP  |  HP: ${this.king.hp}/${this.king.maxHp}  |  +15g`, {
      fontSize: "20px", color: "#ffffff",
    }).setOrigin(0.5, 0).setDepth(151);
    const btn   = this.add.rectangle(450, 370, 220, 60, 0x115511).setStrokeStyle(2, 0x44ff88).setInteractive().setDepth(151);
    const btnLbl = this.add.text(381, 358, "Continue →", { fontSize: "20px", color: "#44ff88" }).setDepth(152);
    objs.push(bg, title, info, btn, btnLbl);
    btn.on("pointerdown", () => { objs.forEach((o) => o.destroy()); callback(); });
  }

  resetEncounter() {
    this.board.clearEnemies();
    this.board.clearHighlights();
    this.clearThreatMap();
    this.clearBossBar();

    const kx = Math.floor(this.board.gridSize / 2);
    const ky = this.board.gridSize - 1;
    this.board.generateWalls(this.floor, kx, ky);
    this.board.movePiece(this.king, kx, ky);

    this.isFirstTurnOfRoom = true;
    this.spawnEncounter();
    this.board.renderWalls();
  }

  // Turn hooks 
  onPlayerTurnStart() {
    this.movesRemaining = 1 + this.bonusMoves;
    this.updateMovesUI();

    if (this.isFirstTurnOfRoom) {
      this.isFirstTurnOfRoom = false;
      if (this.bonusStartShield > 0) {
        this.shield += this.bonusStartShield;
        this.updateShieldUI();
      }
    }

    this.energy = this.maxEnergy;
    this.updateEnergyUI();

    this.drawHand(3);
    this.cardSystem.renderHand();
    this.showThreatMap();
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

  //King movement / attack 
  showLegalMovesForKing() {
    this.board.showLegalMovesForKing(this.king, (move) => {
      if (this.isGameOver || this.inReward) return;
      if (!this.isPlayerTurn)               return;
      if (this.movesRemaining <= 0)         return;

      if (move.capture) {
        const killed = this.board.damageAt(move.x, move.y, this.kingAtk, this.king.x, this.king.y);
        this.board.movePiece(this.king, move.x, move.y);
        this.updateEnemyCountUI();
        if (killed) {
          this.checkWaveCleared();
          if (this.inReward || this.isGameOver) return;
        }
      } else {
        this.board.movePiece(this.king, move.x, move.y);
      }

      this.movesRemaining -= 1;
      this.updateMovesUI();

      if (this.movesRemaining <= 0) {
        this.board.clearHighlights();
        this.board.renderWalls();
        return;
      }
      this.showLegalMovesForKing();
    });
  }

  // Threat map (shown during player turn) 
  showThreatMap() {
    this.threatObjects = [];
    const visited = new Set();

    for (const enemy of this.board.enemies) {
      const moves = getEnemyMoves(enemy, this.board);
      for (const m of moves) {
        const k = `${m.x},${m.y}`;
        if (visited.has(k)) continue;
        visited.add(k);
        const { px, py } = this.board.worldPos(m.x, m.y);
        const color = m.attack ? 0xff2200 : 0xff8800;
        const alpha = m.attack ? 0.28 : 0.13;
        const o = this.add.rectangle(px, py, this.tileSize - 8, this.tileSize - 8, color, alpha).setDepth(2);
        this.threatObjects.push(o);
      }
    }
  }

  clearThreatMap() {
    if (this.threatObjects) { this.threatObjects.forEach((o) => o.destroy()); this.threatObjects = []; }
  }

  // Enemy telegraph 
  showEnemyTelegraphs() {
    this.telegraphObjects = [];
    for (const enemy of this.board.enemies) {
      const moves = getEnemyMoves(enemy, this.board);
      const best  = chooseBestMove(moves, this.king);
      if (!best) continue;
      const { px, py } = this.board.worldPos(best.x, best.y);
      const color = best.attack ? 0xff2222 : 0xffcc00;
      const alpha = best.attack ? 0.55    : 0.35;
      const o = this.add.rectangle(px, py, this.tileSize - 6, this.tileSize - 6, color, alpha)
        .setStrokeStyle(2, color).setDepth(5);
      this.telegraphObjects.push(o);
    }
  }

  clearEnemyTelegraphs() {
    if (this.telegraphObjects) { this.telegraphObjects.forEach((o) => o.destroy()); this.telegraphObjects = []; }
  }

  // Enemy turn 
  enemyTurn() {
    const snapshot = [...this.board.enemies];

    for (const enemy of snapshot) {
      if (!this.board.enemies.includes(enemy)) continue;
      if (this.isGameOver) return;

      // Process burning / frozen at start of each enemy's action
      const skipTurn = processStatuses(enemy, this.board);
      if (skipTurn || !this.board.enemies.includes(enemy)) continue;

      const moves = getEnemyMoves(enemy, this.board);
      const best  = chooseBestMove(moves, this.king);
      if (!best) continue;

      if (best.attack) {
        // Check weakened (cancels the attack)
        if (consumeWeakened(enemy)) continue;

        const dmg = enemy.atk ?? 1;
        if (this.shield > 0) {
          this.shield = Math.max(0, this.shield - dmg);
          this.updateShieldUI();
        } else {
          this.king.hp -= dmg;
          this.updateHPUI();
          this.king.sprite.setTint(0xffffff);
          this.time.delayedCall(80, () => {
            if (this.king.sprite?.active) this.king.sprite.clearTint();
          });
          if (this.king.hp <= 0) { this.gameOver(); return; }
        }
      } else {
        if (!this.board.pieces[this.board.key(best.x, best.y)]) {
          this.board.movePiece(enemy, best.x, best.y);
        }
      }
    }

    this.updateEnemyCountUI();
  }

  // Deck viewer 
  toggleDeckViewer() {
    if (this._deckViewerObjs?.length) {
      this._deckViewerObjs.forEach((o) => o.destroy());
      this._deckViewerObjs = [];
      return;
    }

    this._deckViewerObjs = [];
    const RC = { Common: "#ffffff", Uncommon: "#44ff88", Rare: "#4499ff", Epic: "#cc44ff", Legendary: "#ff8800" };

    const bg = this.add.rectangle(450, 300, 900, 600, 0x111111, 0.96).setDepth(180).setInteractive();
    const title = this.add.text(450, 35, `YOUR DECK  (${this.runDeck.length} cards)`, {
      fontSize: "22px", color: "#ffffff",
    }).setOrigin(0.5, 0).setDepth(181);
    this._deckViewerObjs.push(bg, title);

    const seen  = new Set();
    const cards = this.runDeck
      .filter((id) => { if (seen.has(id)) return false; seen.add(id); return true; })
      .map((id) => ({ id, count: this.runDeck.filter((d) => d === id).length }));

    cards.forEach(({ id, count }, i) => {
      const col  = i % 6;
      const row  = Math.floor(i / 6);
      const cx   = 80 + col * 145;
      const cy   = 100 + row * 120;
      const card = CardList.find((c) => c.id === id);
      if (!card) return;

      const hex = parseInt((RC[card.rarity] ?? "#ffffff").replace("#", ""), 16);
      const box   = this.add.rectangle(cx + 62, cy + 50, 138, 108, 0x1e1e1e).setStrokeStyle(2, hex).setDepth(181);
      const nameT = this.add.text(cx + 5, cy,     card.name, { fontSize: "13px", color: RC[card.rarity] ?? "#fff" }).setDepth(182);
      const cntT  = this.add.text(cx + 5, cy + 20, `×${count}`, { fontSize: "11px", color: "#888888" }).setDepth(182);
      const descT = this.add.text(cx + 5, cy + 38, card.desc, { fontSize: "10px", color: "#aaaaaa", wordWrap: { width: 133 } }).setDepth(182);
      this._deckViewerObjs.push(box, nameT, cntT, descT);
    });

    const closeBtn = this.add.rectangle(450, 570, 160, 45, 0x333333).setStrokeStyle(2, 0x888888).setInteractive().setDepth(181);
    const closeLbl = this.add.text(403, 558, "Close", { fontSize: "16px", color: "#aaaaaa" }).setDepth(182);
    closeBtn.on("pointerdown", () => {
      this._deckViewerObjs.forEach((o) => o.destroy());
      this._deckViewerObjs = [];
    });
    this._deckViewerObjs.push(closeBtn, closeLbl);
  }

  // Game Over 
  gameOver() {
    this.isGameOver = true;
    this.inReward   = false;
    this.clearThreatMap();
    this.clearBossBar();

    const bg    = this.add.rectangle(450, 300, 900, 600, 0x000000, 0.85).setDepth(200);
    const title = this.add.text(450, 160, "GAME OVER", { fontSize: "56px", color: "#ff4444" }).setOrigin(0.5, 0).setDepth(201);
    const stats = this.add.text(450, 260,
      `Floor: ${this.floor}   Kills: ${this.killCount}   Gold earned: ${this.gold}g\nDeck size: ${this.runDeck.length} cards`,
      { fontSize: "20px", color: "#cccccc", align: "center" }
    ).setOrigin(0.5, 0).setDepth(201);

    const restartBtn = this.add.rectangle(450, 400, 220, 65, 0x444444).setStrokeStyle(3, 0xffffff).setInteractive().setDepth(201);
    this.add.text(373, 388, "PLAY AGAIN", { fontSize: "22px", color: "#ffffff" }).setDepth(202);
    restartBtn.on("pointerover",  () => restartBtn.setFillStyle(0x666666));
    restartBtn.on("pointerout",   () => restartBtn.setFillStyle(0x444444));
    restartBtn.on("pointerdown",  () => this.scene.restart());

    this.add.existing(bg);
    this.add.existing(title);
    this.add.existing(stats);
  }

  // Gold 
  addGold(amount) {
    this.gold += amount;
    this.updateGoldUI();
  }

  // UI helpers 
  updateHPUI() {
    this.hpText?.setText(`HP  ${this.king.hp} / ${this.king.maxHp}`);
    if (this.hpBarFill) {
      const pct = Math.max(0, this.king.hp / this.king.maxHp);
      // color shifts red-yellow-green as HP increases
      const color = pct > 0.5 ? 0xee3344 : pct > 0.25 ? 0xff8800 : 0xff2222;
      this.hpBarFill.setScale(pct, 1).setFillStyle(color);
    }
  }
  updateShieldUI()     { this.shieldText?.setText(`SHIELD  ${this.shield}`); }
  updateFloorUI()      { this.floorText?.setText(`FLOOR  ${this.floor}`); }
  updateEnemyCountUI() { this.enemyCountText?.setText(`ENEMIES  ${this.board.enemies.length}`); }
  updateGoldUI()       { this.goldText?.setText(`GOLD  ${this.gold}g`); }
  updateTurnUI()       { this.turnText?.setText(`TURN: ${this.turnManager.state}`); }
  updateMovesUI()      { this.movesText?.setText(`MOVES: ${this.movesRemaining}`); }
  updateEnergyUI() {
    this.energyPips?.forEach((pip, i) => {
      pip.setFillStyle(i < this.energy ? 0x3366cc : 0x151525);
    });
  }
  updateKillUI()       { this.killText?.setText(`KILLS  ${this.killCount}`); }
}
