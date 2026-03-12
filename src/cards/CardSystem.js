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

// How many cards are visible at once in the strip
const VISIBLE_CARDS = 4;

export default class CardSystem {
  constructor(scene) {
    this.scene = scene;

    // UI containers
    this.handContainer = scene.add.container(0, 0).setDepth(50);
    this.rewardContainer = scene.add.container(0, 0).setDepth(100);
    this.rewardContainer.setVisible(false);

    this.handObjects = [];
    this.rewardObjects = [];

    // Register mouse wheel scrolling on the bottom strip
    scene.input.on("wheel", (_ptr, _objs, _dx, dy) => {
      if (scene.isGameOver || scene.inReward) return;
      if (!scene.isPlayerTurn) return;
      if (scene.hand.length <= VISIBLE_CARDS) return;
      const dir = dy > 0 ? 1 : -1;
      const max = Math.max(0, scene.hand.length - VISIBLE_CARDS);
      scene._handScrollOffset = Math.max(0, Math.min((scene._handScrollOffset ?? 0) + dir, max));
      this.renderHand();
      scene.updateDeckPanel?.();
    });
  }

  //  HAND
  renderHand() {
    this.clearHand();

    const scene = this.scene;

    const cardW   = 140;
    const cardH   = 108;
    const cardGap = 10;
    const y       = 684;

    // Clamp scroll offset
    if (scene._handScrollOffset === undefined) scene._handScrollOffset = 0;
    const maxOffset = Math.max(0, scene.hand.length - VISIBLE_CARDS);
    scene._handScrollOffset = Math.max(0, Math.min(scene._handScrollOffset, maxOffset));

    const offset       = scene._handScrollOffset;
    const visibleSlice = scene.hand.slice(offset, offset + VISIBLE_CARDS);
    const n            = visibleSlice.length;

    // Total width of visible cards, centered in the board area (x 0-724)
    const areaW      = 724;
    const totalW     = n * cardW + (n - 1) * cardGap;
    const areaCenter = areaW / 2;
    const firstCardX = areaCenter - totalW / 2 + cardW / 2;

    // Scroll arrow — left
    if (offset > 0) {
      const btn = scene.add.text(22, y, "◀", {
        fontSize: "28px", color: "#5566aa",
      }).setOrigin(0.5).setInteractive();
      btn.on("pointerover",  () => btn.setColor("#8899ff"));
      btn.on("pointerout",   () => btn.setColor("#5566aa"));
      btn.on("pointerdown",  () => {
        scene._handScrollOffset = Math.max(0, offset - 1);
        this.renderHand();
        scene.updateDeckPanel?.();
      });
      this.handContainer.add(btn);
      this.handObjects.push(btn);
    }

    // Scroll arrow — right
    if (offset < maxOffset) {
      const btn = scene.add.text(702, y, "▶", {
        fontSize: "28px", color: "#5566aa",
      }).setOrigin(0.5).setInteractive();
      btn.on("pointerover",  () => btn.setColor("#8899ff"));
      btn.on("pointerout",   () => btn.setColor("#5566aa"));
      btn.on("pointerdown",  () => {
        scene._handScrollOffset = Math.min(maxOffset, offset + 1);
        this.renderHand();
        scene.updateDeckPanel?.();
      });
      this.handContainer.add(btn);
      this.handObjects.push(btn);
    }

    // Scroll indicator dots 
    if (scene.hand.length > VISIBLE_CARDS) {
      scene.hand.forEach((_, di) => {
        const inWindow = di >= offset && di < offset + VISIBLE_CARDS;
        const dot = scene.add.circle(
          areaCenter - (scene.hand.length - 1) * 5 + di * 10,
          629,
          3,
          inWindow ? 0x8899ff : 0x333348,
        );
        this.handContainer.add(dot);
        this.handObjects.push(dot);
      });
    }

    // Render visible cards
    visibleSlice.forEach((cardId, vi) => {
      const card = byId(cardId);
      if (!card) return;

      const actualIndex   = offset + vi;
      const x             = firstCardX + vi * (cardW + cardGap);

      const slotIid       = scene.handSlots?.[actualIndex] ?? null;
      const alreadyPlayed = slotIid !== null && (scene._playedThisTurn?.has(slotIid) ?? false);
      const canAfford     = scene.energy >= card.cost;
      const canPlay       = canAfford && !alreadyPlayed;
      const fill          = canPlay ? 0x1e1e2e : 0x141420;
      const strokeHex     = parseInt(rarityColor(card.rarity).replace("#", ""), 16);

      const box = scene.add
        .rectangle(x, y, cardW, cardH, fill)
        .setStrokeStyle(2, canPlay ? strokeHex : 0x444444)
        .setInteractive();

      const name = scene.add.text(x - 62, y - 46, card.name, {
        fontSize: "15px", color: canPlay ? rarityColor(card.rarity) : "#555566",
      });
      const cost = scene.add.text(x - 62, y - 27, `Cost: ${card.cost}`, {
        fontSize: "12px", color: "#aaaaaa",
      });
      const desc = scene.add.text(x - 62, y - 9, card.desc, {
        fontSize: "11px", color: canPlay ? "#dddddd" : "#555566", wordWrap: { width: 124 },
      });

      // "USED" badge for already-played cards
      if (alreadyPlayed) {
        const usedLbl = scene.add.text(x, y + 30, "USED", {
          fontSize: "14px", color: "#884444",
        }).setOrigin(0.5);
        this.handContainer.add(usedLbl);
        this.handObjects.push(usedLbl);
      }

      box.on("pointerover", () => box.setFillStyle(canPlay ? 0x2a2a3e : 0x1a1a28));
      box.on("pointerout",  () => box.setFillStyle(fill));
      box.on("pointerdown", () => {
        if (scene.inReward || scene.isGameOver) return;
        if (!scene.isPlayerTurn) return;
        if (scene.energy < card.cost) return;
        const iid = scene.handSlots?.[actualIndex] ?? null;
        if (iid !== null && scene._playedThisTurn?.has(iid)) return;

        scene._playedThisTurn ??= new Set();
        if (iid !== null) scene._playedThisTurn.add(iid);

        scene.energy -= card.cost;
        scene.updateEnergyUI();
        scene.sfx?.playCardPlay();
        card.apply(scene);

        scene.hand.splice(actualIndex, 1);
        scene.handSlots?.splice(actualIndex, 1);
        scene.discardPile.push(cardId);

        // Clamp offset if last card in window was removed
        scene._handScrollOffset = Math.max(
          0,
          Math.min(scene._handScrollOffset, Math.max(0, scene.hand.length - VISIBLE_CARDS))
        );

        this.renderHand();
        scene.updateDeckPanel?.();
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
