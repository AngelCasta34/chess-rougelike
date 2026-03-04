import CardList from "../cards/CardList.js";

export default class LootTable {
  constructor(rng = Math.random) {
    this.rng = rng;
  }

  weightedPick(pool) {
    const total = pool.reduce((sum, c) => sum + (c.weight ?? 1), 0);
    let roll = this.rng() * total;

    for (const c of pool) {
      roll -= (c.weight ?? 1);
      if (roll <= 0) return c;
    }
    return pool[pool.length - 1];
  }

  // Returns N unique cards
  drawOptions(n = 3) {
    const options = [];
    const pool = [...CardList];

    while (options.length < n && pool.length > 0) {
      const pick = this.weightedPick(pool);
      options.push(pick);

      // remove to keep unique choices
      const idx = pool.findIndex((c) => c.id === pick.id);
      if (idx >= 0) pool.splice(idx, 1);
    }

    return options;
  }
}