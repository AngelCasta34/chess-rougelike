import CardList from "./CardList.js";

function byId(id) {
  if (Array.isArray(CardList)) {
    return CardList.find((c) => c.id === id) || null;
  }

  if (CardList && Array.isArray(CardList.cards)) {
    return CardList.cards.find((c) => c.id === id) || null;
  }

  if (CardList && typeof CardList === "object") {
    if (CardList[id]) return CardList[id];

    const vals = Object.values(CardList);
    return vals.find((c) => c && c.id === id) || null;
  }

  return null;
}

export default class CardSystem {
  constructor(scene) {
    this.scene = scene;

    // UI containers
    this.handContainer = scene.add.container(0, 0).setDepth(50);
    this.rewardContainer = scene.add.container(0, 0).setDepth(100);
    this.rewardContainer.setVisible(false);

    this.handObjects = [];
    this.rewardObjects = [];
  }

  //  HAND 
  renderHand() {
    this.clearHand();

    const scene = this.scene;

    // Energy label
    const energyText = scene.add.text(20, 520, `ENERGY: ${scene.energy}/${scene.maxEnergy}`, {
      fontSize: "18px",
      color: "#ffffff",
    });
    this.handContainer.add(energyText);
    this.handObjects.push(energyText);

    // Deck/discard counts
    const deckText = scene.add.text(20, 545, `DECK: ${scene.drawPile.length}  DISCARD: ${scene.discardPile.length}`, {
      fontSize: "16px",
      color: "#cccccc",
    });
    this.handContainer.add(deckText);
    this.handObjects.push(deckText);

    // Cards
    const startX = 220;
    const y = 545;
    const gap = 160;

    scene.hand.forEach((cardId, i) => {
      const card = byId(cardId);
      if (!card) return;

      const x = startX + i * gap;

      const canAfford = scene.energy >= card.cost;
      const fill = canAfford ? 0x2b2b2b : 0x1f1f1f;

      const box = scene.add
        .rectangle(x, y, 140, 90, fill)
        .setStrokeStyle(2, 0xffffff)
        .setInteractive();

      const name = scene.add.text(x - 60, y - 35, card.name, {
        fontSize: "16px",
        color: "#ffffff",
      });

      const cost = scene.add.text(x - 60, y - 15, `Cost: ${card.cost}`, {
        fontSize: "14px",
        color: "#cccccc",
      });

      const desc = scene.add.text(x - 60, y + 5, card.desc, {
        fontSize: "12px",
        color: "#ffffff",
        wordWrap: { width: 120 },
      });

      box.on("pointerover", () => {
        box.setFillStyle(canAfford ? 0x3a3a3a : 0x242424);
      });
      box.on("pointerout", () => {
        box.setFillStyle(fill);
      });

      box.on("pointerdown", () => {
        if (scene.inReward || scene.isGameOver) return;
        if (!scene.isPlayerTurn) return;
        if (scene.energy < card.cost) return;

        // pay energy
        scene.energy -= card.cost;
        scene.updateEnergyUI();

        // apply effect
        card.apply(scene);

        // discard the played card
        const removed = scene.hand.splice(i, 1)[0];
        scene.discardPile.push(removed);

        // re-render hand
        this.renderHand();
      });

      this.handContainer.add(box);
      this.handContainer.add(name);
      this.handContainer.add(cost);
      this.handContainer.add(desc);

      this.handObjects.push(box, name, cost, desc);
    });
  }

  clearHand() {
    this.handObjects.forEach((o) => o.destroy());
    this.handObjects = [];
    this.handContainer.removeAll(false);
  }

  //  REWARD SCREEN 
  showReward(options, onPick) {
    this.clearReward();
    this.rewardContainer.setVisible(true);

    const scene = this.scene;

    const bg = scene.add
      .rectangle(450, 300, 900, 600, 0x000000, 0.6)
      .setInteractive();
    this.rewardContainer.add(bg);
    this.rewardObjects.push(bg);

    const title = scene.add.text(300, 80, "Choose a Reward", {
      fontSize: "32px",
      color: "#ffffff",
    });
    this.rewardContainer.add(title);
    this.rewardObjects.push(title);

    const startX = 170;
    const y = 220;
    const gap = 260;

    options.forEach((card, i) => {
      const x = startX + i * gap;

      const box = scene.add
        .rectangle(x, y, 220, 260, 0x2b2b2b)
        .setStrokeStyle(3, 0xffffff)
        .setInteractive();

      const name = scene.add.text(x - 90, y - 110, card.name, {
        fontSize: "22px",
        color: "#ffffff",
      });

      const rarity = scene.add.text(x - 90, y - 75, `Rarity: ${card.rarity}`, {
        fontSize: "16px",
        color: "#cccccc",
      });

      const cost = scene.add.text(x - 90, y - 55, `Cost: ${card.cost}`, {
        fontSize: "16px",
        color: "#cccccc",
      });

      const desc = scene.add.text(x - 90, y - 20, card.desc, {
        fontSize: "16px",
        color: "#ffffff",
        wordWrap: { width: 180 },
      });

      box.on("pointerover", () => box.setFillStyle(0x3a3a3a));
      box.on("pointerout", () => box.setFillStyle(0x2b2b2b));

      box.on("pointerdown", () => {
        this.hideReward();
        onPick(card);
      });

      this.rewardContainer.add(box);
      this.rewardContainer.add(name);
      this.rewardContainer.add(rarity);
      this.rewardContainer.add(cost);
      this.rewardContainer.add(desc);

      this.rewardObjects.push(box, name, rarity, cost, desc);
    });
  }

  hideReward() {
    this.rewardContainer.setVisible(false);
    this.clearReward();
  }

  clearReward() {
    this.rewardObjects.forEach((o) => o.destroy());
    this.rewardObjects = [];
    this.rewardContainer.removeAll(false);
  }
}