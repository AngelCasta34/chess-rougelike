import CardList from "../cards/CardList.js";

const BUY_PRICE   = { Common: 30, Uncommon: 50, Rare: 80, Epic: 120, Legendary: 200 };
const REMOVE_COST = 40;
const RC = { Common: "#ffffff", Uncommon: "#44ff88", Rare: "#4499ff", Epic: "#cc44ff", Legendary: "#ff8800" };
const rc = (r) => RC[r] ?? "#ffffff";

export default class ShopSystem {
  constructor(scene) {
    this.scene = scene;
    this.objs  = [];
  }

  show(onClose) {
    this._clear();
    const scene = this.scene;

    const bg    = scene.add.rectangle(450, 300, 900, 600, 0x111122, 0.95).setDepth(200).setInteractive();
    const title = scene.add.text(450, 42, `SHOP  —  GOLD: ${scene.gold}g`, {
      fontSize: "26px", color: "#ffdd44",
    }).setOrigin(0.5, 0).setDepth(201);
    this.objs.push(bg, title);

    // 3 random non-permanent cards to buy
    const pool     = CardList.filter((c) => !c.permanent);
    const shopCards = this._pickRandom(pool, 3);

    shopCards.forEach((card, i) => {
      const x     = 145 + i * 220;
      const y     = 250;
      const price = BUY_PRICE[card.rarity] ?? 50;
      const can   = scene.gold >= price;
      const hex   = parseInt(rc(card.rarity).replace("#", ""), 16);

      const box   = scene.add.rectangle(x, y, 195, 235, can ? 0x222233 : 0x141420)
        .setStrokeStyle(2, can ? hex : 0x333344).setInteractive().setDepth(201);
      const nameT = scene.add.text(x - 88, y - 110, card.name, { fontSize: "14px", color: rc(card.rarity) }).setDepth(202);
      const rarT  = scene.add.text(x - 88, y - 90,  card.rarity, { fontSize: "11px", color: "#777788" }).setDepth(202);
      const descT = scene.add.text(x - 88, y - 70,  card.desc, { fontSize: "11px", color: "#cccccc", wordWrap: { width: 182 } }).setDepth(202);
      const priceT = scene.add.text(x - 88, y + 95, `${price}g`, { fontSize: "20px", color: can ? "#ffdd44" : "#665500" }).setDepth(202);

      this.objs.push(box, nameT, rarT, descT, priceT);

      if (can) {
        box.on("pointerover",  () => box.setFillStyle(0x333355));
        box.on("pointerout",   () => box.setFillStyle(0x222233));
        box.on("pointerdown",  () => {
          scene.gold -= price;
          scene.runDeck.push(card.id);
          scene.discardPile.push(card.id);
          scene.updateGoldUI();
          this._clear();
          onClose();
        });
      }
    });

    // Remove a card option
    const canRemove = scene.gold >= REMOVE_COST && scene.runDeck.length > 3;
    const remBox = scene.add.rectangle(800, 235, 170, 70, canRemove ? 0x440011 : 0x1c1c1c)
      .setStrokeStyle(2, canRemove ? 0xff4444 : 0x333333).setInteractive().setDepth(201);
    const remLbl = scene.add.text(730, 212, `Remove Card\n${REMOVE_COST}g`, {
      fontSize: "15px", color: canRemove ? "#ff8888" : "#555555", align: "center",
    }).setDepth(202);
    this.objs.push(remBox, remLbl);

    if (canRemove) {
      remBox.on("pointerdown", () => this._showRemovePanel(onClose));
    }

    // Leave button
    const leaveBox = scene.add.rectangle(800, 340, 170, 50, 0x333333)
      .setStrokeStyle(2, 0x888888).setInteractive().setDepth(201);
    const leaveLbl = scene.add.text(740, 328, "Leave Shop", { fontSize: "15px", color: "#aaaaaa" }).setDepth(202);
    leaveBox.on("pointerdown", () => { this._clear(); onClose(); });
    this.objs.push(leaveBox, leaveLbl);
  }

  _showRemovePanel(onClose) {
    this._clear();
    const scene = this.scene;

    const bg    = scene.add.rectangle(450, 300, 900, 600, 0x110011, 0.96).setDepth(200).setInteractive();
    const title = scene.add.text(450, 38, "Pick a card to REMOVE from your deck:", {
      fontSize: "19px", color: "#ff8888",
    }).setOrigin(0.5, 0).setDepth(201);
    this.objs.push(bg, title);

    const seen   = new Set();
    const unique = scene.runDeck.filter((id) => { if (seen.has(id)) return false; seen.add(id); return true; });

    unique.forEach((id, i) => {
      const card = CardList.find((c) => c.id === id);
      if (!card) return;

      const col = i % 5;
      const row = Math.floor(i / 5);
      const cx  = 100 + col * 175;
      const cy  = 130 + row * 135;
      const cnt = scene.runDeck.filter((d) => d === id).length;
      const hex = parseInt((RC[card.rarity] ?? "#ffffff").replace("#", ""), 16);

      const box   = scene.add.rectangle(cx + 75, cy + 50, 162, 118, 0x221111)
        .setStrokeStyle(2, hex).setInteractive().setDepth(201);
      const nameT = scene.add.text(cx + 5, cy,     card.name,    { fontSize: "13px", color: RC[card.rarity] ?? "#fff" }).setDepth(202);
      const cntT  = scene.add.text(cx + 5, cy + 20, `×${cnt}`,   { fontSize: "11px", color: "#888888" }).setDepth(202);
      const descT = scene.add.text(cx + 5, cy + 38, card.desc,   { fontSize: "10px", color: "#aaaaaa", wordWrap: { width: 155 } }).setDepth(202);
      this.objs.push(box, nameT, cntT, descT);

      box.on("pointerover",  () => box.setFillStyle(0x550022));
      box.on("pointerout",   () => box.setFillStyle(0x221111));
      box.on("pointerdown",  () => {
        const idx = scene.runDeck.indexOf(id);
        if (idx >= 0) scene.runDeck.splice(idx, 1);
        const dp = scene.drawPile.indexOf(id);
        if (dp >= 0) scene.drawPile.splice(dp, 1);
        else { const di = scene.discardPile.indexOf(id); if (di >= 0) scene.discardPile.splice(di, 1); }
        scene.gold -= REMOVE_COST;
        scene.updateGoldUI();
        this._clear();
        onClose();
      });
    });

    const cancelBox = scene.add.rectangle(450, 565, 160, 45, 0x333333)
      .setStrokeStyle(2, 0x888888).setInteractive().setDepth(201);
    const cancelLbl = scene.add.text(400, 553, "Cancel", { fontSize: "16px", color: "#aaaaaa" }).setDepth(202);
    cancelBox.on("pointerdown", () => { this._clear(); this.show(onClose); });
    this.objs.push(cancelBox, cancelLbl);
  }

  _pickRandom(arr, n) {
    const pool  = [...arr];
    const picks = [];
    const seen  = new Set();
    while (picks.length < n && pool.length > 0) {
      const idx = Math.floor(Math.random() * pool.length);
      const c   = pool.splice(idx, 1)[0];
      if (!seen.has(c.id)) { seen.add(c.id); picks.push(c); }
    }
    return picks;
  }

  _clear() {
    this.objs.forEach((o) => o.destroy());
    this.objs = [];
  }
}
