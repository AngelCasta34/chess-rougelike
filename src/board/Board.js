// src/board/Board.js

// Spark color per piece type for death burst
const TYPE_SPARK_COLOR = {
  PAWN:   0xff5555,
  KNIGHT: 0xff8c00,
  BISHOP: 0xddcc00,
  ROOK:   0xaa44ff,
  QUEEN:  0xff44aa,
};

export default class Board {
  constructor(scene, { gridSize = 9, tileSize = 55, origin = { x: 120, y: 80 } } = {}) {
    this.scene = scene;

    this.gridSize = gridSize;
    this.tileSize = tileSize;
    this.origin   = origin;

    this.tiles   = [];
    this.pieces  = {};
    this.walls   = new Set();
    this.enemies = [];

    this.legalMoves = [];
  }

  // helpers 
  key(x, y)     { return `${x},${y}`; }
  inBounds(x,y) { return x >= 0 && x < this.gridSize && y >= 0 && y < this.gridSize; }
  isWall(x, y)  { return this.walls.has(this.key(x, y)); }

  worldPos(x, y) {
    const px = this.origin.x + x * this.tileSize + this.tileSize / 2;
    const py = this.origin.y + y * this.tileSize + this.tileSize / 2;
    return { px, py };
  }

  // tiles 
  createTiles() {
    for (let y = 0; y < this.gridSize; y++) {
      this.tiles[y] = [];
      for (let x = 0; x < this.gridSize; x++) {
        const wx = this.origin.x + x * this.tileSize;
        const wy = this.origin.y + y * this.tileSize;
        const color = (x + y) % 2 === 0 ? 0x232323 : 0x3d3d3d;

        const tile = this.scene.add
          .rectangle(wx, wy, this.tileSize - 4, this.tileSize - 4, color)
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
        const color = (x + y) % 2 === 0 ? 0x232323 : 0x3d3d3d;
        this.tiles[y][x].setFillStyle(color).setStrokeStyle(2, 0x000000);
      }
    }
  }

  renderWalls() {
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        if (this.walls.has(this.key(x, y))) {
          this.tiles[y][x].setFillStyle(0x161010).setStrokeStyle(2, 0x664444);
        }
      }
    }
  }

  // pieces 
  // Generic piece spawn
  spawnPiece(type, x, y) {
    const { px, py } = this.worldPos(x, y);
    const key    = `chess-${type.toLowerCase()}-white`;
    const sprite = this.scene.add.image(px, py, key).setDisplaySize(52, 52);

    const piece = { type, x, y, sprite, label: null };
    this.pieces[this.key(x, y)] = piece;
    return piece;
  }

  // Spawn an enemy with a full stat block from EnemyFactory
  // stats: { type, hp, maxHp, atk, modifier }
  spawnEnemy(stats, x, y) {
    if (!this.inBounds(x, y))          return null;
    if (this.isWall(x, y))             return null;
    if (this.pieces[this.key(x, y)])   return null;

    const { px, py } = this.worldPos(x, y);
    const key    = `chess-${stats.type.toLowerCase()}-black`;
    const sprite = this.scene.add.image(px, py, key).setDisplaySize(52, 52);

    const suffix    = stats.modifier ? stats.modifier.suffix : "";
    const labelText = this.scene.add.text(px, py + 22, `${stats.hp}${suffix}`, {
      fontSize:        "12px",
      color:           "#ffffff",
      align:           "center",
      backgroundColor: "#000000",
      padding:         { x: 3, y: 1 },
    }).setOrigin(0.5, 0.5);

    const enemy = {
      type:     stats.type,
      x, y,
      sprite,
      label:    labelText,
      hp:       stats.hp,
      maxHp:    stats.maxHp,
      atk:      stats.atk,
      modifier: stats.modifier ?? null,
      isEnemy:  true,
    };

    this.pieces[this.key(x, y)] = enemy;
    this.enemies.push(enemy);
    return enemy;
  }

  _refreshEnemyLabel(enemy) {
    const suffix = enemy.modifier ? enemy.modifier.suffix : "";
    enemy.label.setText(`${enemy.hp}${suffix}`);
  }

  movePiece(piece, newX, newY) {
    delete this.pieces[this.key(piece.x, piece.y)];
    piece.x = newX;
    piece.y = newY;
    this.pieces[this.key(newX, newY)] = piece;

    const { px, py } = this.worldPos(newX, newY);

    this.scene.tweens.add({
      targets: piece.sprite,
      x: px, y: py,
      duration: 130,
      ease: "Power2",
    });

    if (piece.isEnemy && piece.label) {
      this.scene.tweens.add({ targets: piece.label, x: px, y: py + 22, duration: 130, ease: "Power2" });
    }
  }

  // Deal dmg to enemy at (x,y) if it survives, push it away from (fromX,fromY)
  // Returns true if enemy was destroyed, false if it survived (and was displaced)
  damageAt(x, y, dmg, fromX, fromY) {
    const target = this.pieces[this.key(x, y)];
    if (!target || !target.isEnemy) return false;

    // Enemy shield absorbs damage first
    if (target.shield > 0) {
      const absorbed = Math.min(target.shield, dmg);
      target.shield -= absorbed;
      dmg -= absorbed;
      if (dmg <= 0) {
        this._spawnFloatingText(target.sprite.x, target.sprite.y - 20, "SHIELD!", "#88ccff", "16px");
        return false;
      }
    }

    target.hp -= dmg;
    this._refreshEnemyLabel(target);

    // Notify scene (boss HP bar, etc.)
    if (this.onEnemyDamaged) this.onEnemyDamaged(target);

    // Flash white on hit + impact ring
    target.sprite.setTint(0xffffff);
    this._spawnImpactRing(target.sprite.x, target.sprite.y);
    this.scene.time.delayedCall(80, () => {
      if (target.sprite?.active) target.sprite.clearTint();
    });

    // Floating damage number
    this._spawnFloatingText(target.sprite.x, target.sprite.y - 20, `-${dmg}`, "#ff4444");

    if (target.hp <= 0) {
      this._destroyEnemy(target);
      return true;
    }

    // Enemy survived displace it
    this._displaceEnemy(target, fromX, fromY);
    return false;
  }

  // Push enemy to an adjacent empty cell
  _displaceEnemy(enemy, fromX, fromY) {
    const ex = enemy.x;
    const ey = enemy.y;

    const candidates = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = ex + dx;
        const ny = ey + dy;
        if (!this.inBounds(nx, ny))         continue;
        if (this.isWall(nx, ny))            continue;
        if (this.pieces[this.key(nx, ny)])  continue;
        // Prefer cells that are farther from the attacker
        const distFromAttacker = Math.abs(nx - fromX) + Math.abs(ny - fromY);
        candidates.push({ x: nx, y: ny, distFromAttacker });
      }
    }

    if (candidates.length === 0) {
      // No adjacent space try any empty cell in top 3 rows 
      for (let ry = 0; ry < 3; ry++) {
        for (let rx = 0; rx < this.gridSize; rx++) {
          if (!this.isWall(rx, ry) && !this.pieces[this.key(rx, ry)]) {
            candidates.push({ x: rx, y: ry, distFromAttacker: 999 });
          }
        }
      }
    }

    if (candidates.length === 0) {
      // Truly nowhere to go enemy is destroyed
      this._destroyEnemy(enemy);
      return;
    }

    // Pick the candidate with greatest distance from attacker 
    candidates.sort((a, b) => b.distFromAttacker - a.distFromAttacker);
    // Randomize among tied candidates
    const best = candidates[0].distFromAttacker;
    const top  = candidates.filter((c) => c.distFromAttacker === best);
    const dest = top[Math.floor(Math.random() * top.length)];

    this.movePiece(enemy, dest.x, dest.y);

    // Brief flash to show displacement
    enemy.sprite.setAlpha(0.5);
    this.scene.time.delayedCall(120, () => {
      if (enemy.sprite && enemy.sprite.active) enemy.sprite.setAlpha(1);
    });
  }

  _destroyEnemy(enemy) {
    this.enemies = this.enemies.filter((e) => e !== enemy);
    delete this.pieces[this.key(enemy.x, enemy.y)];

    if (this.onKillCallback) this.onKillCallback(enemy);

    // Death spark burst
    const sparkColor = enemy.isBoss ? 0xffcc00 : (TYPE_SPARK_COLOR[enemy.type] ?? 0xff5555);
    this._spawnDeathBurst(enemy.sprite.x, enemy.sprite.y, sparkColor, enemy.isBoss ? 18 : 10);

    // Death pop animation
    this.scene.tweens.add({
      targets:  [enemy.sprite, enemy.label],
      scaleX:   0,
      scaleY:   0,
      alpha:    0,
      duration: 180,
      ease:     "Back.easeIn",
      onComplete: () => {
        enemy.sprite.destroy();
        enemy.label.destroy();
      },
    });
  }

  // Burst of colored spark squares on enemy death
  _spawnDeathBurst(wx, wy, color, count = 10) {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.6;
      const dist  = 20 + Math.random() * 38;
      const tx    = wx + Math.cos(angle) * dist;
      const ty    = wy + Math.sin(angle) * dist;
      const size  = 3 + Math.random() * 5;
      const spark = this.scene.add.rectangle(wx, wy, size, size, color).setDepth(56).setAlpha(0.9);
      this.scene.tweens.add({
        targets:  spark,
        x:        tx,
        y:        ty,
        alpha:    0,
        scaleX:   0.1,
        scaleY:   0.1,
        duration: 220 + Math.random() * 220,
        ease:     "Power2",
        onComplete: () => spark.destroy(),
      });
    }
  }

  // Expanding impact ring on hit
  _spawnImpactRing(wx, wy) {
    const ring = this.scene.add.circle(wx, wy, 8, 0xffffff, 0)
      .setStrokeStyle(2.5, 0xffffff).setDepth(57).setAlpha(0.8);
    this.scene.tweens.add({
      targets:  ring,
      scaleX:   3.5,
      scaleY:   3.5,
      alpha:    0,
      duration: 180,
      ease:     "Power2",
      onComplete: () => ring.destroy(),
    });
  }

  // Floating text popup (damage numbers, status msgs, etc.)
  _spawnFloatingText(wx, wy, text, color = "#ff4444", fontSize = "20px") {
    const t = this.scene.add.text(wx, wy, text, {
      fontSize,
      color,
      stroke: "#000000",
      strokeThickness: 3,
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(60);

    this.scene.tweens.add({
      targets: t,
      y: wy - 55,
      alpha: 0,
      duration: 750,
      ease: "Power2",
      onComplete: () => t.destroy(),
    });
  }

  // Instant kill
  captureAt(x, y) {
    const target = this.pieces[this.key(x, y)];
    if (!target || !target.isEnemy) return false;
    this._destroyEnemy(target);
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

  // wall generation 
  generateWalls(floor, kingStartX, kingStartY) {
    this.walls.clear();

    const safeZones = new Set();

    // King's starting zone
    for (let y = kingStartY - 1; y <= kingStartY; y++) {
      for (let x = kingStartX - 1; x <= kingStartX + 1; x++) {
        if (this.inBounds(x, y)) safeZones.add(this.key(x, y));
      }
    }

    // Enemy spawn rows are always clear
    for (let x = 0; x < this.gridSize; x++) {
      safeZones.add(this.key(x, 0));
      safeZones.add(this.key(x, 1));
    }

    const wallCount = Math.min(6 + floor * 2, 22);
    let attempts = 0;

    while (this.walls.size < wallCount && attempts < 500) {
      attempts++;
      const x = Math.floor(Math.random() * this.gridSize);
      const y = Math.floor(Math.random() * this.gridSize);
      const k = this.key(x, y);
      if (safeZones.has(k) || this.pieces[k]) continue;
      this.walls.add(k);
    }

    this.renderWalls();
  }

  //move generation 
  getKingMoves(x, y) {
    const moves = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (!this.inBounds(nx, ny) || this.isWall(nx, ny)) continue;
        const target = this.pieces[this.key(nx, ny)];
        if (!target)           moves.push({ x: nx, y: ny });
        else if (target.isEnemy) moves.push({ x: nx, y: ny, capture: true, enemy: target });
      }
    }
    return moves;
  }

  showLegalMovesForKing(king, onMoveCallback) {
    this.clearHighlights();
    this.renderWalls();
    this.legalMoves = this.getKingMoves(king.x, king.y);

    // green outline for empty, orange for attackable enemies
    for (const m of this.legalMoves) {
      if (m.capture) {
        this.tiles[m.y][m.x].setStrokeStyle(4, 0xff8800); // orange = attackable
      } else {
        this.tiles[m.y][m.x].setStrokeStyle(4, 0x00ff88); // green = move
      }
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
