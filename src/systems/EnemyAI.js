// EnemyAI.js – movement logic for all chess piece types

function taxicab(ax, ay, bx, by) {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

// Sliding piece moves (bishop, rook, queen): keep moving in a direction until hitting a wall or piece
// Stops at walls and occupied cells (but can attack king if occupied cell is king)
function slideMoves(board, x, y, dirs) {
  const moves = [];
  const king  = board.scene.king;

  for (const [dx, dy] of dirs) {
    let nx = x + dx;
    let ny = y + dy;

    while (board.inBounds(nx, ny) && !board.isWall(nx, ny)) {
      const occ = board.pieces[board.key(nx, ny)];
      if (occ) {
        // Only stop to attack the king
        if (occ === king) moves.push({ x: nx, y: ny, attack: true });
        break;
      }
      moves.push({ x: nx, y: ny });
      nx += dx;
      ny += dy;
    }
  }
  return moves;
}

// Pawn: advances one step toward king; can capture diagonally
function getPawnMoves(x, y, board) {
  const king  = board.scene.king;
  const moves = [];
  // Advance direction toward king 
  const dy = king.y >= y ? 1 : -1;

  // Forward move: empty = move, king = attack straight ahead
  const fy = y + dy;
  if (board.inBounds(x, fy) && !board.isWall(x, fy)) {
    const fwd = board.pieces[board.key(x, fy)];
    if (!fwd) {
      moves.push({ x, y: fy });
    } else if (fwd === king) {
      moves.push({ x, y: fy, attack: true });
    }
  }

  // Diagonal captures 
  for (const dx of [-1, 1]) {
    const nx = x + dx;
    const ny = y + dy;
    if (!board.inBounds(nx, ny) || board.isWall(nx, ny)) continue;
    const occ = board.pieces[board.key(nx, ny)];
    if (occ && occ === king) moves.push({ x: nx, y: ny, attack: true });
  }

  return moves;
}

// Knight: 8 possible moves in an L shape; can jump over pieces
function getKnightMoves(x, y, board) {
  const king   = board.scene.king;
  const deltas = [[1,2],[2,1],[2,-1],[1,-2],[-1,-2],[-2,-1],[-2,1],[-1,2]];
  const moves  = [];

  for (const [dx, dy] of deltas) {
    const nx = x + dx;
    const ny = y + dy;
    if (!board.inBounds(nx, ny) || board.isWall(nx, ny)) continue;
    const occ = board.pieces[board.key(nx, ny)];
    if (!occ) {
      moves.push({ x: nx, y: ny });
    } else if (occ === king) {
      moves.push({ x: nx, y: ny, attack: true });
    }
  }
  return moves;
}

// Get all possible moves for an enemy based on its piece type
export function getEnemyMoves(enemy, board) {
  const { x, y, type } = enemy;

  switch (type) {
    case "PAWN":
      return getPawnMoves(x, y, board);

    case "KNIGHT":
      return getKnightMoves(x, y, board);

    case "BISHOP":
      return slideMoves(board, x, y, [[-1,-1],[1,-1],[-1,1],[1,1]]);

    case "ROOK":
      return slideMoves(board, x, y, [[0,-1],[0,1],[-1,0],[1,0]]);

    case "QUEEN":
      return slideMoves(board, x, y, [
        [-1,-1],[1,-1],[-1,1],[1,1],
        [0,-1],[0,1],[-1,0],[1,0],
      ]);

    default:
      return [];
  }
}

// Choose the best move from the available options 
export function chooseBestMove(moves, king) {
  if (moves.length === 0) return null;

  // Always prefer direct attack on king
  const attacks = moves.filter((m) => m.attack);
  if (attacks.length > 0) return attacks[0];

  // Pick the move that minimizes taxicab distance to king
  let best     = null;
  let bestDist = Infinity;
  for (const m of moves) {
    const d = taxicab(m.x, m.y, king.x, king.y);
    if (d < bestDist) {
      bestDist = d;
      best     = m;
    }
  }
  return best;
}
