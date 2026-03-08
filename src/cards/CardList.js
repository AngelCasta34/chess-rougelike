// src/cards/CardList.js
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
];

export default CardList;
