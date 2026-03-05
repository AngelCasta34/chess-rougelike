const CardList = [
  {
    id: "dash",
    name: "Dash",
    rarity: "Common",
    cost: 1,
    desc: "+1 move this turn.",
    apply(scene) {
      scene.movesRemaining += 1;
      scene.updateMovesUI();
    },
  },

  {
    id: "shield",
    name: "Shield",
    rarity: "Common",
    cost: 1,
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
    desc: "+1 HP (max 5).",
    apply(scene) {
      scene.king.hp = Math.min(scene.king.hp + 1, 5);
      scene.updateHPUI();
    },
  },

  {
    id: "double_dash",
    name: "Double Dash",
    rarity: "Uncommon",
    cost: 2,
    desc: "+2 moves this turn.",
    apply(scene) {
      scene.movesRemaining += 2;
      scene.updateMovesUI();
    },
  },

  {
    id: "fortify",
    name: "Fortify",
    rarity: "Rare",
    cost: 2,
    desc: "+2 Shield.",
    apply(scene) {
      scene.shield += 2;
      scene.updateShieldUI();
    },
  },

  {
    id: "energy_up",
    name: "Energy Up",
    rarity: "Rare",
    cost: 0,
    desc: "Gain +1 max energy this fight.",
    apply(scene) {
      scene.maxEnergy += 1;
      scene.energy += 1;
      scene.updateEnergyUI();
    },
  },

  {
    id: "panic_step",
    name: "Panic Step",
    rarity: "Epic",
    cost: 1,
    desc: "Gain +1 move and +1 shield.",
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
    desc: "Heal 1 and gain +1 move.",
    apply(scene) {
      scene.king.hp = Math.min(scene.king.hp + 1, 5);
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
    desc: "Gain +3 Shield.",
    apply(scene) {
      scene.shield += 3;
      scene.updateShieldUI();
    },
  },
];

export default CardList;