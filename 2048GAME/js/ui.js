/* ═══════════════════════════════════════════
   ui.js — Game UI, Modes, Controls, Scoreboard
   Modes: solo | ai (watch) | vs-ai | vs-friend
   Difficulties: easy | medium | hard
═══════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── State ── */
  const S = {
    mode:      'solo',
    diff:      'medium',
    boards:    [],
    turn:      0,
    aiRunning: false,
    aiPaused:  false,
    aiTimer:   null,
    active:    false,
    names:     ['', ''],   // player names
    currentRank: null,     // rank of this game in scoreboard
  };

  /* ── DOM ── */
  const $ = id => document.getElementById(id);
  const menuScreen  = $('menu-screen');
  const gameScreen  = $('game-screen');
  const diffSection = $('diff-section');
  const diffHint    = $('diff-hint');
  const startBtn    = $('start-btn');
  const menuBtn     = $('menu-btn');
  const restartBtn  = $('restart-btn');
  const boardsArea  = $('boards-area');
  const ghScores    = $('gh-scores');
  const gameBanner  = $('game-banner');
  const aiBar       = $('ai-bar');
  const aiToggleBtn = $('ai-toggle');
  const aiSpeedIn   = $('ai-speed');
  const touchHint   = $('touch-hint');
  const overlay     = $('game-overlay');
  const goEmoji     = $('go-emoji');
  const goTitle     = $('go-title');
  const goSub       = $('go-sub');
  const goScores    = $('go-scores');
  const goAgain     = $('go-again');
  const goMenuBtn   = $('go-menu');
  const sbSection   = $('sb-section');
  const sbTitle     = $('sb-title');
  const sbBadge     = $('sb-badge');
  const sbList      = $('sb-list');
  const nameModal   = $('name-modal');
  const nmTitle     = $('nm-title');
  const nmFields    = $('nm-fields');
  const nmConfirm   = $('nm-confirm');
  const nmCancel    = $('nm-cancel');

  /* ── Difficulty ── */
  const DIFF_HINTS = {
    easy:   'Random moves — great for beginners',
    medium: 'Expectimax depth 3 — solid strategy',
    hard:   'Expectimax depth 5 — tough opponent',
  };
  const AI_DEPTHS = { easy: 0, medium: 3, hard: 5 };
  const AI_LABELS = { easy: 'MELISSA AI', medium: 'MELISSA AI', hard: 'MELISSA AI' };

  /* ══════════════════════════════════════════
     SCOREBOARD  (localStorage)
  ══════════════════════════════════════════ */
  const SB_KEYS = { solo: 'sb_solo', ai: 'sb_ai', 'vs-ai': 'sb_vsai', 'vs-friend': 'sb_vsfriend' };
  const SB_MAX  = 20;

  function getScores(mode) {
    try { return JSON.parse(localStorage.getItem(SB_KEYS[mode]) || '[]'); }
    catch { return []; }
  }
  function saveScores(mode, arr) {
    try { localStorage.setItem(SB_KEYS[mode], JSON.stringify(arr)); } catch {}
  }

  /* Add one entry, keep top SB_MAX sorted by score desc */
  function addScore(mode, entry) {
    const arr = getScores(mode);
    arr.push(entry);
    arr.sort((a, b) => (b.score || b.score1 || 0) - (a.score || a.score1 || 0));
    if (arr.length > SB_MAX) arr.length = SB_MAX;
    saveScores(mode, arr);
    // return the rank (1-based) of the just-added entry
    return arr.findIndex(e => e === entry) + 1;
  }

  function fmtDate(ts) {
    const d = new Date(ts);
    return `${d.getMonth()+1}/${d.getDate()}`;
  }

  /* ── Render scoreboard into #sb-list ── */
  function renderScoreboard(mode, highlightScore) {
    const rows = getScores(mode);
    sbSection.style.display = rows.length ? 'block' : 'none';
    if (!rows.length) return;

    const modeNames = { solo:'Solo', ai:'Watch AI', 'vs-ai':'vs AI', 'vs-friend':'vs Friend' };
    sbTitle.textContent = `🏅 ${modeNames[mode] || mode} Scoreboard`;
    sbBadge.textContent = `Top ${rows.length}`;

    sbList.innerHTML = rows.map((e, i) => {
      let nameCol, scoreCol, extraCol;
      if (mode === 'solo') {
        nameCol  = esc(e.name);
        scoreCol = (+e.score).toLocaleString();
        extraCol = `Best: ${e.bestTile}`;
      } else if (mode === 'ai') {
        nameCol  = esc(e.diff || 'AI');
        scoreCol = (+e.score).toLocaleString();
        extraCol = `Best: ${e.bestTile}`;
      } else if (mode === 'vs-ai') {
        nameCol  = esc(e.name);
        scoreCol = (+e.score).toLocaleString();
        extraCol = e.result === 'win' ? '🏆' : (e.result === 'tie' ? '🤝' : '🤖');
      } else {
        nameCol  = `${esc(e.name1)} vs ${esc(e.name2)}`;
        scoreCol = `${(+e.score1).toLocaleString()} – ${(+e.score2).toLocaleString()}`;
        extraCol = esc(e.winner);
      }

      const isHighlight = (mode === 'vs-friend')
        ? (e.score1 === highlightScore)
        : (e.score === highlightScore);

      return `<div class="sb-row${isHighlight ? ' sb-current' : ''}">
        <span class="sb-rank">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}</span>
        <span class="sb-name">${nameCol}</span>
        <span class="sb-score">${scoreCol}</span>
        <span class="sb-extra">${extraCol}</span>
        <span class="sb-date">${fmtDate(e.date)}</span>
      </div>`;
    }).join('');
  }

  function esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  /* ══════════════════════════════════════════
     MENU INTERACTIONS
  ══════════════════════════════════════════ */
  document.querySelectorAll('.mode-card').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-card').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      S.mode = btn.dataset.mode;
      const needDiff = S.mode === 'vs-ai' || S.mode === 'ai';
      diffSection.style.display = needDiff ? 'flex' : 'none';
    });
  });

  document.querySelectorAll('.diff-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.diff-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      S.diff = btn.dataset.diff;
      diffHint.textContent = DIFF_HINTS[S.diff] || '';
    });
  });

  startBtn.addEventListener('click',    () => showNameModal(false));
  menuBtn.addEventListener('click',     goMenu_fn);
  restartBtn.addEventListener('click',  restartSameGame);
  goAgain.addEventListener('click',     restartSameGame);
  goMenuBtn.addEventListener('click',   goMenu_fn);
  aiToggleBtn.addEventListener('click', toggleAI);

  /* ══════════════════════════════════════════
     NAME MODAL
  ══════════════════════════════════════════ */
  function showNameModal() {
    const mode = S.mode;
    nmFields.innerHTML = '';

    if (mode === 'ai') {
      // Watch AI — no name needed, just launch
      S.names = ['AI', 'AI'];
      startGame();
      return;
    }

    if (mode === 'solo') {
      nmTitle.textContent = '👤 Enter your name';
      nmFields.innerHTML = makeInput('nm-p1', 'Your name', 'Player 1');
    } else if (mode === 'vs-ai') {
      nmTitle.textContent = '🤖 Your name to challenge the AI';
      nmFields.innerHTML = makeInput('nm-p1', 'Your name', 'Player 1');
    } else if (mode === 'vs-friend') {
      nmTitle.textContent = '👥 Enter player names';
      nmFields.innerHTML =
        makeInput('nm-p1', 'Player 1 name', 'Player 1') +
        makeInput('nm-p2', 'Player 2 name', 'Player 2');
    }

    nameModal.style.display = 'flex';
    const first = nmFields.querySelector('input');
    if (first) setTimeout(() => first.focus(), 80);
  }

  function makeInput(id, label, placeholder) {
    return `<div class="nm-field-wrap">
      <label class="nm-label" for="${id}">${label}</label>
      <input class="nm-input" id="${id}" type="text" maxlength="20"
             placeholder="${placeholder}" autocomplete="off" />
    </div>`;
  }

  nmConfirm.addEventListener('click', () => {
    const p1Input = $('nm-p1');
    const p2Input = $('nm-p2');
    S.names[0] = (p1Input ? p1Input.value.trim() : '') || 'Player 1';
    S.names[1] = (p2Input ? p2Input.value.trim() : '') || 'Player 2';
    nameModal.style.display = 'none';
    startGame();
  });

  nmCancel.addEventListener('click', () => {
    nameModal.style.display = 'none';
  });

  // Allow pressing Enter to confirm
  nameModal.addEventListener('keydown', e => {
    if (e.key === 'Enter') nmConfirm.click();
    if (e.key === 'Escape') nmCancel.click();
  });

  /* ══════════════════════════════════════════
     START GAME
  ══════════════════════════════════════════ */
  function startGame() {
    stopAI();
    overlay.style.display = 'none';
    S.boards = [];
    S.turn = 0;
    S.active = true;
    S.currentRank = null;
    boardsArea.innerHTML = '';
    boardsArea.className = 'boards-area';
    ghScores.innerHTML = '';

    switch (S.mode) {
      case 'solo':      buildSolo();      break;
      case 'ai':        buildWatchAI();   break;
      case 'vs-ai':     buildVsAI();      break;
      case 'vs-friend': buildVsFriend();  break;
    }

    showGameScreen();
    renderAllBoards();
    updateBanner();
    updateScores();

    if (S.mode === 'ai' || S.mode === 'vs-ai') {
      aiBar.style.display = 'flex';
      S.aiPaused = false;
      aiToggleBtn.textContent = '⏸ Pause';
      aiToggleBtn.classList.remove('paused');
      startAI();
    } else {
      aiBar.style.display = 'none';
    }

    touchHint.style.display = 'none';
  }

  function restartSameGame() {
    // Restart with the same player names — no name modal
    startGame();
  }

  /* ── Build helpers ── */
  function makeBoard(label, isAI, pClass) {
    const b = {
      board: new GameBoard(),
      label, isAI, pClass,
      el: null, labelEl: null, boardEl: null, scoreEl: null,
      warnedWin: false,
    };
    if (isAI) b.ai = new AIEngine(S.diff);
    return b;
  }

  function buildSolo() {
    S.boards.push(makeBoard(S.names[0], false, 'lbl-solo'));
  }
  function buildWatchAI() {
    S.boards.push(makeBoard(AI_LABELS[S.diff] || 'AI', true, 'lbl-ai'));
  }
  function buildVsAI() {
    boardsArea.classList.add('two-boards');
    S.boards.push(makeBoard(S.names[0], false, 'lbl-p1'));
    S.boards.push(makeBoard(AI_LABELS[S.diff] || 'AI', true, 'lbl-ai'));
  }
  function buildVsFriend() {
    boardsArea.classList.add('two-boards');
    S.boards.push(makeBoard(S.names[0], false, 'lbl-p1'));
    S.boards.push(makeBoard(S.names[1], false, 'lbl-p2'));
  }

  /* ══════════════════════════════════════════
     RENDER BOARDS
  ══════════════════════════════════════════ */
  function renderAllBoards() {
    boardsArea.innerHTML = '';
    ghScores.innerHTML = '';
    S.boards.forEach((b, i) => {
      const { container, boardEl, labelEl } = createBoardDOM(b, i);
      boardsArea.appendChild(container);
      b.el = container;
      b.boardEl = boardEl;
      b.labelEl = labelEl;

      const sc = createScoreBox(b, i);
      ghScores.appendChild(sc);
      b.scoreEl = sc.querySelector('.sval');
    });
    drawAllTiles();
    highlightActiveBoard();
  }

  function createBoardDOM(b) {
    const container = document.createElement('div');
    container.className = 'board-container';

    const labelEl = document.createElement('div');
    labelEl.className = 'board-player-label ' + (b.pClass || '');
    labelEl.textContent = b.label;

    const boardEl = document.createElement('div');
    boardEl.className = 'board';
    for (let i = 0; i < 16; i++) {
      const cell = document.createElement('div');
      cell.className = 'board-cell';
      boardEl.appendChild(cell);
    }

    container.appendChild(labelEl);
    container.appendChild(boardEl);
    return { container, boardEl, labelEl };
  }

  function createScoreBox(b, i) {
    const div = document.createElement('div');
    const cls = b.isAI ? 'ai-box' : (i === 0 ? 'p1-box' : 'p2-box');
    if (S.mode === 'solo' || S.mode === 'ai') div.className = 'score-box';
    else div.className = 'score-box ' + cls;
    const lbl = b.isAI ? 'AI' : (S.boards.length > 1 ? (i === 0 ? 'P1' : 'P2') : 'Score');
    div.innerHTML = `<div class="slabel">${lbl}</div><div class="sval">0</div>`;
    return div;
  }

  /* ── Tile drawing ── */
  function cellSize(boardEl) {
    const c = boardEl.querySelector('.board-cell');
    return c ? c.getBoundingClientRect().width : 88;
  }
  function gapSize(boardEl) {
    return parseFloat(getComputedStyle(boardEl).gap) || 10;
  }

  function drawTiles(b) {
    b.boardEl.querySelectorAll('.tile').forEach(t => t.remove());
    const cs = cellSize(b.boardEl);
    const gp = gapSize(b.boardEl);
    b.board.grid.forEach((row, r) => {
      row.forEach((val, c) => {
        if (!val) return;
        const tile = document.createElement('div');
        tile.className = 'tile ' + tileClass(val);
        tile.textContent = val;
        tile.style.width  = cs + 'px';
        tile.style.height = cs + 'px';
        tile.style.left   = (gp + c * (cs + gp)) + 'px';
        tile.style.top    = (gp + r * (cs + gp)) + 'px';
        b.boardEl.appendChild(tile);
      });
    });
  }

  function drawAllTiles() { S.boards.forEach(b => drawTiles(b)); }

  function tileClass(v) {
    if (v <= 2048) return 'v' + v;
    if (v <= 4096) return 'v4096';
    if (v <= 8192) return 'v8192';
    return 'vbig';
  }

  /* ── Score update ── */
  function updateScores() {
    S.boards.forEach(b => {
      if (b.scoreEl) b.scoreEl.textContent = b.board.score.toLocaleString();
    });
  }

  /* ── Highlight active board (vs-friend) ── */
  function highlightActiveBoard() {
    S.boards.forEach((b, i) => {
      if (b.boardEl) {
        if (S.mode === 'vs-friend') {
          b.boardEl.classList.toggle('active-board', i === S.turn && !b.board.over);
        } else {
          b.boardEl.classList.remove('active-board');
        }
      }
    });
  }

  /* ── Banner ── */
  function updateBanner() {
    gameBanner.className = 'game-banner';
    let html = '';

    if (S.mode === 'solo') {
      gameBanner.classList.add('banner-solo');
      html = `🎮 ${esc(S.names[0])} — reach <strong>2048!</strong>`;
    } else if (S.mode === 'ai') {
      gameBanner.classList.add('banner-ai');
      html = `👁️ Watching MELISSA AI play`;
    } else if (S.mode === 'vs-ai') {
      gameBanner.classList.add('banner-vs-ai');
      html = `🤖 ${esc(S.names[0])} vs MELISSA AI`;
    } else if (S.mode === 'vs-friend') {
      if (S.turn === 0) {
        gameBanner.classList.add('banner-p1');
        html = `<span class="turn-dot dot-p1"></span> ${esc(S.names[0])}'s turn`;
      } else {
        gameBanner.classList.add('banner-p2');
        html = `<span class="turn-dot dot-p2"></span> ${esc(S.names[1])}'s turn`;
      }
    }
    gameBanner.innerHTML = html;
  }

  /* ══════════════════════════════════════════
     INPUT — Keyboard
  ══════════════════════════════════════════ */
  const KEY_MAP = { ArrowLeft:0, ArrowRight:1, ArrowUp:2, ArrowDown:3 };
  document.addEventListener('keydown', e => {
    if (!S.active) return;
    if (e.key in KEY_MAP) { e.preventDefault(); handleMove(KEY_MAP[e.key]); }
  });

  /* ── INPUT — Touch swipe ── */
  let tx = 0, ty = 0;
  document.addEventListener('touchstart', e => {
    tx = e.touches[0].clientX;
    ty = e.touches[0].clientY;
  }, { passive: true });
  document.addEventListener('touchend', e => {
    if (!S.active) return;
    const dx = e.changedTouches[0].clientX - tx;
    const dy = e.changedTouches[0].clientY - ty;
    if (Math.abs(dx) < 18 && Math.abs(dy) < 18) return;
    if (Math.abs(dx) > Math.abs(dy)) handleMove(dx > 0 ? 1 : 0);
    else                              handleMove(dy > 0 ? 3 : 2);
  }, { passive: true });

  /* ── Move dispatcher ── */
  function handleMove(dir) {
    if (!S.active) return;
    let idx = 0;
    if (S.mode === 'vs-friend') idx = S.turn;
    if (S.mode === 'vs-ai')     idx = 0;

    const b = S.boards[idx];
    if (!b || b.isAI || b.board.over) return;

    const { moved } = b.board.move(dir);
    if (!moved) return;

    drawTiles(b);
    updateScores();

    if (b.board.won && !b.warnedWin) {
      b.warnedWin = true;
      showWinFlash();
    }
    if (b.board.over) { checkEnd(); return; }

    if (S.mode === 'vs-friend') {
      S.turn = 1 - S.turn;
      updateBanner();
      highlightActiveBoard();
    }
  }

  function showWinFlash() {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);' +
      'background:#edc22e;color:#fff;font-size:34px;font-weight:900;padding:18px 36px;' +
      'border-radius:16px;z-index:200;pointer-events:none;box-shadow:0 6px 28px rgba(237,194,46,0.5)';
    el.textContent = '🎉 2048!';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1600);
  }

  /* ══════════════════════════════════════════
     AI LOOP
  ══════════════════════════════════════════ */
  function startAI() { S.aiRunning = true; scheduleAI(); }

  function stopAI() {
    S.aiRunning = false;
    if (S.aiTimer) clearTimeout(S.aiTimer);
    S.aiTimer = null;
  }

  function toggleAI() {
    S.aiPaused = !S.aiPaused;
    if (S.aiPaused) {
      aiToggleBtn.textContent = '▶ Resume';
      aiToggleBtn.classList.add('paused');
    } else {
      aiToggleBtn.textContent = '⏸ Pause';
      aiToggleBtn.classList.remove('paused');
      scheduleAI();
    }
  }

  function scheduleAI() {
    if (!S.aiRunning || S.aiPaused) return;
    const speed = parseInt(aiSpeedIn.value, 10);
    const delay = Math.round(550 / speed);
    S.aiTimer = setTimeout(aiStep, delay);
  }

  function aiStep() {
    if (!S.aiRunning || S.aiPaused || !S.active) return;

    S.boards.forEach(b => {
      if (!b.isAI || b.board.over) return;
      const dir = b.ai.bestMove(b.board);
      if (dir < 0) { b.board.over = true; return; }
      b.board.move(dir);
      drawTiles(b);
    });

    updateScores();
    checkEnd();
    if (S.active) scheduleAI();
  }

  /* ══════════════════════════════════════════
     GAME OVER / WIN CHECK
  ══════════════════════════════════════════ */
  function checkEnd() {
    const b0over = S.boards[0] && S.boards[0].board.over;
    const allOver = S.boards.every(b => b.board.over);
    const ended = (S.mode === 'solo' || S.mode === 'ai') ? b0over : allOver;
    if (!ended) return;

    S.active = false;
    stopAI();
    setTimeout(showEndScreen, 350);
  }

  /* ── Save score and show end screen ── */
  function showEndScreen() {
    const scores    = S.boards.map(b => b.board.score);
    const maxScore  = Math.max(...scores);
    let highlightScore = scores[0];

    /* ── Build result cards ── */
    goScores.innerHTML = '';
    S.boards.forEach((b, i) => {
      const div = document.createElement('div');
      const isWinner = S.boards.length > 1 && b.board.score === maxScore;
      div.className = 'go-score-card' + (isWinner ? ' winner' : '');
      div.innerHTML = `
        <div class="gc-name">${esc(b.label)}</div>
        <div class="gc-score">${b.board.score.toLocaleString()}</div>
        <div class="gc-tile">Best: ${b.board.maxTile()}</div>`;
      goScores.appendChild(div);
    });

    /* ── Title / emoji ── */
    if (S.mode === 'solo') {
      const won = S.boards[0].board.won;
      goEmoji.textContent = won ? '🏆' : '😔';
      goTitle.textContent = won ? 'You Win!' : 'Game Over';
      goSub.textContent   = `Score: ${scores[0].toLocaleString()} · Best tile: ${S.boards[0].board.maxTile()}`;
    } else if (S.mode === 'ai') {
      goEmoji.textContent = '🤖';
      goTitle.textContent = 'AI Finished!';
      goSub.textContent   = `Score: ${scores[0].toLocaleString()} · Best tile: ${S.boards[0].board.maxTile()}`;
    } else {
      if (scores[0] > scores[1]) {
        goEmoji.textContent = '🥇';
        goTitle.textContent = S.mode === 'vs-ai' ? `${esc(S.names[0])} Wins!` : `${esc(S.names[0])} Wins!`;
      } else if (scores[1] > scores[0]) {
        goEmoji.textContent = S.mode === 'vs-ai' ? '🤖' : '🥇';
        goTitle.textContent = S.mode === 'vs-ai' ? 'MELISSA AI Wins!' : `${esc(S.names[1])} Wins!`;
      } else {
        goEmoji.textContent = '🤝';
        goTitle.textContent = "It's a Tie!";
      }
      goSub.textContent = 'Final Scores';
    }

    /* ── Save to scoreboard ── */
    const now = Date.now();
    if (S.mode === 'solo') {
      const rank = addScore('solo', {
        name: S.names[0], score: scores[0],
        bestTile: S.boards[0].board.maxTile(), won: S.boards[0].board.won, date: now,
      });
      S.currentRank = rank;
    } else if (S.mode === 'ai') {
      addScore('ai', {
        diff: S.diff, score: scores[0],
        bestTile: S.boards[0].board.maxTile(), date: now,
      });
    } else if (S.mode === 'vs-ai') {
      let result = scores[0] > scores[1] ? 'win' : scores[0] < scores[1] ? 'lose' : 'tie';
      const rank = addScore('vs-ai', {
        name: S.names[0], score: scores[0], aiScore: scores[1],
        diff: S.diff, result, bestTile: S.boards[0].board.maxTile(), date: now,
      });
      S.currentRank = rank;
      highlightScore = scores[0];
    } else if (S.mode === 'vs-friend') {
      const winner = scores[0] > scores[1] ? S.names[0]
                   : scores[1] > scores[0] ? S.names[1] : 'Tie';
      addScore('vs-friend', {
        name1: S.names[0], score1: scores[0],
        name2: S.names[1], score2: scores[1],
        winner, date: now,
      });
      highlightScore = scores[0];
    }

    /* ── Render scoreboard ── */
    renderScoreboard(S.mode, highlightScore);

    overlay.style.display = 'flex';
  }

  /* ══════════════════════════════════════════
     SCREEN TRANSITIONS
  ══════════════════════════════════════════ */
  function showGameScreen() {
    menuScreen.classList.remove('active');
    menuScreen.style.display = 'none';
    gameScreen.classList.add('active');
    gameScreen.style.display = 'flex';
  }

  function goMenu_fn() {
    stopAI();
    S.active = false;
    overlay.style.display = 'none';
    gameScreen.classList.remove('active');
    gameScreen.style.display = 'none';
    menuScreen.classList.add('active');
    menuScreen.style.display = 'flex';
  }

  /* ══════════════════════════════════════════
     RESIZE — redraw tiles on window resize
  ══════════════════════════════════════════ */
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (S.active) drawAllTiles();
    }, 80);
  });

  /* ── init ── */
  gameScreen.style.display = 'none';
})();
