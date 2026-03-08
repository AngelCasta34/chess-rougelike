// src/generators/LootTable.js
// Weighted loot generation
//   1. Calculate weighted sum of rarities
//   2. Roll random 0 weightedSum
//   3. Walk rarities subtracting each weight; stop when roll < 0 that rarity wins
//   4. Pick a random card from that rarity's item pool
import CardList from "../cards/CardList.js";

function asArray(list) {
  if (Array.isArray(list)) return list;
  if (list && Array.isArray(list.cards)) return list.cards;
  if (list && typeof list === "object") return Object.values(list);
  return [];
}

export default class LootTable {
  constructor() {
    // reward_fight uses close-to-default weights; elite skews toward higher rarities
    this.rarityWeightsByTable = {
      reward_fight: { Common: 55, Uncommon: 30, Rare: 15, Epic: 6,  Legendary: 1 },
      reward_elite: { Common: 25, Uncommon: 35, Rare: 25, Epic: 12, Legendary: 3 },
    };
  }

  _buildRarityMap(candidates) {
    const map = {};
    for (const card of candidates) {
      if (!map[card.rarity]) map[card.rarity] = [];
      map[card.rarity].push(card);
    }
    return map;
  }

  _rollRarity(weights) {
    let weightedSum = 0;
    for (const w of Object.values(weights)) weightedSum += w;

    let roll = Math.floor(Math.random() * weightedSum);
    for (const [rarity, weight] of Object.entries(weights)) {
      roll -= weight;
      if (roll < 0) return rarity;
    }
    // Fallback
    return Object.keys(weights)[0];
  }

  drawOptions(tableId = "reward_fight", count = 1, opts = {}) {
    const allCards = asArray(CardList).filter(Boolean);
    if (allCards.length === 0) {
      console.warn("LootTable: CardList is empty.", CardList);
      return [];
    }

    // Copy weights so we can mutate for pity without touching the table
    const weights = { ...(this.rarityWeightsByTable[tableId] ?? this.rarityWeightsByTable.reward_fight) };

    // Pity boost: each streak tick adds weight to Rare+ 
    const pity = opts.pity ?? 0;
    if (pity > 0) {
      weights.Rare      = (weights.Rare      ?? 0) + pity * 3;
      weights.Epic      = (weights.Epic      ?? 0) + pity * 1;
      weights.Legendary = (weights.Legendary ?? 0) + Math.floor(pity / 2);
    }

    let candidates = allCards;
    if (opts.tag) {
      const tagged = candidates.filter((c) => Array.isArray(c.tags) && c.tags.includes(opts.tag));
      if (tagged.length > 0) candidates = tagged;
    }

    // Build rarity map 
    const rarityMap = this._buildRarityMap(candidates);

    // Fallback order when rolled rarity has no cards in the filtered pool
    const rarityFallback = ["Common", "Uncommon", "Rare", "Epic", "Legendary"];

    const picks = [];
    const used  = new Set();
    let attempts = 0;

    while (picks.length < count && attempts < 300) {
      attempts++;

      // Step 2–4: roll a rarity
      const rarity = this._rollRarity(weights);

      // Step 6: pick a random card from that rarity's pool 
      let pool = rarityMap[rarity];
      if (!pool || pool.length === 0) {
        // Try adjacent rarities
        for (const fb of rarityFallback) {
          if (rarityMap[fb]?.length) { pool = rarityMap[fb]; break; }
        }
      }
      if (!pool || pool.length === 0) continue;

      const card = pool[Math.floor(Math.random() * pool.length)];
      if (!card?.id) continue;

      // Avoid duplicates on the same reward screen when pool is large enough
      if (used.has(card.id) && candidates.length >= count) continue;

      used.add(card.id);
      picks.push(card);
    }

    return picks;
  }
}
