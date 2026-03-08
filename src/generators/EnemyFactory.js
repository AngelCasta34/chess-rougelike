// EnemyFactory.js/generative enemy stat system

const PIECE_DEFS = {
  PAWN:   { cost: 1, baseHp: 1, baseAtk: 1, color: 0xff5555 },
  KNIGHT: { cost: 2, baseHp: 2, baseAtk: 1, color: 0xff8c00 },
  BISHOP: { cost: 2, baseHp: 2, baseAtk: 1, color: 0xddcc00 },
  ROOK:   { cost: 3, baseHp: 3, baseAtk: 2, color: 0xaa44ff },
  QUEEN:  { cost: 5, baseHp: 4, baseAtk: 2, color: 0xff44aa },
};

// Stat modifiers applied to individual enemies
const MODIFIERS = [
  { id: "armored",  suffix: "+", hpBonus: 2,  atkBonus: 0 },
  { id: "vicious",  suffix: "!", hpBonus: 0,  atkBonus: 1 },
  { id: "elite",    suffix: "*", hpBonus: 2,  atkBonus: 1 },
  { id: "frail",    suffix: "-", hpBonus: -1, atkBonus: 0 }, // occasionally spawns weaker enemies for variety
];

// Piece types available at each floor tier
function getAvailableTypes(floor) {
  const types = ["PAWN"];
  if (floor >= 2) types.push("KNIGHT");
  if (floor >= 3) types.push("BISHOP");
  if (floor >= 4) types.push("ROOK");
  if (floor >= 6) types.push("QUEEN");
  return types;
}

// Build a single enemy stat block for a given type and floor
export function buildEnemy(type, floor) {
  const def = PIECE_DEFS[type];

  // HP scales up every 3 floors, with 30% chance for +1 variance
  const hpScale = Math.floor(floor / 3);
  let hp  = def.baseHp + hpScale + (Math.random() < 0.3 ? 1 : 0);
  let atk = def.baseAtk + (floor >= 5 && Math.random() < 0.35 ? 1 : 0);

  // Modifier chance grows with floor
  let mod = null;
  const modChance = Math.min(0.1 + floor * 0.05, 0.55);
  if (Math.random() < modChance) {
    mod = MODIFIERS[Math.floor(Math.random() * MODIFIERS.length)];
    hp  += mod.hpBonus;
    atk += mod.atkBonus;
  }

  const finalHp  = Math.max(1, hp);
  const finalAtk = Math.max(1, atk);
  
  const letter = type === "KNIGHT" ? "N" : type[0];
  const label  = letter + (mod ? mod.suffix : "");

  return {
    type,
    hp:       finalHp,
    maxHp:    finalHp,
    atk:      finalAtk,
    modifier: mod,
    color:    def.color,
    label,
  };
}

// Generate a wave of enemy stat blocks using a budget system
export function generateWave(floor) {
  // Budget grows with floor
  const baseBudget = 3 + floor * 2;
  const variance   = Math.floor(Math.random() * Math.max(2, floor));
  const budget     = baseBudget + variance;

  const available = getAvailableTypes(floor);
  const costs = { PAWN: 1, KNIGHT: 2, BISHOP: 2, ROOK: 3, QUEEN: 5 };

  const wave = [];
  let remaining = budget;

  // Keep spending budget until we can't afford any more pieces
  while (remaining > 0) {
    const affordable = available.filter((t) => costs[t] <= remaining);
    if (affordable.length === 0) break;

    // Weighted selection: cheaper pieces are slightly more common
    // Build a small weighted pool
    const pool = [];
    for (const t of affordable) {
      const weight = Math.max(1, 6 - costs[t]); // PAWN=5, KNIGHT/BISHOP=4, ROOK=3, QUEEN=1
      for (let i = 0; i < weight; i++) pool.push(t);
    }

    const type = pool[Math.floor(Math.random() * pool.length)];
    wave.push(buildEnemy(type, floor));
    remaining -= costs[type];
  }

  return wave;
}

export function getPieceColor(type) {
  return PIECE_DEFS[type]?.color ?? 0xff5555;
}

export const PIECE_COSTS = { PAWN: 1, KNIGHT: 2, BISHOP: 2, ROOK: 3, QUEEN: 5 };
