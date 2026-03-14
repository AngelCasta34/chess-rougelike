import Phaser from "phaser";

export default class MenuScene extends Phaser.Scene {
  constructor() { super("MenuScene"); }

  preload() {
    const base = "assets/chessPieces/chess-pack";
    for (const color of ["white", "black"]) {
      for (const piece of ["pawn", "knight", "bishop", "rook", "queen", "king"]) {
        this.load.image(`chess-${piece}-${color}`, `${base}/chess-${piece}-${color}.png`);
      }
    }
    this.load.audio("music_dungeon", "assets/music/Big Helmet.mp3");
  }

  create() {
    const W = 1050, H = 750;

    //Background 
    this.add.rectangle(W / 2, H / 2, W, H, 0x05050a);
    this._drawChessBoard(W, H);

    //Floating ghost pieces 
    this._spawnFloatingPieces();

    //Red accent line 
    const accentLine = this.add.graphics();
    accentLine.fillStyle(0xaa2222, 1);
    accentLine.fillRect(0, 0, 5, H);

    this.add.text(W / 2 + 4, 154, "CHESS", {
      fontSize: "100px", fontStyle: "bold", color: "#000000",
    }).setOrigin(0.5).setAlpha(0.6);

    // Main title
    const titleText = this.add.text(W / 2, 150, "CHESS", {
      fontSize: "100px", fontStyle: "bold",
      color: "#c8a96e",
      stroke: "#1a0000", strokeThickness: 6,
    }).setOrigin(0.5);

    // Pulse glow on title
    this.tweens.add({
      targets: titleText, alpha: 0.85, duration: 2200,
      yoyo: true, repeat: -1, ease: "Sine.easeInOut",
    });

    // Subtitle
    this.add.text(W / 2, 255, "R  O  G  U  E  L  I  K  E", {
      fontSize: "26px", color: "#7a6040",
      stroke: "#000000", strokeThickness: 3,
    }).setOrigin(0.5);

    // Gold divider
    const div = this.add.graphics();
    div.lineStyle(1, 0xc8a96e, 0.45);
    div.lineBetween(W / 2 - 200, 294, W / 2 + 200, 294);

    //Menu items 
    this._addMenuItem(W / 2, 380, "♟  NEW RUN", () => {
      this._stopMusic();
      this.cameras.main.fadeOut(600, 0, 0, 0);
      this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start("GameScene"));
    });

    this._addMenuItem(W / 2, 450, "?  HOW TO PLAY", () => this._showHowToPlay());

    this.add.text(W / 2, H - 32, "Every run is different.  Every decision matters.", {
      fontSize: "14px", color: "#333340", fontStyle: "italic",
    }).setOrigin(0.5);

    // Music 
    this.input.once("pointerdown", () => {
      if (this._menuMusic) return;
      this._menuMusic = this.sound.add("music_dungeon", { loop: true, volume: 0 });
      this._menuMusic.play();
      this.tweens.add({ targets: this._menuMusic, volume: 0.4, duration: 1800 });
    });

    //Fade in 
    this.cameras.main.fadeIn(900, 0, 0, 0);
  }

  // Helpers

  _stopMusic() {
    if (this._menuMusic) {
      this.tweens.killTweensOf(this._menuMusic);
      this._menuMusic.stop();
      this._menuMusic.destroy();
      this._menuMusic = null;
    }
  }

  _drawChessBoard(W, H) {
    const g    = this.add.graphics();
    const size = 62;
    const cols = Math.ceil(W / size) + 1;
    const rows = Math.ceil(H / size) + 1;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        g.fillStyle((r + c) % 2 === 0 ? 0x0c0c14 : 0x080810, 1);
        g.fillRect(c * size, r * size, size, size);
      }
    }
  }

  _spawnFloatingPieces() {
    const pieces = ["king", "queen", "rook", "bishop", "knight", "pawn"];
    const colors = ["white", "black"];
    for (let i = 0; i < 14; i++) {
      const piece = pieces[i % pieces.length];
      const color = colors[i % 2];
      const x     = 60 + Math.random() * 930;
      const y     = 60 + Math.random() * 630;
      const alpha = 0.03 + Math.random() * 0.07;
      const scale = 0.55 + Math.random() * 0.75;

      const img = this.add.image(x, y, `chess-${piece}-${color}`)
        .setAlpha(alpha)
        .setScale(scale)
        .setAngle(Math.random() * 360);

      this.tweens.add({
        targets: img,
        y:       y - 18 - Math.random() * 25,
        alpha:   Math.min(alpha * 1.6, 0.18),
        duration: 3500 + Math.random() * 4000,
        yoyo: true, repeat: -1,
        ease: "Sine.easeInOut",
        delay: Math.random() * 3000,
      });
    }
  }

  _addMenuItem(x, y, label, callback) {
    const text = this.add.text(x, y, label, {
      fontSize: "28px", color: "#888898",
      stroke: "#000000", strokeThickness: 3,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    text.on("pointerover", () => {
      text.setColor("#c8a96e");
      this.tweens.add({ targets: text, scaleX: 1.06, scaleY: 1.06, duration: 120 });
    });
    text.on("pointerout", () => {
      text.setColor("#888898");
      this.tweens.add({ targets: text, scaleX: 1, scaleY: 1, duration: 120 });
    });
    text.on("pointerdown", callback);
    return text;
  }

  _showHowToPlay() {
    const W = 1050, H = 750;
    const depth = 20;

    const bg    = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.75).setDepth(depth);
    const panel = this.add.rectangle(W / 2, H / 2, 620, 480, 0x08080f, 0.98)
      .setStrokeStyle(2, 0xc8a96e).setDepth(depth + 1);

    const title = this.add.text(W / 2, H / 2 - 205, "HOW  TO  PLAY", {
      fontSize: "24px", color: "#c8a96e",
    }).setOrigin(0.5).setDepth(depth + 2);

    const lines = [
      "♟  Click a highlighted tile to move your King",
      "      Green border = move    Orange border = attack",
      "",
      "🃏  Cards appear at the bottom of the screen",
      "      Click a card to play it (costs energy)",
      "      Each card can only be played once per turn",
      "      Scroll through your hand with the mouse wheel",
      "",
      "⚔  Clear all enemies to advance to the next room",
      "      Pick your next room: Fight, Elite, Rest, Shop…",
      "",
      "💀  Boss fights every 5 floors",
      "",
      "SPACE  or  END TURN  ends your turn",
    ];

    const body = this.add.text(W / 2, H / 2 - 155, lines.join("\n"), {
      fontSize: "14px", color: "#bbbbcc", lineSpacing: 5,
    }).setOrigin(0.5, 0).setDepth(depth + 2);

    const closeBtn = this.add.text(W / 2, H / 2 + 205, "[  CLOSE  ]", {
      fontSize: "20px", color: "#666677",
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(depth + 2);

    closeBtn.on("pointerover", () => closeBtn.setColor("#c8a96e"));
    closeBtn.on("pointerout",  () => closeBtn.setColor("#666677"));
    closeBtn.on("pointerdown", () => { bg.destroy(); panel.destroy(); title.destroy(); body.destroy(); closeBtn.destroy(); });
  }
}
