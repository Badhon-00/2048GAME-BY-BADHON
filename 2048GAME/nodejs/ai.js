'use strict';
// ai.js — AIEngine: Expectimax AI for 2048 (Node.js CLI)
const GameBoard = require('./game');

class AIEngine {
  constructor(difficulty = 'normal') {
    this.difficulty = difficulty;
    this.depths = { easy: 0, normal: 3, hard: 5, extreme: 7 };
  }

  bestMove(board) {
    if (this.difficulty === 'easy') return this._randomMove(board);
    return this._expectimax(board, this.depths[this.difficulty] || 3);
  }

  _randomMove(board) {
    const m = board.validMoves();
    return m.length ? m[Math.floor(Math.random() * m.length)] : -1;
  }

  _expectimax(board, depth) {
    const moves = board.validMoves();
    if (!moves.length) return -1;
    let bestScore = -Infinity, bestDir = moves[0];
    for (const d of moves) {
      const b = board.clone();
      if (!b.move(d, true).moved) continue;
      const s = this._expectNode(b, depth - 1);
      if (s > bestScore) { bestScore = s; bestDir = d; }
    }
    return bestDir;
  }

  _expectNode(board, depth) {
    if (depth === 0 || board.over) return this._heuristic(board);
    const cells = board.emptyCells();
    if (!cells.length) return this._heuristic(board);
    const sample = depth <= 2 ? cells : this._sample(cells, 4);
    let score = 0;
    for (const [r, c] of sample)
      for (const [val, prob] of [[2, 0.9], [4, 0.1]]) {
        const b = board.clone(); b.grid[r][c] = val;
        score += prob * this._maxNode(b, depth - 1);
      }
    return score / sample.length;
  }

  _maxNode(board, depth) {
    if (depth === 0 || board.over) return this._heuristic(board);
    const moves = board.validMoves();
    if (!moves.length) return this._heuristic(board);
    let best = -Infinity;
    for (const d of moves) {
      const b = board.clone();
      if (!b.move(d, true).moved) continue;
      const s = this._expectNode(b, depth - 1);
      if (s > best) best = s;
    }
    return best;
  }

  _heuristic(board) {
    const g = board.grid;
    const lg = v => v > 0 ? Math.log2(v) : 0;
    const empty = g.flat().filter(v => !v).length;

    let mono = 0;
    for (let r = 0; r < 4; r++) {
      let inc = 0, dec = 0;
      for (let c = 1; c < 4; c++) {
        const d = lg(g[r][c]) - lg(g[r][c-1]);
        d > 0 ? (inc += d) : (dec -= d);
      }
      mono -= Math.min(inc, dec);
    }
    for (let c = 0; c < 4; c++) {
      let inc = 0, dec = 0;
      for (let r = 1; r < 4; r++) {
        const d = lg(g[r][c]) - lg(g[r-1][c]);
        d > 0 ? (inc += d) : (dec -= d);
      }
      mono -= Math.min(inc, dec);
    }

    let smooth = 0;
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 4; c++) {
        if (!g[r][c]) continue;
        if (c < 3 && g[r][c+1]) smooth -= Math.abs(lg(g[r][c]) - lg(g[r][c+1]));
        if (r < 3 && g[r+1][c]) smooth -= Math.abs(lg(g[r][c]) - lg(g[r+1][c]));
      }

    const maxVal = board.maxTile();
    const corners = [g[0][0], g[0][3], g[3][0], g[3][3]];
    const cornerBonus = corners.includes(maxVal) ? lg(maxVal) * 2 : 0;

    let merges = 0;
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 4; c++) {
        if (c < 3 && g[r][c] && g[r][c] === g[r][c+1]) merges++;
        if (r < 3 && g[r][c] && g[r][c] === g[r+1][c]) merges++;
      }

    return empty*270 + mono*47 + smooth*0.1 + cornerBonus*100 + merges*700 + board.score*0.1;
  }

  _sample(cells, n) {
    return [...cells].sort(() => Math.random() - 0.5).slice(0, n);
  }
}

module.exports = AIEngine;
