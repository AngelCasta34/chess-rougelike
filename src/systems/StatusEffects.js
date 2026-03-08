export const STATUS = {
  BURNING:  "burning",
  FROZEN:   "frozen",
  WEAKENED: "weakened",
};

// Apply a status to an enemy 
export function applyStatus(enemy, id, duration) {
  if (!enemy.statuses) enemy.statuses = {};
  enemy.statuses[id] = Math.min((enemy.statuses[id] ?? 0) + duration, 10);
  refreshStatusVisuals(enemy);
}

export function hasStatus(enemy, id) {
  return (enemy.statuses?.[id] ?? 0) > 0;
}

// Process statuses at the start of an enemy's turn.
// Returns true if the enemy is dead or should skip their move.
export function processStatuses(enemy, board) {
  if (!enemy.statuses) return false;
  const s = enemy.statuses;

  // BURNING: deal 1 damage
  if ((s[STATUS.BURNING] ?? 0) > 0) {
    s[STATUS.BURNING]--;
    enemy.hp -= 1;
    board._refreshEnemyLabel(enemy);

    // Flash orange
    enemy.sprite?.setFillStyle(0xff8800);
    board.scene.time.delayedCall(80, () => {
      if (enemy.sprite?.active) enemy.sprite.setFillStyle(enemy.sprite._baseColor);
    });

    if (enemy.hp <= 0) {
      board._destroyEnemy(enemy);
      return true; // dead
    }
  }

  // FROZEN
  if ((s[STATUS.FROZEN] ?? 0) > 0) {
    s[STATUS.FROZEN]--;
    refreshStatusVisuals(enemy);
    return true;
  }

  refreshStatusVisuals(enemy);
  return false;
}

// Call before an enemy attacks
export function consumeWeakened(enemy) {
  if ((enemy.statuses?.[STATUS.WEAKENED] ?? 0) > 0) {
    enemy.statuses[STATUS.WEAKENED]--;
    refreshStatusVisuals(enemy);
    return true;
  }
  return false;
}

// Update sprite border color to reflect active statuses
export function refreshStatusVisuals(enemy) {
  if (!enemy.sprite?.active) return;
  const s = enemy.statuses ?? {};
  if ((s[STATUS.FROZEN]   ?? 0) > 0) enemy.sprite.setStrokeStyle(4, 0x44ddff);
  else if ((s[STATUS.BURNING]  ?? 0) > 0) enemy.sprite.setStrokeStyle(4, 0xff6600);
  else if ((s[STATUS.WEAKENED] ?? 0) > 0) enemy.sprite.setStrokeStyle(4, 0xdddd00);
  else enemy.sprite.setStrokeStyle(3, 0x000000);
}
