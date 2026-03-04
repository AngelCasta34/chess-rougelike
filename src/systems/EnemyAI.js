export const EncounterTemplates = [
  {
    id: "pawn_swarm",
    name: "Pawn Swarm",
    spawn(scene) {
      const kx = Math.floor(scene.gridSize / 2);
      const count = Math.min(3 + scene.floor, 8);

      for (let i = 0; i < count; i++) {
        const ex = Phaser.Math.Clamp(kx - Math.floor(count / 2) + i, 0, scene.gridSize - 1);
        const ey = 0;
        scene.spawnEnemy("PAWN", ex, scene.pieces[`${ex},${ey}`] ? 1 : 0);
      }
    },
  },
  {
    id: "knight_pressure",
    name: "Knight Pressure",
    spawn(scene) {
      const kx = Math.floor(scene.gridSize / 2);

      // still spawn a couple pawns
      scene.spawnEnemy("PAWN", kx - 1, 0);
      scene.spawnEnemy("PAWN", kx + 1, 0);

      // place "knights" as enemies (we’ll implement knight moves next)
      scene.spawnEnemy("KNIGHT", 1, 1);
      scene.spawnEnemy("KNIGHT", scene.gridSize - 2, 1);
    },
  },
];