'use strict';
// game.js — GameBoard class: core 2048 logic (Node.js CLI)

class GameBoard {
  constructor() {
    this.size = 4;
    this.reset();
  }

  reset() {
    this.grid  = Array.from({ length: 4 }, () => Array(4).fill(0));
    this.score = 0;
    this.over  = false;
    this.won   = false;
    this.addRandom();
    this.addRandom();
  }

  clone() {
    const b   = Object.create(GameBoard.prototype);
    b.size    = 4;
    b.grid    = this.grid.map(r => [...r]);
    b.score   = this.score;
    b.over    = this.over;
    b.won     = this.won;
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
    const cells = this.emptyCells();
    if (!cells.length) return false;
    const [r, c] = cells[Math.floor(Math.random() * cells.length)];
    this.grid[r][c] = Math.random() < 0.9 ? 2 : 4;
    return true;
  }

  _slideRow(row) {
    let arr = row.filter(v => v !== 0);
    let gained = 0;
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i + 1]) {
        arr[i] *= 2; gained += arr[i];
        arr.splice(i + 1, 1);
      }
    }
    while (arr.length < 4) arr.push(0);
    return { row: arr, gained };
  }

  _rotateRight(g) {
    return g[0].map((_, c) => g.map(r => r[c]).reverse());
  }

  move(dir, sim = false) {
    const rotsBefore = [0, 2, 3, 1];
    const rotsAfter  = [0, 2, 1, 3];
    let g = this.grid.map(r => [...r]);
    for (let i = 0; i < rotsBefore[dir]; i++) g = this._rotateRight(g);

    let moved = false, totalGained = 0;
    for (let r = 0; r < 4; r++) {
      const { row, gained } = this._slideRow(g[r]);
      if (row.join() !== g[r].join()) moved = true;
      g[r] = row; totalGained += gained;
    }

    for (let i = 0; i < rotsAfter[dir]; i++) g = this._rotateRight(g);

    if (moved) {
      this.grid   = g;
      this.score += totalGained;
      if (!sim) {
        if (!this.won && this.maxTile() >= 2048) this.won = true;
        this.addRandom();
        if (!this.canMove()) this.over = true;
      }
    }
    return { moved, gained: totalGained };
  }

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

  maxTile() { return Math.max(...this.grid.flat()); }

  validMoves() {
    return [0, 1, 2, 3].filter(d => {
      const b = this.clone();
      return b.move(d, true).moved;
    });
  }
}

module.exports = GameBoard;
