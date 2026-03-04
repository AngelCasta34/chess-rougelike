const CardList = [
  {
    id: "dash",
    name: "Dash",
    desc: "+1 move this turn.",
    rarity: "Common",
    weight: 55,
    cost: 1,
    apply(scene) {
      scene.movesRemaining += 1;
      scene.updateMovesUI();
    },
  },
  {
    id: "heal",
    name: "Heal",
    desc: "+1 HP (max 5).",
    rarity: "Common",
    weight: 40,
    cost: 2,
    apply(scene) {
      scene.king.hp = Math.min(5, scene.king.hp + 1);
      scene.updateHPUI();
    },
  },
  {
    id: "shield",
    name: "Shield",
    desc: "Block the next hit.",
    rarity: "Uncommon",
    weight: 25,
    cost: 1,
    apply(scene) {
      scene.shield += 1;
      scene.updateShieldUI();
    },
  },
  {
    id: "blink",
    name: "Blink",
    desc: "Gain +2 moves this turn.",
    rarity: "Rare",
    weight: 12,
    cost: 2,
    apply(scene) {
      scene.movesRemaining += 2;
      scene.updateMovesUI();
    },
  },
];

export default CardList;