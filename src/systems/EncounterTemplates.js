//generative wave spawning using EnemyFactory budget system
import { generateWave } from "../generators/EnemyFactory.js";

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// decide WHERE on the board to put a list of enemy stat blocks
const PLACEMENT_STRATEGIES = [
  {
    id: "spread",
    name: "Spread",
    place(scene, statBlocks) {
      // Spread across the top 3 rows, random columns, random row
      const maxRow = Math.min(3, Math.floor(scene.board.gridSize / 3));
      const used   = new Set();
      let attempts = 0;

      for (const stats of statBlocks) {
        attempts = 0;
        while (attempts < 200) {
          attempts++;
          const x = randInt(0, scene.board.gridSize - 1);
          const y = randInt(0, maxRow - 1);
          const k = `${x},${y}`;
          if (used.has(k))               continue;
          if (scene.board.isWall(x, y))  continue;
          if (scene.board.pieces[scene.board.key(x, y)]) continue;
          used.add(k);
          scene.board.spawnEnemy(stats, x, y);
          break;
        }
      }
    },
  },

  {
    id: "flanks",
    name: "Flanks",
    place(scene, statBlocks) {
      // Heavier pieces on the flanks, weaker ones in the center
      const sorted = [...statBlocks].sort((a, b) => b.hp - a.hp);
      const mid    = Math.floor(scene.board.gridSize / 2);

      for (const stats of sorted) {
        let placed = false;
        let attempts = 0;
        while (!placed && attempts < 100) {
          attempts++;
          // Alternate left/right flanks for heavy pieces, center for light
          const gs = scene.board.gridSize - 1;
          let x;
          if (stats.hp >= 3) {
            x = attempts % 2 === 0
              ? randInt(0, Math.floor(gs / 3))
              : randInt(Math.ceil(gs * 2 / 3), gs);
          } else {
            x = Math.max(0, Math.min(gs, mid + randInt(-2, 2)));
          }
          const y = randInt(0, 2);
          if (scene.board.isWall(x, y) || scene.board.pieces[scene.board.key(x, y)]) continue;
          scene.board.spawnEnemy(stats, x, y);
          placed = true;
        }
      }
    },
  },

  {
    id: "vanguard",
    name: "Vanguard",
    place(scene, statBlocks) {
      // Strongest enemy at front (row 2), weaker ones behind (row 0-1)
      const sorted = [...statBlocks].sort((a, b) => b.hp - a.hp);
      const frontCount = Math.min(2, sorted.length);

      for (let i = 0; i < sorted.length; i++) {
        const stats = sorted[i];
        const preferRow = i < frontCount ? 2 : randInt(0, 1);
        let placed = false;
        let attempts = 0;
        while (!placed && attempts < 150) {
          attempts++;
          const x = randInt(0, scene.board.gridSize - 1);
          const y = attempts < 50 ? preferRow : randInt(0, 2);
          if (scene.board.isWall(x, y) || scene.board.pieces[scene.board.key(x, y)]) continue;
          scene.board.spawnEnemy(stats, x, y);
          placed = true;
        }
      }
    },
  },

  {
    id: "pincer",
    name: "Pincer",
    place(scene, statBlocks) {
      // Enemies split into two groups on opposite sides
      const mid   = Math.floor(statBlocks.length / 2);
      const left  = statBlocks.slice(0, mid);
      const right = statBlocks.slice(mid);

      const placeGroup = (group, xRange) => {
        for (const stats of group) {
          let placed = false, attempts = 0;
          while (!placed && attempts < 150) {
            attempts++;
            const x = randInt(xRange[0], xRange[1]);
            const y = randInt(0, 2);
            if (scene.board.isWall(x, y) || scene.board.pieces[scene.board.key(x, y)]) continue;
            scene.board.spawnEnemy(stats, x, y);
            placed = true;
          }
        }
      };

      const half = Math.floor(scene.board.gridSize / 2);
      placeGroup(left,  [0, half - 1]);
      placeGroup(right, [half, scene.board.gridSize - 1]);
    },
  },

  {
    id: "column",
    name: "Column",
    place(scene, statBlocks) {
      // Pack enemies into 1-3 columns heading straight down the middle
      const mid   = Math.floor(scene.board.gridSize / 2);
      const cols  = [mid - 1, mid, mid + 1].filter(
        (c) => c >= 0 && c < scene.board.gridSize
      );

      let colIdx = 0;
      for (const stats of statBlocks) {
        let placed = false, attempts = 0;
        while (!placed && attempts < 150) {
          attempts++;
          const x = cols[colIdx % cols.length] + (attempts > 60 ? randInt(-1, 1) : 0);
          const y = randInt(0, 2);
          const cx = Math.max(0, Math.min(scene.board.gridSize - 1, x));
          if (scene.board.isWall(cx, y) || scene.board.pieces[scene.board.key(cx, y)]) continue;
          scene.board.spawnEnemy(stats, cx, y);
          placed = true;
          colIdx++;
        }
      }
    },
  },

  {
    id: "ambush",
    name: "Ambush",
    place(scene, statBlocks) {
      // Enemies appear in the middle rows (rows 3-5)
      const minRow = 3;
      const maxRow = Math.min(5, scene.board.gridSize - 3);
      for (const stats of statBlocks) {
        let placed = false, attempts = 0;
        while (!placed && attempts < 200) {
          attempts++;
          const x = randInt(0, scene.board.gridSize - 1);
          const y = randInt(minRow, maxRow);
          if (scene.board.isWall(x, y) || scene.board.pieces[scene.board.key(x, y)]) continue;
          scene.board.spawnEnemy(stats, x, y);
          placed = true;
        }
      }
    },
  },

  {
    id: "diagonal",
    name: "Diagonal",
    place(scene, statBlocks) {
      // Place enemies along a diagonal from top-left to bottom-right 
      const gs = scene.board.gridSize;
      for (let i = 0; i < statBlocks.length; i++) {
        const stats = statBlocks[i];
        let placed = false, attempts = 0;
        while (!placed && attempts < 150) {
          attempts++;
          const offset = randInt(-1, 1);
          const col    = (i * 2) % gs;
          const row    = Math.floor((i * 2) / gs) % 3;
          const x = Math.max(0, Math.min(gs - 1, col + offset));
          const y = Math.max(0, Math.min(2, row));
          if (scene.board.isWall(x, y) || scene.board.pieces[scene.board.key(x, y)]) continue;
          scene.board.spawnEnemy(stats, x, y);
          placed = true;
        }
      }
    },
  },
];

// Pick a random placement strategy, weighted toward variety
function pickStrategy(floor) {
  // Ambush only available from floor 3+
  const available = floor >= 3
    ? PLACEMENT_STRATEGIES
    : PLACEMENT_STRATEGIES.filter((s) => s.id !== "ambush");
  return available[Math.floor(Math.random() * available.length)];
}

// The main encounter spawner – called from GameScene.spawnEncounter()
export function spawnGenerativeEncounter(scene, opts = {}) {
  const wave     = generateWave(scene.floor, opts); // stat blocks from EnemyFactory
  const strategy = pickStrategy(scene.floor);       // where to put them

  strategy.place(scene, wave);

  // Return a description for debug / future room-name display
  return {
    strategyName: strategy.name,
    enemyCount:   wave.length,
    types:        [...new Set(wave.map((e) => e.type))],
  };
}
