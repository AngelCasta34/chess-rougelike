// src/board/Board.js
import Phaser from "phaser";

export default class Board {
  constructor(scene, { gridSize = 9, tileSize = 55, origin = { x: 120, y: 80 } } = {}) {
    this.scene = scene;

    this.gridSize = gridSize;
    this.tileSize = tileSize;
    this.origin = origin;

    this.tiles = [];
    this.pieces = {};
    this.walls = new Set();
    this.enemies = [];

    this.legalMoves = [];
  }

  //  basic helpers 
  key(x, y) {
    return `${x},${y}`;
  }

  inBounds(x, y) {
    return x >= 0 && x < this.gridSize && y >= 0 && y < this.gridSize;
  }

  worldPos(x, y) {
    const px = this.origin.x + x * this.tileSize + this.tileSize / 2;
    const py = this.origin.y + y * this.tileSize + this.tileSize / 2;
    return { px, py };
  }

  isWall(x, y) {
    return this.walls.has(this.key(x, y));
  }

  //  tiles 
  createTiles() {
    const scene = this.scene;

    for (let y = 0; y < this.gridSize; y++) {
      this.tiles[y] = [];
      for (let x = 0; x < this.gridSize; x++) {
        const worldX = this.origin.x + x * this.tileSize;
        const worldY = this.origin.y + y * this.tileSize;

        const color = (x + y) % 2 === 0 ? 0x2f2f2f : 0x3a3a3a;

        const tile = scene.add
          .rectangle(worldX, worldY, this.tileSize - 4, this.tileSize - 4, color)
          .setOrigin(0)
          .setStrokeStyle(2, 0x000000)
          .setInteractive();

        tile.gridPos = { x, y };
        this.tiles[y][x] = tile;
      }
    }
  }

  clearHighlights() {
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const color = (x + y) % 2 === 0 ? 0x2f2f2f : 0x3a3a3a;
        this.tiles[y][x].setFillStyle(color);
        this.tiles[y][x].setStrokeStyle(2, 0x000000);
      }
    }
  }

  renderWalls() {
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const tile = this.tiles[y][x];
        const k = this.key(x, y);

        if (this.walls.has(k)) {
          tile.setFillStyle(0x1a1a1a);
          tile.setStrokeStyle(2, 0x666666);
        }
      }
    }
  }

  //  pieces 
  spawnPiece(type, x, y, color) {
    const scene = this.scene;
    const { px, py } = this.worldPos(x, y);

    const sprite = scene.add.circle(px, py, 24, color).setStrokeStyle(3, 0x000000);
    const label = scene.add.text(px - 10, py - 12, type[0], {
      fontSize: "20px",
      color: "#000000",
    });

    const piece = { type, x, y, sprite, label };
    this.pieces[this.key(x, y)] = piece;
    return piece;
  }

  spawnEnemy(type, x, y) {
    if (!this.inBounds(x, y)) return null;
    if (this.isWall(x, y)) return null;
    if (this.pieces[this.key(x, y)]) return null;

    const enemy = this.spawnPiece(type, x, y, 0xff5555);
    enemy.isEnemy = true;
    this.enemies.push(enemy);
    return enemy;
  }

  movePiece(piece, newX, newY) {
    delete this.pieces[this.key(piece.x, piece.y)];

    piece.x = newX;
    piece.y = newY;

    this.pieces[this.key(newX, newY)] = piece;

    const { px, py } = this.worldPos(newX, newY);
    piece.sprite.setPosition(px, py);
    piece.label.setPosition(px - 10, py - 12);
  }

  captureAt(x, y) {
    const target = this.pieces[this.key(x, y)];
    if (!target || !target.isEnemy) return false;

    this.enemies = this.enemies.filter((e) => e !== target);
    delete this.pieces[this.key(target.x, target.y)];
    target.sprite.destroy();
    target.label.destroy();
    return true;
  }

  clearEnemies() {
    for (const e of this.enemies) {
      delete this.pieces[this.key(e.x, e.y)];
      e.sprite.destroy();
      e.label.destroy();
    }
    this.enemies = [];
  }

  //  walls generation 
  generateWalls(floor, kingStartX, kingStartY) {
    this.walls.clear();

    const safeZones = new Set();

    // king safe zone
    for (let y = kingStartY - 1; y <= kingStartY; y++) {
      for (let x = kingStartX - 1; x <= kingStartX + 1; x++) {
        if (this.inBounds(x, y)) safeZones.add(this.key(x, y));
      }
    }

    // top safe rows
    for (let x = 0; x < this.gridSize; x++) {
      safeZones.add(this.key(x, 0));
      safeZones.add(this.key(x, 1));
    }

    const wallCount = Math.min(6 + floor * 2, 20);

    let attempts = 0;
    while (this.walls.size < wallCount && attempts < 500) {
      attempts++;
      const x = Math.floor(Math.random() * this.gridSize);
      const y = Math.floor(Math.random() * this.gridSize);
      const k = this.key(x, y);

      if (safeZones.has(k)) continue;
      if (this.pieces[k]) continue;

      this.walls.add(k);
    }

    this.renderWalls();
  }

  //  moves 
  getKingMoves(x, y) {
    const moves = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;

        const nx = x + dx;
        const ny = y + dy;
        if (!this.inBounds(nx, ny)) continue;
        if (this.isWall(nx, ny)) continue;

        const target = this.pieces[this.key(nx, ny)];

        if (!target) moves.push({ x: nx, y: ny });
        else if (target.isEnemy) moves.push({ x: nx, y: ny, capture: true });
      }
    }
    return moves;
  }

  getKnightMoves(x, y) {
    const deltas = [
      { dx: 1, dy: 2 }, { dx: 2, dy: 1 }, { dx: 2, dy: -1 }, { dx: 1, dy: -2 },
      { dx: -1, dy: -2 }, { dx: -2, dy: -1 }, { dx: -2, dy: 1 }, { dx: -1, dy: 2 },
    ];

    const moves = [];
    for (const d of deltas) {
      const nx = x + d.dx;
      const ny = y + d.dy;
      if (!this.inBounds(nx, ny)) continue;
      if (this.isWall(nx, ny)) continue;

      if (!this.pieces[this.key(nx, ny)]) moves.push({ x: nx, y: ny });
    }
    return moves;
  }

  showLegalMovesForKing(king, onMoveCallback) {
    this.clearHighlights();
    this.renderWalls();

    this.legalMoves = this.getKingMoves(king.x, king.y);

    for (const m of this.legalMoves) {
      this.tiles[m.y][m.x].setStrokeStyle(4, 0x00ff88);
    }

    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const tile = this.tiles[y][x];
        tile.removeAllListeners("pointerdown");

        tile.on("pointerdown", () => {
          const move = this.legalMoves.find((p) => p.x === x && p.y === y);
          if (!move) return;
          if (onMoveCallback) onMoveCallback(move);
        });
      }
    }
  }
}