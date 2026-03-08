import CardList from "./CardList.js";

const RARITY_COLOR = {
  Common:    "#ffffff",
  Uncommon:  "#44ff88",
  Rare:      "#4499ff",
  Epic:      "#cc44ff",
  Legendary: "#ff8800",
};

function rarityColor(rarity) {
  return RARITY_COLOR[rarity] ?? "#ffffff";
}

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

    // Deck/discard counts in sidebar area
    const deckText = scene.add.text(735, 416, `DECK: ${scene.drawPile.length}  DISC: ${scene.discardPile.length}`, {
      fontSize: "12px", color: "#555566",
    });
    this.handContainer.add(deckText);
    this.handObjects.push(deckText);

    // Cards centered over the board 
    const cardW     = 140;
    const cardH     = 108;
    const cardGap   = 14;
    const boardCX   = 384;
    const y         = 684;
    const n         = scene.hand.length;
    const totalW    = n * cardW + (n - 1) * cardGap;
    const firstCardX = boardCX - totalW / 2 + cardW / 2;

    scene.hand.forEach((cardId, i) => {
      const card = byId(cardId);
      if (!card) return;

      const x = firstCardX + i * (cardW + cardGap);

      const canAfford = scene.energy >= card.cost;
      const fill      = canAfford ? 0x1e1e2e : 0x141420;
      const strokeHex = parseInt(rarityColor(card.rarity).replace("#", ""), 16);

      const box = scene.add
        .rectangle(x, y, cardW, cardH, fill)
        .setStrokeStyle(2, canAfford ? strokeHex : 0x444444)
        .setInteractive();

      const name = scene.add.text(x - 62, y - 46, card.name, {
        fontSize: "15px", color: rarityColor(card.rarity),
      });
      const cost = scene.add.text(x - 62, y - 27, `Cost: ${card.cost}`, {
        fontSize: "12px", color: "#aaaaaa",
      });
      const desc = scene.add.text(x - 62, y - 9, card.desc, {
        fontSize: "11px", color: "#dddddd", wordWrap: { width: 124 },
      });

      box.on("pointerover", () => box.setFillStyle(canAfford ? 0x2a2a3e : 0x1a1a28));
      box.on("pointerout",  () => box.setFillStyle(fill));
      box.on("pointerdown", () => {
        if (scene.inReward || scene.isGameOver) return;
        if (!scene.isPlayerTurn) return;
        if (scene.energy < card.cost) return;

        scene.energy -= card.cost;
        scene.updateEnergyUI();
        card.apply(scene);

        const removed = scene.hand.splice(i, 1)[0];
        scene.discardPile.push(removed);
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

      const strokeHex = parseInt(rarityColor(card.rarity).replace("#", ""), 16);
      const box = scene.add
        .rectangle(x, y, 220, 260, 0x2b2b2b)
        .setStrokeStyle(3, strokeHex)
        .setInteractive();

      // Permanent badge
      const nameLabel = card.permanent ? `★ ${card.name}` : card.name;
      const name = scene.add.text(x - 90, y - 110, nameLabel, {
        fontSize: "20px",
        color: rarityColor(card.rarity),
      });

      const rarity = scene.add.text(x - 90, y - 75, card.permanent ? "PERMANENT" : `${card.rarity}`, {
        fontSize: "14px",
        color: card.permanent ? "#ffdd44" : "#aaaaaa",
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