import CardList from "../cards/CardList.js";

function asArray(list) {
  if (Array.isArray(list)) return list;

  if (list && Array.isArray(list.cards)) return list.cards;

  if (list && typeof list === "object") return Object.values(list);

  return [];
}

export default class LootTable {
  constructor() {}

  drawOptions(count = 3) {
    const allCards = asArray(CardList).filter(Boolean);

    if (allCards.length === 0) {
      console.warn("LootTable: No cards found in CardList export.");
      return [];
    }

    // simple weighted draw by rarity
    const rarityWeights = {
      Common: 55,
      Uncommon: 30,
      Rare: 15,
      Epic: 6,
      Legendary: 1,
    };

    // build weighted pool
    const pool = [];
    for (const c of allCards) {
      const w = rarityWeights[c.rarity] ?? 10;
      for (let i = 0; i < w; i++) pool.push(c);
    }

    const picks = [];
    const used = new Set();

    // pick unique cards when possible
    let attempts = 0;
    while (picks.length < count && attempts < 200) {
      attempts++;
      const card = pool[Math.floor(Math.random() * pool.length)];
      if (!card || !card.id) continue;

      if (used.has(card.id) && allCards.length >= count) continue;

      used.add(card.id);
      picks.push(card);
    }

    return picks;
  }
}