import { applyStatus, STATUS } from "../systems/StatusEffects.js";

//helpers used by card apply() functions 
function nearestEnemy(scene) {
  let best = null, bestDist = Infinity;
  for (const e of scene.board.enemies) {
    const d = Math.abs(e.x - scene.king.x) + Math.abs(e.y - scene.king.y);
    if (d < bestDist) { bestDist = d; best = e; }
  }
  return best;
}

const CardList = [

  // MOVEMENT
  {
    id: "dash",
    name: "Dash",
    rarity: "Common",
    cost: 1,
    tags: ["movement"],
    desc: "+1 move this turn.",
    apply(scene) {
      scene.movesRemaining += 1;
      scene.updateMovesUI();
    },
  },

  {
    id: "double_dash",
    name: "Double Dash",
    rarity: "Uncommon",
    cost: 2,
    tags: ["movement"],
    desc: "+2 moves this turn.",
    apply(scene) {
      scene.movesRemaining += 2;
      scene.updateMovesUI();
    },
  },

  {
    id: "blitz",
    name: "Blitz",
    rarity: "Rare",
    cost: 2,
    tags: ["movement"],
    desc: "+3 moves this turn.",
    apply(scene) {
      scene.movesRemaining += 3;
      scene.updateMovesUI();
    },
  },

  // DEFENSE
  {
    id: "shield",
    name: "Shield",
    rarity: "Common",
    cost: 1,
    tags: ["defense"],
    desc: "Block the next hit.",
    apply(scene) {
      scene.shield += 1;
      scene.updateShieldUI();
    },
  },

  {
    id: "heal",
    name: "Heal",
    rarity: "Uncommon",
    cost: 2,
    tags: ["defense"],
    desc: "+1 HP (max 10).",
    apply(scene) {
      scene.king.hp = Math.min(scene.king.hp + 1, scene.king.maxHp ?? 10);
      scene.updateHPUI();
    },
  },

  {
    id: "fortify",
    name: "Fortify",
    rarity: "Rare",
    cost: 2,
    tags: ["defense"],
    desc: "+2 Shield.",
    apply(scene) {
      scene.shield += 2;
      scene.updateShieldUI();
    },
  },

  {
    id: "panic_step",
    name: "Panic Step",
    rarity: "Epic",
    cost: 1,
    tags: ["movement", "defense"],
    desc: "+1 move and +1 shield.",
    apply(scene) {
      scene.movesRemaining += 1;
      scene.shield += 1;
      scene.updateMovesUI();
      scene.updateShieldUI();
    },
  },

  {
    id: "second_wind",
    name: "Second Wind",
    rarity: "Epic",
    cost: 2,
    tags: ["movement", "defense"],
    desc: "Heal 1 and +1 move.",
    apply(scene) {
      scene.king.hp = Math.min(scene.king.hp + 1, scene.king.maxHp ?? 10);
      scene.movesRemaining += 1;
      scene.updateHPUI();
      scene.updateMovesUI();
    },
  },

  {
    id: "legend_guard",
    name: "Legend Guard",
    rarity: "Legendary",
    cost: 2,
    tags: ["defense"],
    desc: "+3 Shield.",
    apply(scene) {
      scene.shield += 3;
      scene.updateShieldUI();
    },
  },

  // UTILITY
  {
    id: "energy_up",
    name: "Energy Up",
    rarity: "Rare",
    cost: 0,
    tags: ["utility"],
    desc: "+1 max energy this fight.",
    apply(scene) {
      scene.maxEnergy += 1;
      scene.energy   += 1;
      scene.updateEnergyUI();
    },
  },

  // OFFENSE 
  {
    id: "smite",
    name: "Smite",
    rarity: "Common",
    cost: 1,
    tags: ["offense"],
    desc: "Deal 2 damage to the nearest enemy.",
    apply(scene) {
      const e = nearestEnemy(scene);
      if (e) scene.board.damageAt(e.x, e.y, 2, scene.king.x, scene.king.y);
      scene.updateEnemyCountUI();
      scene.checkWaveCleared();
    },
  },

  {
    id: "push",
    name: "Push",
    rarity: "Common",
    cost: 1,
    tags: ["offense", "movement"],
    desc: "Knock all adjacent enemies 3 tiles away.",
    apply(scene) {
      const king = scene.king;
      const adj  = scene.board.enemies.filter(
        (e) => Math.abs(e.x - king.x) <= 1 && Math.abs(e.y - king.y) <= 1
      );
      for (const enemy of [...adj]) {
        // Direction away from king 
        const dx = Math.sign(enemy.x - king.x) || (Math.random() < 0.5 ? -1 : 1);
        const dy = Math.sign(enemy.y - king.y) || (Math.random() < 0.5 ? -1 : 1);
        let nx = enemy.x, ny = enemy.y;
        for (let i = 0; i < 3; i++) {
          const tx = nx + dx, ty = ny + dy;
          if (!scene.board.inBounds(tx, ty) || scene.board.isWall(tx, ty)) break;
          const occ = scene.board.pieces[scene.board.key(tx, ty)];
          if (occ && occ !== enemy) break;
          nx = tx; ny = ty;
        }
        if (nx !== enemy.x || ny !== enemy.y) scene.board.movePiece(enemy, nx, ny);
      }
    },
  },

  {
    id: "shockwave",
    name: "Shockwave",
    rarity: "Rare",
    cost: 2,
    tags: ["offense"],
    desc: "Deal 1 damage to all enemies within 3 tiles.",
    apply(scene) {
      const king    = scene.king;
      const inRange = [...scene.board.enemies].filter(
        (e) => Math.abs(e.x - king.x) + Math.abs(e.y - king.y) <= 3
      );
      for (const e of inRange) scene.board.damageAt(e.x, e.y, 1, king.x, king.y);
      scene.updateEnemyCountUI();
      scene.checkWaveCleared();
    },
  },

  {
    id: "volley",
    name: "Volley",
    rarity: "Uncommon",
    cost: 2,
    tags: ["offense"],
    desc: "Deal 1 damage to every enemy.",
    apply(scene) {
      for (const e of [...scene.board.enemies])
        scene.board.damageAt(e.x, e.y, 1, scene.king.x, scene.king.y);
      scene.updateEnemyCountUI();
      scene.checkWaveCleared();
    },
  },

  {
    id: "execute",
    name: "Execute",
    rarity: "Epic",
    cost: 2,
    tags: ["offense"],
    desc: "Destroy all enemies at 1 HP.",
    apply(scene) {
      const doomed = scene.board.enemies.filter((e) => e.hp <= 1);
      for (const e of doomed) scene.board.captureAt(e.x, e.y);
      scene.updateEnemyCountUI();
      scene.checkWaveCleared();
    },
  },

  {
    id: "crown_strike",
    name: "Crown Strike",
    rarity: "Uncommon",
    cost: 2,
    tags: ["offense", "movement"],
    desc: "+1 move. Deal 2 damage to nearest enemy.",
    apply(scene) {
      scene.movesRemaining += 1;
      scene.updateMovesUI();
      const e = nearestEnemy(scene);
      if (e) scene.board.damageAt(e.x, e.y, 2, scene.king.x, scene.king.y);
      scene.updateEnemyCountUI();
      scene.checkWaveCleared();
    },
  },

  {
    id: "rampage",
    name: "Rampage",
    rarity: "Epic",
    cost: 3,
    tags: ["offense", "movement"],
    desc: "+2 moves. Deal 1 dmg to all enemies within 2 tiles.",
    apply(scene) {
      scene.movesRemaining += 2;
      scene.updateMovesUI();
      const king = scene.king;
      const near = [...scene.board.enemies].filter(
        (e) => Math.abs(e.x - king.x) + Math.abs(e.y - king.y) <= 2
      );
      for (const e of near) scene.board.damageAt(e.x, e.y, 1, king.x, king.y);
      scene.updateEnemyCountUI();
      scene.checkWaveCleared();
    },
  },

  {
    id: "snipe",
    name: "Snipe",
    rarity: "Rare",
    cost: 2,
    tags: ["offense"],
    desc: "Deal 4 damage to the nearest enemy.",
    apply(scene) {
      const e = nearestEnemy(scene);
      if (e) scene.board.damageAt(e.x, e.y, 4, scene.king.x, scene.king.y);
      scene.updateEnemyCountUI();
      scene.checkWaveCleared();
    },
  },

  // PERMANENT UPGRADES  
  {
    id: "fortified_soul",
    name: "Fortified Soul",
    rarity: "Rare",
    cost: 0,
    permanent: true,
    tags: ["defense", "permanent"],
    desc: "PERM: +1 max HP.",
    apply(scene) {
      scene.king.maxHp = (scene.king.maxHp ?? 5) + 1;
      scene.king.hp   += 1;
      scene.updateHPUI();
    },
  },

  {
    id: "swift_crown",
    name: "Swift Crown",
    rarity: "Uncommon",
    cost: 0,
    permanent: true,
    tags: ["movement", "permanent"],
    desc: "PERM: +1 move per turn.",
    apply(scene) {
      scene.bonusMoves = (scene.bonusMoves ?? 0) + 1;
    },
  },

  {
    id: "iron_will",
    name: "Iron Will",
    rarity: "Epic",
    cost: 0,
    permanent: true,
    tags: ["defense", "permanent"],
    desc: "PERM: Start each room with +2 shield.",
    apply(scene) {
      scene.bonusStartShield = (scene.bonusStartShield ?? 0) + 2;
      scene.shield += 2;
      scene.updateShieldUI();
    },
  },

  {
    id: "arcane_heart",
    name: "Arcane Heart",
    rarity: "Legendary",
    cost: 0,
    permanent: true,
    tags: ["utility", "permanent"],
    desc: "PERM: +1 max energy.",
    apply(scene) {
      scene.maxEnergy += 1;
      scene.energy   += 1;
      scene.updateEnergyUI();
    },
  },

  {
    id: "warbound",
    name: "Warbound",
    rarity: "Legendary",
    cost: 0,
    permanent: true,
    tags: ["offense", "permanent"],
    desc: "PERM: King deals +1 damage when capturing.",
    apply(scene) {
      scene.kingAtk = (scene.kingAtk ?? 1) + 1;
    },
  },

  // STATUS EFFECTS
  {
    id: "ignite",
    name: "Ignite",
    rarity: "Uncommon",
    cost: 1,
    tags: ["offense", "status"],
    desc: "Apply Burning(3) to the nearest enemy. Burns 1 HP/turn.",
    apply(scene) {
      const e = nearestEnemy(scene);
      if (e) applyStatus(e, STATUS.BURNING, 3);
    },
  },

  {
    id: "freeze",
    name: "Freeze",
    rarity: "Rare",
    cost: 2,
    tags: ["offense", "status"],
    desc: "Apply Frozen(2) to the nearest enemy. Skips their turns.",
    apply(scene) {
      const e = nearestEnemy(scene);
      if (e) applyStatus(e, STATUS.FROZEN, 2);
    },
  },

  {
    id: "weaken",
    name: "Weaken",
    rarity: "Common",
    cost: 1,
    tags: ["offense", "status"],
    desc: "Apply Weakened(2) to the nearest enemy. Cancels attacks.",
    apply(scene) {
      const e = nearestEnemy(scene);
      if (e) applyStatus(e, STATUS.WEAKENED, 2);
    },
  },

  {
    id: "inferno",
    name: "Inferno",
    rarity: "Epic",
    cost: 3,
    tags: ["offense", "status"],
    desc: "Apply Burning(3) to ALL enemies.",
    apply(scene) {
      for (const e of scene.board.enemies) applyStatus(e, STATUS.BURNING, 3);
    },
  },

  {
    id: "blizzard",
    name: "Blizzard",
    rarity: "Legendary",
    cost: 3,
    tags: ["offense", "status"],
    desc: "Apply Frozen(2) to ALL enemies.",
    apply(scene) {
      for (const e of scene.board.enemies) applyStatus(e, STATUS.FROZEN, 2);
    },
  },

  {
    id: "curse",
    name: "Curse",
    rarity: "Uncommon",
    cost: 1,
    tags: ["offense", "status"],
    desc: "Apply Weakened(3) to ALL adjacent enemies.",
    apply(scene) {
      const king = scene.king;
      for (const e of scene.board.enemies) {
        if (Math.abs(e.x - king.x) <= 1 && Math.abs(e.y - king.y) <= 1)
          applyStatus(e, STATUS.WEAKENED, 3);
      }
    },
  },

  // MOVEMENT
  {
    id: "teleport",
    name: "Teleport",
    rarity: "Rare",
    cost: 2,
    tags: ["movement"],
    desc: "Swap positions with the nearest enemy.",
    apply(scene) {
      const e = nearestEnemy(scene);
      if (!e) return;
      const kx = scene.king.x, ky = scene.king.y;
      const ex = e.x, ey = e.y;
      // Move king to enemy's old spot, enemy to king's old spot
      scene.board.movePiece(scene.king, ex, ey);
      scene.board.movePiece(e, kx, ky);
    },
  },

  {
    id: "scatter",
    name: "Scatter",
    rarity: "Uncommon",
    cost: 2,
    tags: ["movement", "offense"],
    desc: "Push ALL enemies 3 tiles away from you.",
    apply(scene) {
      const king = scene.king;
      for (const enemy of [...scene.board.enemies]) {
        const dx = Math.sign(enemy.x - king.x) || (Math.random() < 0.5 ? -1 : 1);
        const dy = Math.sign(enemy.y - king.y) || (Math.random() < 0.5 ? -1 : 1);
        let nx = enemy.x, ny = enemy.y;
        for (let i = 0; i < 3; i++) {
          const tx = nx + dx, ty = ny + dy;
          if (!scene.board.inBounds(tx, ty) || scene.board.isWall(tx, ty)) break;
          const occ = scene.board.pieces[scene.board.key(tx, ty)];
          if (occ && occ !== enemy) break;
          nx = tx; ny = ty;
        }
        if (nx !== enemy.x || ny !== enemy.y) scene.board.movePiece(enemy, nx, ny);
      }
    },
  },

  // OFFENSE
  {
    id: "battle_cry",
    name: "Battle Cry",
    rarity: "Uncommon",
    cost: 1,
    tags: ["offense"],
    desc: "Deal 1 damage to all enemies in the king's row and column.",
    apply(scene) {
      const king = scene.king;
      const targets = [...scene.board.enemies].filter(
        (e) => e.x === king.x || e.y === king.y
      );
      for (const e of targets) scene.board.damageAt(e.x, e.y, 1, king.x, king.y);
      scene.updateEnemyCountUI();
      scene.checkWaveCleared();
    },
  },

  {
    id: "shatter",
    name: "Shatter",
    rarity: "Rare",
    cost: 2,
    tags: ["offense", "status"],
    desc: "Deal 2 damage to nearest enemy and Freeze them.",
    apply(scene) {
      const e = nearestEnemy(scene);
      if (!e) return;
      scene.board.damageAt(e.x, e.y, 2, scene.king.x, scene.king.y);
      if (scene.board.enemies.includes(e)) applyStatus(e, STATUS.FROZEN, 2);
      scene.updateEnemyCountUI();
      scene.checkWaveCleared();
    },
  },

  {
    id: "chain_lightning",
    name: "Chain Lightning",
    rarity: "Epic",
    cost: 3,
    tags: ["offense"],
    desc: "Hit the 3 nearest enemies for 3, 2, and 1 damage.",
    apply(scene) {
      const sorted = [...scene.board.enemies].sort((a, b) => {
        const da = Math.abs(a.x - scene.king.x) + Math.abs(a.y - scene.king.y);
        const db = Math.abs(b.x - scene.king.x) + Math.abs(b.y - scene.king.y);
        return da - db;
      });
      const dmgs = [3, 2, 1];
      for (let i = 0; i < Math.min(3, sorted.length); i++) {
        const e = sorted[i];
        if (scene.board.enemies.includes(e))
          scene.board.damageAt(e.x, e.y, dmgs[i], scene.king.x, scene.king.y);
      }
      scene.updateEnemyCountUI();
      scene.checkWaveCleared();
    },
  },

  {
    id: "backstab",
    name: "Backstab",
    rarity: "Uncommon",
    cost: 2,
    tags: ["offense"],
    desc: "Deal 4 damage to the farthest enemy.",
    apply(scene) {
      let farthest = null, maxDist = -1;
      for (const e of scene.board.enemies) {
        const d = Math.abs(e.x - scene.king.x) + Math.abs(e.y - scene.king.y);
        if (d > maxDist) { maxDist = d; farthest = e; }
      }
      if (farthest) scene.board.damageAt(farthest.x, farthest.y, 4, scene.king.x, scene.king.y);
      scene.updateEnemyCountUI();
      scene.checkWaveCleared();
    },
  },

  {
    id: "burnout",
    name: "Burnout",
    rarity: "Legendary",
    cost: 0,
    tags: ["offense"],
    desc: "Deal damage = current energy to ALL enemies. Lose all energy.",
    apply(scene) {
      const dmg = scene.energy;
      for (const e of [...scene.board.enemies])
        scene.board.damageAt(e.x, e.y, dmg, scene.king.x, scene.king.y);
      scene.energy = 0;
      scene.updateEnergyUI();
      scene.updateEnemyCountUI();
      scene.checkWaveCleared();
    },
  },

  {
    id: "mass_weaken",
    name: "Mass Weaken",
    rarity: "Rare",
    cost: 2,
    tags: ["offense", "status"],
    desc: "Apply Weakened(2) to ALL enemies.",
    apply(scene) {
      for (const e of scene.board.enemies) applyStatus(e, STATUS.WEAKENED, 2);
    },
  },

  // DEFENSE / UTILITY
  {
    id: "holy_ground",
    name: "Holy Ground",
    rarity: "Uncommon",
    cost: 2,
    tags: ["defense"],
    desc: "Heal 2 HP and gain 1 shield.",
    apply(scene) {
      scene.king.hp = Math.min(scene.king.hp + 2, scene.king.maxHp ?? 10);
      scene.shield += 1;
      scene.updateHPUI();
      scene.updateShieldUI();
    },
  },

  {
    id: "reclaim",
    name: "Reclaim",
    rarity: "Common",
    cost: 0,
    tags: ["utility"],
    desc: "Gain 2 energy.",
    apply(scene) {
      scene.energy = Math.min(scene.energy + 2, scene.maxEnergy);
      scene.updateEnergyUI();
    },
  },

  {
    id: "parry",
    name: "Parry",
    rarity: "Common",
    cost: 1,
    tags: ["defense", "movement"],
    desc: "+1 move and +2 shield.",
    apply(scene) {
      scene.movesRemaining += 1;
      scene.shield += 2;
      scene.updateMovesUI();
      scene.updateShieldUI();
    },
  },

  // PERMANENT UPGRADES 
  {
    id: "predator",
    name: "Predator",
    rarity: "Epic",
    cost: 0,
    permanent: true,
    tags: ["offense", "permanent"],
    desc: "PERM: Killing an enemy heals 1 HP.",
    apply(scene) {
      // Patch the kill callback to also heal
      const prev = scene.board.onKillCallback;
      scene.board.onKillCallback = (enemy) => {
        if (prev) prev(enemy);
        scene.king.hp = Math.min(scene.king.hp + 1, scene.king.maxHp ?? 10);
        scene.updateHPUI();
        const { px, py } = scene.board.worldPos(scene.king.x, scene.king.y);
        scene.spawnFloatingText(px, py - 40, "+1 HP", "#44ff88", "16px");
      };
    },
  },

  {
    id: "glass_cannon",
    name: "Glass Cannon",
    rarity: "Legendary",
    cost: 0,
    permanent: true,
    tags: ["offense", "permanent"],
    desc: "PERM: King deals +2 damage but loses 1 max HP.",
    apply(scene) {
      scene.kingAtk = (scene.kingAtk ?? 1) + 2;
      scene.king.maxHp = Math.max(1, (scene.king.maxHp ?? 5) - 1);
      scene.king.hp    = Math.min(scene.king.hp, scene.king.maxHp);
      scene.updateHPUI();
    },
  },

  //DRAW/HAND MECHANICS 

  {
    id: "study",
    name: "Study",
    rarity: "Common",
    cost: 1,
    tags: ["utility"],
    desc: "Draw 2 more cards.",
    apply(scene) {
      for (let i = 0; i < 2; i++) {
        scene.resetDrawPileIfNeeded();
        if (scene.drawPile.length > 0) scene.hand.push(scene.drawPile.pop());
      }
      scene.cardSystem.renderHand();
      scene.updateDeckPanel?.();
    },
  },

  {
    id: "meditate",
    name: "Meditate",
    rarity: "Uncommon",
    cost: 2,
    tags: ["utility"],
    desc: "Discard your hand. Draw 5 fresh cards.",
    apply(scene) {
      // Discard everything currently in hand 
      const others = [...scene.hand];
      scene.hand.length = 0;
      for (const id of others) scene.discardPile.push(id);
      for (let i = 0; i < 5; i++) {
        scene.resetDrawPileIfNeeded();
        if (scene.drawPile.length > 0) scene.hand.push(scene.drawPile.pop());
      }
      scene._handScrollOffset = 0;
      scene.cardSystem.renderHand();
      scene.updateDeckPanel?.();
    },
  },

  {
    id: "scry",
    name: "Scry",
    rarity: "Rare",
    cost: 1,
    tags: ["utility"],
    desc: "Draw 3 cards. Gain 1 energy.",
    apply(scene) {
      for (let i = 0; i < 3; i++) {
        scene.resetDrawPileIfNeeded();
        if (scene.drawPile.length > 0) scene.hand.push(scene.drawPile.pop());
      }
      scene.energy = Math.min(scene.energy + 1, scene.maxEnergy);
      scene.updateEnergyUI();
      scene.cardSystem.renderHand();
      scene.updateDeckPanel?.();
    },
  },

  // HIGH-RISK 

  {
    id: "gambit",
    name: "Gambit",
    rarity: "Rare",
    cost: 0,
    tags: ["utility"],
    desc: "Lose 1 HP. Gain 3 energy.",
    apply(scene) {
      scene.king.hp = Math.max(1, scene.king.hp - 1);
      scene.updateHPUI();
      scene.energy = Math.min(scene.energy + 3, scene.maxEnergy);
      scene.updateEnergyUI();
      const { px, py } = scene.board.worldPos(scene.king.x, scene.king.y);
      scene.spawnFloatingText(px, py - 20, "+3 ENERGY", "#88aaff", "18px");
    },
  },

  {
    id: "emergency",
    name: "Emergency",
    rarity: "Epic",
    cost: 0,
    tags: ["defense"],
    desc: "Gain shield = your missing HP.",
    apply(scene) {
      const missing = (scene.king.maxHp ?? 10) - scene.king.hp;
      const gain = Math.max(1, missing);
      scene.shield += gain;
      scene.updateShieldUI();
      const { px, py } = scene.board.worldPos(scene.king.x, scene.king.y);
      scene.spawnFloatingText(px, py - 20, `+${gain} SHIELD`, "#88aaff", "20px");
    },
  },

  //SHIELD SYNERGY 

  {
    id: "iron_skin",
    name: "Iron Skin",
    rarity: "Uncommon",
    cost: 1,
    tags: ["defense"],
    desc: "Gain shield = number of enemies (min 2).",
    apply(scene) {
      const gain = Math.max(2, scene.board.enemies.length);
      scene.shield += gain;
      scene.updateShieldUI();
      const { px, py } = scene.board.worldPos(scene.king.x, scene.king.y);
      scene.spawnFloatingText(px, py - 20, `+${gain} SHIELD`, "#88aaff", "18px");
    },
  },

  {
    id: "mend",
    name: "Mend",
    rarity: "Uncommon",
    cost: 1,
    tags: ["defense"],
    desc: "Heal HP = current shield (min 1, max 4).",
    apply(scene) {
      const heal = Math.max(1, Math.min(scene.shield, 4));
      scene.king.hp = Math.min(scene.king.hp + heal, scene.king.maxHp ?? 10);
      scene.updateHPUI();
      const { px, py } = scene.board.worldPos(scene.king.x, scene.king.y);
      scene.spawnFloatingText(px, py - 20, `+${heal} HP`, "#44ff88", "20px");
    },
  },

  {
    id: "shield_bash",
    name: "Shield Bash",
    rarity: "Uncommon",
    cost: 1,
    tags: ["offense", "defense"],
    desc: "Deal dmg = current shield to nearest enemy (min 1).",
    apply(scene) {
      const dmg = Math.max(1, scene.shield);
      const e = nearestEnemy(scene);
      if (e) {
        scene.board.damageAt(e.x, e.y, dmg, scene.king.x, scene.king.y);
        scene.updateEnemyCountUI();
        scene.checkWaveCleared();
      }
    },
  },

  {
    id: "cleave",
    name: "Cleave",
    rarity: "Common",
    cost: 1,
    tags: ["offense"],
    desc: "Deal 2 damage to all enemies adjacent to the king.",
    apply(scene) {
      const king = scene.king;
      const adj = [...scene.board.enemies].filter(
        (e) => Math.abs(e.x - king.x) <= 1 && Math.abs(e.y - king.y) <= 1
      );
      for (const e of adj) scene.board.damageAt(e.x, e.y, 2, king.x, king.y);
      scene.updateEnemyCountUI();
      scene.checkWaveCleared();
    },
  },

  {
    id: "vengeance",
    name: "Vengeance",
    rarity: "Rare",
    cost: 1,
    tags: ["offense"],
    desc: "Hit nearest enemy for dmg = enemy count on board.",
    apply(scene) {
      const dmg = Math.max(1, scene.board.enemies.length);
      const e = nearestEnemy(scene);
      if (e) {
        scene.board.damageAt(e.x, e.y, dmg, scene.king.x, scene.king.y);
        scene.updateEnemyCountUI();
        scene.checkWaveCleared();
      }
    },
  },

  {
    id: "overload",
    name: "Overload",
    rarity: "Epic",
    cost: 2,
    tags: ["offense", "status"],
    desc: "Deal 2 damage to ALL enemies. Survivors are Burned(2).",
    apply(scene) {
      for (const e of [...scene.board.enemies]) {
        const killed = scene.board.damageAt(e.x, e.y, 2, scene.king.x, scene.king.y);
        if (!killed && scene.board.enemies.includes(e)) applyStatus(e, STATUS.BURNING, 2);
      }
      scene.updateEnemyCountUI();
      scene.checkWaveCleared();
    },
  },

  {
    id: "plague",
    name: "Plague",
    rarity: "Rare",
    cost: 2,
    tags: ["offense", "status"],
    desc: "Apply Burn(3) to all enemies within 4 tiles.",
    apply(scene) {
      const king = scene.king;
      for (const e of scene.board.enemies) {
        if (Math.abs(e.x - king.x) + Math.abs(e.y - king.y) <= 4)
          applyStatus(e, STATUS.BURNING, 3);
      }
      const { px, py } = scene.board.worldPos(king.x, king.y);
      scene.spawnFloatingText(px, py - 30, "PLAGUE!", "#ff8844", "22px");
    },
  },

  {
    id: "time_stop",
    name: "Time Stop",
    rarity: "Legendary",
    cost: 3,
    tags: ["offense", "status"],
    desc: "Freeze ALL enemies for 2 turns.",
    apply(scene) {
      for (const e of scene.board.enemies) applyStatus(e, STATUS.FROZEN, 2);
      scene.cameras.main.shake(200, 0.01);
      const { px, py } = scene.board.worldPos(scene.king.x, scene.king.y);
      scene.spawnFloatingText(px, py - 30, "TIME STOP!", "#aaddff", "24px");
    },
  },

  //UTILITY 

  {
    id: "gold_rush",
    name: "Gold Rush",
    rarity: "Common",
    cost: 1,
    tags: ["utility"],
    desc: "Gain 20 gold.",
    apply(scene) {
      scene.addGold(20);
    },
  },

  //PERMANENT

  {
    id: "resilient",
    name: "Resilient",
    rarity: "Rare",
    cost: 0,
    permanent: true,
    tags: ["defense", "permanent"],
    desc: "PERM: +2 max HP.",
    apply(scene) {
      scene.king.maxHp = (scene.king.maxHp ?? 5) + 2;
      scene.king.hp   += 2;
      scene.updateHPUI();
    },
  },

  {
    id: "bloodthirst",
    name: "Bloodthirst",
    rarity: "Epic",
    cost: 0,
    permanent: true,
    tags: ["offense", "permanent"],
    desc: "PERM: Killing an enemy restores 1 energy.",
    apply(scene) {
      const prev = scene.board.onKillCallback;
      scene.board.onKillCallback = (enemy) => {
        if (prev) prev(enemy);
        scene.energy = Math.min(scene.energy + 1, scene.maxEnergy);
        scene.updateEnergyUI();
        const { px, py } = scene.board.worldPos(scene.king.x, scene.king.y);
        scene.spawnFloatingText(px, py - 30, "+1 ENERGY", "#88aaff", "15px");
      };
    },
  },

  {
    id: "momentum",
    name: "Momentum",
    rarity: "Legendary",
    cost: 0,
    permanent: true,
    tags: ["movement", "permanent"],
    desc: "PERM: +2 moves per turn. Lose 1 max energy.",
    apply(scene) {
      scene.bonusMoves = (scene.bonusMoves ?? 0) + 2;
      scene.maxEnergy = Math.max(1, scene.maxEnergy - 1);
      scene.energy   = Math.min(scene.energy, scene.maxEnergy);
      scene.updateEnergyUI();
    },
  },
];

export default CardList;
