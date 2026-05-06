#!/usr/bin/env node
'use strict';
// main.js — 2048 Terminal UI (Node.js CLI)
// Controls: W/A/S/D or arrow keys | R=restart | Q=quit

const GameBoard = require('./game');
const AIEngine  = require('./ai');
const readline  = require('readline');

// ── ANSI helpers ──────────────────────────────────────────────────────────────
const RESET = '\x1b[0m', BOLD = '\x1b[1m';
const bg = (r,g,b) => `\x1b[48;2;${r};${g};${b}m`;
const fg = (r,g,b) => `\x1b[38;2;${r};${g};${b}m`;

function tileStr(val) {
  const styles = {
    0:    [bg(205,193,180), fg(205,193,180), '     '],
    2:    [bg(238,228,218), fg(119,110,101), '  2  '],
    4:    [bg(237,224,200), fg(119,110,101), '  4  '],
    8:    [bg(242,177,121), fg(249,246,242), '  8  '],
    16:   [bg(245,149, 99), fg(249,246,242), ' 16  '],
    32:   [bg(246,124, 95), fg(249,246,242), ' 32  '],
    64:   [bg(246, 94, 59), fg(249,246,242), ' 64  '],
    128:  [bg(237,207,114), fg(249,246,242), ' 128 '],
    256:  [bg(237,204, 97), fg(249,246,242), ' 256 '],
    512:  [bg(237,200, 80), fg(249,246,242), ' 512 '],
    1024: [bg(237,197, 63), fg(249,246,242), '1024 '],
    2048: [bg(237,194, 46), fg(249,246,242), '2048 '],
  };
  if (styles[val]) {
    const [b, f, label] = styles[val];
    return `${b}${f}${BOLD}${label}${RESET}`;
  }
  return `${bg(60,58,50)}${fg(249,246,242)}${BOLD}${String(val).padStart(4,' ')} ${RESET}`;
}

function drawBoard(board, label, labelColor = '\x1b[36m') {
  const pad = bg(187,173,160);
  process.stdout.write(`\n  ${BOLD}${labelColor}${label}${RESET}   ${BOLD}Score: \x1b[33m${board.score}${RESET}\n`);
  process.stdout.write(`  ${pad}${' '.repeat(33)}${RESET}\n`);
  for (const row of board.grid) {
    process.stdout.write(`  ${pad} ${RESET}`);
    for (const val of row) process.stdout.write(tileStr(val) + `${pad} ${RESET}`);
    process.stdout.write('\n');
  }
  process.stdout.write(`  ${pad}${' '.repeat(33)}${RESET}\n`);
}

function clear() { process.stdout.write('\x1bc'); }

// ── Raw keyboard ──────────────────────────────────────────────────────────────
readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) process.stdin.setRawMode(true);

const KEY_DIR = { a:0, left:0, d:1, right:1, w:2, up:2, s:3, down:3 };

let keyResolve = null;
const keyQueue = [];

process.stdin.on('keypress', (ch, key) => {
  if (key && (key.ctrl && key.name === 'c')) { process.stdout.write('\x1b[?25h\n'); process.exit(0); }
  const name = (key && key.name) ? key.name.toLowerCase() : (ch || '').toLowerCase();
  if (keyResolve) { const r = keyResolve; keyResolve = null; r(name); }
  else keyQueue.push(name);
});

function getKey() {
  if (keyQueue.length) return Promise.resolve(keyQueue.shift());
  return new Promise(res => { keyResolve = res; });
}

function keyToDir(k) { return KEY_DIR[k] !== undefined ? KEY_DIR[k] : -1; }

// ── Non-blocking drain ────────────────────────────────────────────────────────
function drainKeys() { while (keyQueue.length) keyQueue.shift(); }

// ── MODES ─────────────────────────────────────────────────────────────────────
async function playSolo() {
  let b = new GameBoard();
  while (true) {
    clear();
    process.stdout.write(`\n  ${BOLD}\x1b[33m2048 — Solo Play${RESET}  W/A/S/D · R=restart · Q=quit\n`);
    drawBoard(b, 'YOU', '\x1b[32m');
    if (b.won)  process.stdout.write(`  ${BOLD}\x1b[32m★ You reached 2048! Keep going!\x1b[0m\n`);
    if (b.over) { process.stdout.write(`  ${BOLD}\x1b[31mGame Over!\x1b[0m\n`); break; }
    const k = await getKey();
    if (k === 'q') break;
    if (k === 'r') { b = new GameBoard(); continue; }
    const d = keyToDir(k);
    if (d >= 0) b.move(d);
  }
  process.stdout.write(`\n  Final score: ${BOLD}${b.score}${RESET}  Best tile: ${BOLD}${b.maxTile()}${RESET}\n`);
  process.stdout.write('\n  Press any key...'); await getKey();
}

async function watchAI(diff) {
  let b = new GameBoard();
  const ai = new AIEngine(diff);
  let moves = 0, paused = false;
  const col = { easy:'\x1b[32m', normal:'\x1b[34m', hard:'\x1b[33m', extreme:'\x1b[31m' }[diff] || '\x1b[36m';

  const loop = () => new Promise(res => {
    function step() {
      if (b.over) return res();
      clear();
      process.stdout.write(`\n  ${BOLD}\x1b[33m2048 — Watch AI (${diff})${RESET}  P=pause · Q=quit  Moves=${moves}\n`);
      drawBoard(b, `AI [${diff}]`, col);
      if (b.won) process.stdout.write(`  ${BOLD}\x1b[32m★ AI reached 2048!\x1b[0m\n`);
      if (paused) {
        process.stdout.write(`  ${BOLD}\x1b[36m[PAUSED] Press P to resume\x1b[0m\n`);
        getKey().then(k => { if (k==='p') paused=false; if(k==='q') b.over=true; step(); });
        return;
      }
      if (keyQueue.length) {
        const k = keyQueue.shift();
        if (k === 'q') { b.over = true; return res(); }
        if (k === 'p') { paused = true; step(); return; }
      }
      const d = ai.bestMove(b);
      if (d < 0) return res();
      b.move(d); moves++;
      setTimeout(step, 120);
    }
    step();
  });

  await loop();
  clear();
  drawBoard(b, 'AI — FINISHED', '\x1b[35m');
  process.stdout.write(`\n  Moves: ${moves}  Score: ${BOLD}${b.score}${RESET}  Best: ${BOLD}${b.maxTile()}${RESET}\n`);
  process.stdout.write('\n  Press any key...'); await getKey();
}

async function vsAI(diff) {
  let human = new GameBoard(), aiBoard = new GameBoard();
  const ai = new AIEngine(diff);
  while (!(human.over && aiBoard.over)) {
    clear();
    process.stdout.write(`\n  ${BOLD}\x1b[33m2048 — You vs AI (${diff})${RESET}  W/A/S/D · R=restart · Q=quit\n\n`);
    drawBoard(human,   'YOU',       '\x1b[32m');
    drawBoard(aiBoard, `AI(${diff})`,'\x1b[35m');
    if (human.over)   process.stdout.write(`  \x1b[31mYour board: GAME OVER\x1b[0m\n`);
    if (aiBoard.over) process.stdout.write(`  \x1b[33mAI board: FINISHED\x1b[0m\n`);
    if (human.over && aiBoard.over) break;
    if (!human.over) {
      const k = await getKey();
      if (k === 'q') break;
      if (k === 'r') { human = new GameBoard(); aiBoard = new GameBoard(); drainKeys(); continue; }
      const d = keyToDir(k);
      if (d >= 0) human.move(d);
    }
    if (!aiBoard.over) { const d = ai.bestMove(aiBoard); if (d >= 0) aiBoard.move(d); }
  }
  process.stdout.write(`\n  YOU : ${human.score}  (best ${human.maxTile()})\n`);
  process.stdout.write(`  AI  : ${aiBoard.score}  (best ${aiBoard.maxTile()})\n`);
  const winner = human.score > aiBoard.score ? `${BOLD}\x1b[32mYOU WIN!\x1b[0m`
               : aiBoard.score > human.score ? `${BOLD}\x1b[35mAI WINS!\x1b[0m`
               : `${BOLD}\x1b[33mTIE!\x1b[0m`;
  process.stdout.write(`  ${winner}\n`);
  process.stdout.write('\n  Press any key...'); await getKey();
}

async function vsFriend() {
  let p1 = new GameBoard(), p2 = new GameBoard();
  let turn = 0;
  while (!(p1.over && p2.over)) {
    clear();
    process.stdout.write(`\n  ${BOLD}\x1b[33m2048 — Player 1 vs Player 2${RESET}  W/A/S/D · R=restart · Q=quit\n\n`);
    drawBoard(p1, 'PLAYER 1', '\x1b[32m');
    drawBoard(p2, 'PLAYER 2', '\x1b[34m');
    const active = turn === 0 ? p1 : p2;
    if (active.over) { turn = 1 - turn; continue; }
    const col = turn === 0 ? '\x1b[32m' : '\x1b[34m';
    process.stdout.write(`  ${BOLD}${col}*** PLAYER ${turn+1}'S TURN ***\x1b[0m\n`);
    const k = await getKey();
    if (k === 'q') break;
    if (k === 'r') { p1 = new GameBoard(); p2 = new GameBoard(); turn = 0; drainKeys(); continue; }
    const d = keyToDir(k);
    if (d >= 0) { active.move(d); turn = 1 - turn; }
  }
  process.stdout.write(`\n  P1: ${p1.score}  (best ${p1.maxTile()})\n`);
  process.stdout.write(`  P2: ${p2.score}  (best ${p2.maxTile()})\n`);
  const winner = p1.score > p2.score ? `${BOLD}\x1b[32mPLAYER 1 WINS!\x1b[0m`
               : p2.score > p1.score ? `${BOLD}\x1b[34mPLAYER 2 WINS!\x1b[0m`
               : `${BOLD}\x1b[33mTIE!\x1b[0m`;
  process.stdout.write(`  ${winner}\n`);
  process.stdout.write('\n  Press any key...'); await getKey();
}

// ── Menu ──────────────────────────────────────────────────────────────────────
async function selectMode() {
  while (true) {
    clear();
    process.stdout.write(`
  ${BOLD}\x1b[33m╔══════════════════════════╗
  ║   2048  (Node.js CLI)    ║
  ╚══════════════════════════╝${RESET}

  1) Solo Play
  2) Watch AI
  3) You vs AI
  4) vs Friend (take turns)
  Q) Quit

  Choice: `);
    const k = await getKey();
    if (k === '1') return 'solo';
    if (k === '2') return 'ai';
    if (k === '3') return 'vs-ai';
    if (k === '4') return 'vs-friend';
    if (k === 'q') { process.stdout.write('\n'); process.exit(0); }
  }
}

async function selectDifficulty() {
  while (true) {
    clear();
    process.stdout.write(`
  ${BOLD}AI Difficulty:${RESET}

  1) \x1b[32mEasy\x1b[0m
  2) \x1b[34mNormal\x1b[0m
  3) \x1b[33mHard\x1b[0m
  4) \x1b[31mExtreme\x1b[0m

  Choice: `);
    const k = await getKey();
    if (k === '1') return 'easy';
    if (k === '2') return 'normal';
    if (k === '3') return 'hard';
    if (k === '4') return 'extreme';
  }
}

// ── Entry ─────────────────────────────────────────────────────────────────────
(async () => {
  while (true) {
    const mode = await selectMode();
    const diff = ['ai','vs-ai'].includes(mode) ? await selectDifficulty() : null;
    if (mode === 'solo')       await playSolo();
    else if (mode === 'ai')    await watchAI(diff);
    else if (mode === 'vs-ai') await vsAI(diff);
    else                       await vsFriend();
  }
})();
