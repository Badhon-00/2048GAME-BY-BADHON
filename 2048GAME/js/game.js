/* =========================================
   game.js — Core 2048 Logic + AI Engine
   ========================================= */

class GameBoard {
  constructor() {
    this.size = 4;
    this.reset();
  }

  reset() {
    this.grid = Array.from({ length: 4 }, () => Array(4).fill(0));
    this.score = 0;
    this.over = false;
    this.won = false;
    this.addRandom();
    this.addRandom();
  }

  clone() {
    const b = new GameBoard();
    b.grid = this.grid.map(r => [...r]);
    b.score = this.score;
    b.over = this.over;
    b.won = this.won;
    return b;
  }

  emptyCells() {
    const cells = [];
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 4; c++)
        if (this.grid[r][c] === 0) cells.push([r, c]);
    return cells;
  }

  addRandom() {
    const empty = this.emptyCells();
    if (!empty.length) return false;
    const [r, c] = empty[Math.floor(Math.random() * empty.length)];
    this.grid[r][c] = Math.random() < 0.9 ? 2 : 4;
    return true;
  }

  /* Slide + merge a single row (left) */
  slideRow(row) {
    let arr = row.filter(v => v !== 0);
    let gained = 0;
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i + 1]) {
        arr[i] *= 2;
        gained += arr[i];
        arr.splice(i + 1, 1);
      }
    }
    while (arr.length < 4) arr.push(0);
    return { row: arr, gained };
  }

  /* Move: 0=left,1=right,2=up,3=down. Returns {moved, gained} */
  move(dir) {
    let moved = false;
    let totalGained = 0;

    const rotate90 = (g) => g[0].map((_, c) => g.map(r => r[c]).reverse());
    const rotateGrid = (g, times) => {
      let res = g;
      for (let i = 0; i < times; i++) res = rotate90(res);
      return res;
    };

    /* Normalise: always slide left on rotated grid */
    const rotations = [0, 0, 3, 1]; // left=0,right=0 (flipped),up=3,down=1
    let g = this.grid.map(r => [...r]);

    if (dir === 1) g = g.map(r => [...r].reverse()); // right: reverse rows
    else if (dir === 2 || dir === 3) g = rotateGrid(g, rotations[dir]);

    for (let r = 0; r < 4; r++) {
      const { row, gained } = this.slideRow(g[r]);
      if (row.join() !== g[r].join()) moved = true;
      g[r] = row;
      totalGained += gained;
    }

    if (dir === 1) g = g.map(r => [...r].reverse());
    else if (dir === 2 || dir === 3) g = rotateGrid(g, (4 - rotations[dir]) % 4);

    if (moved) {
      this.grid = g;
      this.score += totalGained;
      if (!this.won && this.maxTile() >= 2048) this.won = true;
      this.addRandom();
      if (!this.canMove()) this.over = true;
    }
    return { moved, gained: totalGained };
  }

  /* Check any move possible */
  canMove() {
    if (this.emptyCells().length > 0) return true;
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 4; c++) {
        const v = this.grid[r][c];
        if (c < 3 && this.grid[r][c + 1] === v) return true;
        if (r < 3 && this.grid[r + 1][c] === v) return true;
      }
    return false;
  }

  maxTile() {
    return Math.max(...this.grid.flat());
  }

  validMoves() {
    return [0, 1, 2, 3].filter(dir => {
      const b = this.clone();
      const g0 = JSON.stringify(b.grid);
      // simulate without adding tile
      const result = b._moveSim(dir);
      return result.moved;
    });
  }

  /* Simulate move (no random tile added) */
  _moveSim(dir) {
    const rotate90 = (g) => g[0].map((_, c) => g.map(r => r[c]).reverse());
    const rotateGrid = (g, times) => {
      let res = g;
      for (let i = 0; i < times; i++) res = rotate90(res);
      return res;
    };
    const rotations = [0, 0, 3, 1];
    let g = this.grid.map(r => [...r]);
    if (dir === 1) g = g.map(r => [...r].reverse());
    else if (dir === 2 || dir === 3) g = rotateGrid(g, rotations[dir]);
    let moved = false;
    let gained = 0;
    for (let r = 0; r < 4; r++) {
      const res = this.slideRow(g[r]);
      if (res.row.join() !== g[r].join()) moved = true;
      g[r] = res.row;
      gained += res.gained;
    }
    if (dir === 1) g = g.map(r => [...r].reverse());
    else if (dir === 2 || dir === 3) g = rotateGrid(g, (4 - rotations[dir]) % 4);
    if (moved) { this.grid = g; this.score += gained; }
    return { moved, gained };
  }
}

/* =========================================
   AI ENGINE
   ========================================= */
class AIEngine {
  constructor(difficulty = 'normal') {
    this.difficulty = difficulty;
    this.depths = { easy: 0, normal: 3, hard: 5, extreme: 7 };
  }

  bestMove(board) {
    if (this.difficulty === 'easy') return this._randomMove(board);
    const depth = this.depths[this.difficulty];
    return this._expectimax(board, depth);
  }

  _randomMove(board) {
    const valid = board.validMoves();
    if (!valid.length) return -1;
    return valid[Math.floor(Math.random() * valid.length)];
  }

  _expectimax(board, depth) {
    const valid = board.validMoves();
    if (!valid.length) return -1;
    let bestScore = -Infinity;
    let bestDir = valid[0];
    for (const dir of valid) {
      const b = board.clone();
      const { moved } = b._moveSim(dir);
      if (!moved) continue;
      const score = this._expectNode(b, depth - 1);
      if (score > bestScore) { bestScore = score; bestDir = dir; }
    }
    return bestDir;
  }

  _expectNode(board, depth) {
    if (depth === 0 || board.over) return this._heuristic(board);
    const empty = board.emptyCells();
    if (!empty.length) return this._heuristic(board);
    let score = 0;
    const sample = depth <= 2 ? empty : this._sampleCells(empty, 4);
    for (const [r, c] of sample) {
      for (const [val, prob] of [[2, 0.9], [4, 0.1]]) {
        const b = board.clone();
        b.grid[r][c] = val;
        score += prob * this._maxNode(b, depth - 1);
      }
    }
    return score / sample.length;
  }

  _maxNode(board, depth) {
    if (depth === 0 || board.over) return this._heuristic(board);
    const valid = board.validMoves();
    if (!valid.length) return this._heuristic(board);
    let best = -Infinity;
    for (const dir of valid) {
      const b = board.clone();
      const { moved } = b._moveSim(dir);
      if (!moved) continue;
      const s = this._expectNode(b, depth - 1);
      if (s > best) best = s;
    }
    return best;
  }

  _sampleCells(cells, n) {
    const shuffled = [...cells].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(n, shuffled.length));
  }

  _heuristic(board) {
    const g = board.grid;
    const flat = g.flat();

    // Empty cells
    const empty = flat.filter(v => v === 0).length;

    // Monotonicity
    let mono = 0;
    for (let r = 0; r < 4; r++) {
      let incR = 0, decR = 0;
      for (let c = 1; c < 4; c++) {
        if (g[r][c] > g[r][c - 1]) incR += Math.log2(g[r][c] || 1) - Math.log2(g[r][c - 1] || 1);
        else decR += Math.log2(g[r][c - 1] || 1) - Math.log2(g[r][c] || 1);
      }
      mono -= Math.min(incR, decR);
    }
    for (let c = 0; c < 4; c++) {
      let incC = 0, decC = 0;
      for (let r = 1; r < 4; r++) {
        if (g[r][c] > g[r - 1][c]) incC += Math.log2(g[r][c] || 1) - Math.log2(g[r - 1][c] || 1);
        else decC += Math.log2(g[r - 1][c] || 1) - Math.log2(g[r][c] || 1);
      }
      mono -= Math.min(incC, decC);
    }

    // Smoothness (penalise big differences between adjacent tiles)
    let smooth = 0;
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 4; c++) {
        if (g[r][c]) {
          if (c < 3 && g[r][c + 1]) smooth -= Math.abs(Math.log2(g[r][c]) - Math.log2(g[r][c + 1]));
          if (r < 3 && g[r + 1][c]) smooth -= Math.abs(Math.log2(g[r][c]) - Math.log2(g[r + 1][c]));
        }
      }

    // Max tile in corner bonus
    const maxVal = Math.max(...flat);
    const corners = [g[0][0], g[0][3], g[3][0], g[3][3]];
    const cornerBonus = corners.includes(maxVal) ? Math.log2(maxVal) * 2 : 0;

    // Merge potential
    let merges = 0;
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 4; c++) {
        if (c < 3 && g[r][c] && g[r][c] === g[r][c + 1]) merges++;
        if (r < 3 && g[r][c] && g[r][c] === g[r + 1][c]) merges++;
      }

    return (
      empty * 270 +
      mono * 47 +
      smooth * 0.1 +
      cornerBonus * 100 +
      merges * 700 +
      board.score * 0.1
    );
  }
}

/* Expose globally */
window.GameBoard = GameBoard;
window.AIEngine = AIEngine;
