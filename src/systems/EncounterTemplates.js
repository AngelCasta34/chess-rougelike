import Phaser from "phaser";

function trySpawn(scene, type, x, y) {
  if (!scene.board.inBounds(x, y)) return false;
  if (scene.board.isWall(x, y)) return false;
  if (scene.board.pieces[scene.board.key(x, y)]) return false;

  scene.spawnEnemy(type, x, y);
  return true;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export const EncounterTemplates = [
  {
    id: "pawn_swarm",
    name: "Pawn Swarm",
    spawn(scene) {
      const kx = Math.floor(scene.board.gridSize / 2);
      const count = Math.min(3 + scene.floor, 9);

      for (let i = 0; i < count; i++) {
        const ex = Phaser.Math.Clamp(
          kx - Math.floor(count / 2) + i,
          0,
          scene.board.gridSize - 1
        );

        const ey = i % 2 === 0 ? 0 : 1;
        trySpawn(scene, "PAWN", ex, ey);
      }
    },
  },

  {
    id: "pincer_pawns",
    name: "Pincer Pawns",
    spawn(scene) {
      const left = 0;
      const right = scene.board.gridSize - 1;

      const rows = Math.min(3 + Math.floor(scene.floor / 2), 6);
      for (let i = 0; i < rows; i++) {
        const y = i;
        trySpawn(scene, "PAWN", left, y);
        trySpawn(scene, "PAWN", right, y);
      }
    },
  },

  {
    id: "knight_pressure",
    name: "Knight Pressure",
    spawn(scene) {
      const kx = Math.floor(scene.board.gridSize / 2);

      trySpawn(scene, "PAWN", kx - 1, 0);
      trySpawn(scene, "PAWN", kx + 1, 0);

      trySpawn(scene, "KNIGHT", 1, 1);
      trySpawn(scene, "KNIGHT", scene.board.gridSize - 2, 1);
    },
  },

  {
    id: "diagonal_march",
    name: "Diagonal March",
    spawn(scene) {
      const offset = scene.floor % 3;
      const count = Math.min(
        5 + Math.floor(scene.floor / 2),
        scene.board.gridSize
      );

      for (let i = 0; i < count; i++) {
        const x = clamp(i + offset, 0, scene.board.gridSize - 1);
        const y = clamp(i % 3, 0, 2);
        trySpawn(scene, "PAWN", x, y);
      }

      if (scene.floor >= 3 && Math.random() < 0.5) {
        trySpawn(
          scene,
          "KNIGHT",
          clamp(offset + 1, 0, scene.board.gridSize - 1),
          2
        );
      }
    },
  },

  {
    id: "center_column",
    name: "Center Column",
    spawn(scene) {
      const kx = Math.floor(scene.board.gridSize / 2);
      const rows = Math.min(3 + Math.floor(scene.floor / 2), 6);

      for (let y = 0; y < rows; y++) {
        trySpawn(scene, "PAWN", kx, y);
      }

      if (scene.floor >= 3) {
        trySpawn(scene, "PAWN", kx - 2, 1);
        trySpawn(scene, "PAWN", kx + 2, 1);
      }
    },
  },

  {
    id: "knight_forks",
    name: "Knight Forks",
    spawn(scene) {
      if (scene.floor < 3) {
        const kx = Math.floor(scene.board.gridSize / 2);
        trySpawn(scene, "PAWN", kx - 1, 0);
        trySpawn(scene, "PAWN", kx + 1, 0);
        return;
      }

      const leftX = 1;
      const rightX = scene.board.gridSize - 2;

      const y1 = randInt(1, 2);
      const y2 = randInt(1, 2);

      trySpawn(scene, "KNIGHT", leftX, y1);
      trySpawn(scene, "KNIGHT", rightX, y2);

      const pawnCount = Math.min(2 + Math.floor(scene.floor / 2), 5);
      for (let i = 0; i < pawnCount; i++) {
        const x = randInt(0, scene.board.gridSize - 1);
        trySpawn(scene, "PAWN", x, 0);
      }
    },
  },

  {
    id: "random_patrol",
    name: "Random Patrol",
    spawn(scene) {
      const maxEnemies = Math.min(3 + scene.floor, 10);
      const knightChance = scene.floor >= 3 ? 0.35 : 0.0;

      let placed = 0;
      let attempts = 0;

      while (placed < maxEnemies && attempts < 200) {
        attempts++;

        const x = randInt(0, scene.board.gridSize - 1);
        const y = randInt(0, 2);

        const type = Math.random() < knightChance ? "KNIGHT" : "PAWN";
        if (trySpawn(scene, type, x, y)) placed++;
      }
    },
  },

  {
    id: "two_lanes",
    name: "Two Lanes",
    spawn(scene) {
      const holes = 2;
      const laneYs = [0, 2];

      for (const y of laneYs) {
        const holeSet = new Set();
        while (holeSet.size < holes) holeSet.add(randInt(0, scene.board.gridSize - 1));

        for (let x = 0; x < scene.board.gridSize; x++) {
          if (holeSet.has(x)) continue;
          trySpawn(scene, "PAWN", x, y);
        }
      }

      if (scene.floor >= 4) {
        const nx = randInt(1, scene.board.gridSize - 2);
        trySpawn(scene, "KNIGHT", nx, 1);
      }
    },
  },
];