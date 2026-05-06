/* =========================================
   ui.js — Game UI, Controls & Game Modes
   ========================================= */

(function () {
  /* ---- STATE ---- */
  const state = {
    mode: 'solo',         // solo | ai | vs-ai | vs-friend
    difficulty: 'normal',
    boards: [],           // array of { board, label, isAI, score }
    currentPlayer: 0,     // for vs modes
    aiRunning: false,
    aiPaused: false,
    aiTimer: null,
    gameActive: false,
  };

  /* ---- DOM REFS ---- */
  const menuScreen     = document.getElementById('menu-screen');
  const gameScreen     = document.getElementById('game-screen');
  const startBtn       = document.getElementById('start-btn');
  const menuBtn        = document.getElementById('menu-btn');
  const restartBtn     = document.getElementById('restart-btn');
  const boardsWrapper  = document.getElementById('boards-wrapper');
  const headerScores   = document.getElementById('header-scores');
  const modeLabel      = document.getElementById('mode-label');
  const aiControls     = document.getElementById('ai-controls');
  const aiToggleBtn    = document.getElementById('ai-toggle-btn');
  const aiSpeed        = document.getElementById('ai-speed');
  const overlay        = document.getElementById('game-over-overlay');
  const overlayTitle   = document.getElementById('overlay-title');
  const overlaySubtitle= document.getElementById('overlay-subtitle');
  const overlayScores  = document.getElementById('overlay-scores');
  const overlayRestart = document.getElementById('overlay-restart');
  const overlayMenu    = document.getElementById('overlay-menu');
  const diffSection    = document.getElementById('difficulty-section');

  /* ---- MENU INTERACTIONS ---- */
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.mode = btn.dataset.mode;
      // Show diff only when AI involved
      const needsDiff = ['ai', 'vs-ai'].includes(state.mode);
      diffSection.style.display = needsDiff ? '' : 'none';
    });
  });

  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.difficulty = btn.dataset.diff;
    });
  });

  /* Hide difficulty by default (solo mode at start) */
  diffSection.style.display = 'none';

  startBtn.addEventListener('click', startGame);
  menuBtn.addEventListener('click', showMenu);
  restartBtn.addEventListener('click', startGame);
  overlayRestart.addEventListener('click', startGame);
  overlayMenu.addEventListener('click', showMenu);
  aiToggleBtn.addEventListener('click', toggleAI);

  /* ---- START GAME ---- */
  function startGame() {
    overlay.style.display = 'none';
    stopAI();
    state.boards = [];
    state.currentPlayer = 0;
    state.gameActive = true;
    boardsWrapper.className = 'boards-wrapper';
    boardsWrapper.innerHTML = '';
    headerScores.innerHTML = '';

    switch (state.mode) {
      case 'solo':     setupSolo();    break;
      case 'ai':       setupAIWatch(); break;
      case 'vs-ai':    setupVsAI();    break;
      case 'vs-friend':setupVsFriend();break;
    }

    showGame();
    renderAll();
    if (['ai', 'vs-ai'].includes(state.mode)) {
      aiControls.style.display = 'flex';
      state.aiPaused = false;
      aiToggleBtn.textContent = '⏸ Pause AI';
      aiToggleBtn.classList.remove('paused');
      startAI();
    } else {
      aiControls.style.display = 'none';
    }
  }

  function setupSolo() {
    modeLabel.textContent = 'Solo Play — reach 2048!';
    const b = { board: new GameBoard(), label: 'Player', isAI: false, el: null };
    state.boards.push(b);
  }

  function setupAIWatch() {
    const labels = { easy: '🟢 Easy', normal: '🔵 Normal', hard: '🟠 Hard', extreme: '🔴 Extreme' };
    modeLabel.textContent = `AI Watch — ${labels[state.difficulty]} AI playing`;
    const b = { board: new GameBoard(), label: `AI (${state.difficulty})`, isAI: true, ai: new AIEngine(state.difficulty), el: null };
    state.boards.push(b);
  }

  function setupVsAI() {
    const labels = { easy: 'Easy', normal: 'Normal', hard: 'Hard', extreme: 'Extreme' };
    modeLabel.textContent = `You vs AI (${labels[state.difficulty]})`;
    boardsWrapper.classList.add('two-boards');
    state.boards.push({ board: new GameBoard(), label: 'You', isAI: false, el: null });
    state.boards.push({ board: new GameBoard(), label: `AI (${state.difficulty})`, isAI: true, ai: new AIEngine(state.difficulty), el: null });
  }

  function setupVsFriend() {
    modeLabel.textContent = 'Player 1 vs Player 2 — take turns!';
    boardsWrapper.classList.add('two-boards');
    state.boards.push({ board: new GameBoard(), label: 'Player 1', isAI: false, el: null, pClass: 'p1' });
    state.boards.push({ board: new GameBoard(), label: 'Player 2', isAI: false, el: null, pClass: 'p2' });
    state.currentPlayer = 0;
  }

  /* ---- RENDER ---- */
  function renderAll() {
    boardsWrapper.innerHTML = '';
    headerScores.innerHTML = '';
    state.boards.forEach((b, idx) => {
      b.el = createBoardElement(b, idx);
      boardsWrapper.appendChild(b.el.container);
      const sc = createScoreBox(b, idx);
      headerScores.appendChild(sc);
      b.scoreEl = sc.querySelector('.score-val');
    });
    updateTurnIndicators();
  }

  function createBoardElement(b, idx) {
    const container = document.createElement('div');
    container.className = 'board-container';

    const labelEl = document.createElement('div');
    labelEl.className = 'board-label ' + (b.pClass || (b.isAI ? 'ai' : (idx === 0 ? 'p1' : 'p2')));
    labelEl.textContent = b.label;
    labelEl.id = `label-${idx}`;

    const boardEl = document.createElement('div');
    boardEl.className = 'board';

    // Background cells
    for (let i = 0; i < 16; i++) {
      const cell = document.createElement('div');
      cell.className = 'board-cell';
      boardEl.appendChild(cell);
    }

    container.appendChild(labelEl);
    container.appendChild(boardEl);

    b.boardEl = boardEl;
    b.labelEl = labelEl;

    drawTiles(b);
    return { container, boardEl, labelEl };
  }

  function createScoreBox(b, idx) {
    const div = document.createElement('div');
    div.className = 'score-box ' + (b.pClass || (b.isAI ? 'ai' : (idx === 0 ? 'player1' : 'player2')));
    div.innerHTML = `<div class="score-label">${b.isAI ? 'AI' : (state.boards.length > 1 ? 'P' + (idx + 1) : 'Score')}</div><div class="score-val">0</div>`;
    return div;
  }

  /* ---- DRAW TILES ---- */
  const CELL_SIZE = () => {
    const boardEl = document.querySelector('.board');
    if (!boardEl) return 90;
    return boardEl.querySelector('.board-cell').getBoundingClientRect().width;
  };
  const GAP = () => {
    const boardEl = document.querySelector('.board');
    if (!boardEl) return 10;
    const style = getComputedStyle(boardEl);
    return parseFloat(style.gap) || 10;
  };

  function drawTiles(b) {
    // Remove old tiles
    b.boardEl.querySelectorAll('.tile').forEach(t => t.remove());

    const cellSize = CELL_SIZE();
    const gap = GAP();

    b.board.grid.forEach((row, r) => {
      row.forEach((val, c) => {
        if (val === 0) return;
        const tile = document.createElement('div');
        tile.className = 'tile ' + tileClass(val);
        if (val === 2048 || val === 4096) tile.classList.add('win-tile');
        tile.textContent = val;
        tile.style.left = (c * (cellSize + gap) + gap) + 'px';
        tile.style.top  = (r * (cellSize + gap) + gap) + 'px';
        tile.style.width  = cellSize + 'px';
        tile.style.height = cellSize + 'px';
        b.boardEl.appendChild(tile);
      });
    });
  }

  function tileClass(val) {
    if (val <= 2048) return 't' + val;
    if (val <= 4096) return 't4096';
    if (val <= 8192) return 't8192';
    return 'tbig';
  }

  function updateScores() {
    state.boards.forEach(b => {
      if (b.scoreEl) b.scoreEl.textContent = b.board.score.toLocaleString();
    });
  }

  /* ---- TURN INDICATORS ---- */
  function updateTurnIndicators() {
    if (state.mode !== 'vs-friend') return;
    state.boards.forEach((b, idx) => {
      if (!b.labelEl) return;
      b.labelEl.classList.toggle('active-turn', idx === state.currentPlayer);
    });
  }

  /* ---- INPUT HANDLING ---- */

  // Keyboard
  document.addEventListener('keydown', e => {
    if (!state.gameActive) return;
    const map = { ArrowLeft: 0, ArrowRight: 1, ArrowUp: 2, ArrowDown: 3 };
    if (e.key in map) {
      e.preventDefault();
      handlePlayerMove(map[e.key]);
    }
  });

  // Touch swipe
  let touchX = 0, touchY = 0;
  document.addEventListener('touchstart', e => {
    touchX = e.touches[0].clientX;
    touchY = e.touches[0].clientY;
  }, { passive: true });
  document.addEventListener('touchend', e => {
    if (!state.gameActive) return;
    const dx = e.changedTouches[0].clientX - touchX;
    const dy = e.changedTouches[0].clientY - touchY;
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
    if (Math.abs(dx) > Math.abs(dy))
      handlePlayerMove(dx > 0 ? 1 : 0);
    else
      handlePlayerMove(dy > 0 ? 3 : 2);
  }, { passive: true });

  function handlePlayerMove(dir) {
    if (!state.gameActive) return;
    const isVsFriend = state.mode === 'vs-friend';
    const isSolo     = state.mode === 'solo';
    const isVsAI     = state.mode === 'vs-ai';

    let playerIdx = 0;
    if (isVsFriend) playerIdx = state.currentPlayer;
    if (isVsAI) playerIdx = 0; // human is always board 0

    const b = state.boards[playerIdx];
    if (!b || b.isAI || b.board.over) return;

    const { moved } = b.board.move(dir);
    if (!moved) return;

    drawTiles(b);
    updateScores();

    if (b.board.won && !b.warnedWin) {
      b.warnedWin = true;
      // show brief win flash but let game continue
      flashWin(b);
    }

    if (b.board.over) {
      checkGameOver();
      return;
    }

    // Advance turn for vs-friend
    if (isVsFriend) {
      state.currentPlayer = 1 - state.currentPlayer;
      updateTurnIndicators();
    }
  }

  function flashWin(b) {
    const msg = document.createElement('div');
    msg.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#edc22e;color:#fff;font-size:36px;font-weight:900;padding:20px 40px;border-radius:16px;z-index:200;pointer-events:none;animation:popIn 0.3s ease';
    msg.textContent = '🎉 2048!';
    document.body.appendChild(msg);
    setTimeout(() => msg.remove(), 1800);
  }

  /* ---- AI LOOP ---- */
  function startAI() {
    state.aiRunning = true;
    scheduleAI();
  }

  function stopAI() {
    state.aiRunning = false;
    if (state.aiTimer) clearTimeout(state.aiTimer);
    state.aiTimer = null;
  }

  function toggleAI() {
    state.aiPaused = !state.aiPaused;
    if (state.aiPaused) {
      aiToggleBtn.textContent = '▶ Resume AI';
      aiToggleBtn.classList.add('paused');
    } else {
      aiToggleBtn.textContent = '⏸ Pause AI';
      aiToggleBtn.classList.remove('paused');
      scheduleAI();
    }
  }

  function scheduleAI() {
    if (!state.aiRunning || state.aiPaused) return;
    const speedVal = parseInt(aiSpeed.value, 10);
    const delay = Math.round(600 / speedVal); // 10→60ms, 1→600ms
    state.aiTimer = setTimeout(aiStep, delay);
  }

  function aiStep() {
    if (!state.aiRunning || state.aiPaused || !state.gameActive) return;

    let anyAIActive = false;

    state.boards.forEach(b => {
      if (!b.isAI || b.board.over) return;
      anyAIActive = true;
      const dir = b.ai.bestMove(b.board);
      if (dir === -1) { b.board.over = true; return; }
      b.board.move(dir);
      drawTiles(b);
    });

    updateScores();
    checkGameOver();

    if (!state.gameActive) return;

    if (state.mode === 'vs-ai') {
      // In vs-ai the human plays separately; AI board moves independently
    }

    scheduleAI();
  }

  /* ---- GAME OVER CHECK ---- */
  function checkGameOver() {
    const allOver = state.boards.every(b => b.board.over);
    const anyHumanOver = state.boards.some(b => !b.isAI && b.board.over);
    const anyAIOver    = state.boards.some(b => b.isAI && b.board.over);

    // For solo / ai-watch → end when that board is over
    // For versus → end when both are over OR human is over (they lost)
    const shouldEnd = state.mode === 'solo'      ? state.boards[0].board.over
                    : state.mode === 'ai'         ? state.boards[0].board.over
                    : allOver;

    if (!shouldEnd) return;

    state.gameActive = false;
    stopAI();

    setTimeout(() => showGameOver(), 300);
  }

  function showGameOver() {
    const scores = state.boards.map(b => b.board.score);
    const maxScore = Math.max(...scores);

    overlayScores.innerHTML = '';
    state.boards.forEach((b, idx) => {
      const div = document.createElement('div');
      div.className = 'overlay-score-item' + (b.board.score === maxScore && scores.filter(s => s === maxScore).length <= state.boards.length ? ' winner' : '');
      div.innerHTML = `<div>${b.label}</div><div>${b.board.score.toLocaleString()}</div><div style="font-size:11px;opacity:0.8">Best: ${b.board.maxTile()}</div>`;
      overlayScores.appendChild(div);
    });

    if (state.mode === 'solo') {
      overlayTitle.textContent = 'Game Over!';
      overlaySubtitle.textContent = `Score: ${scores[0].toLocaleString()} · Best tile: ${state.boards[0].board.maxTile()}`;
    } else if (state.mode === 'ai') {
      overlayTitle.textContent = 'AI Finished!';
      overlaySubtitle.textContent = `Score: ${scores[0].toLocaleString()} · Best tile: ${state.boards[0].board.maxTile()}`;
    } else {
      const winner = scores[0] > scores[1] ? state.boards[0].label
                   : scores[1] > scores[0] ? state.boards[1].label
                   : 'Tie!';
      overlayTitle.textContent = winner === 'Tie!' ? "It's a Tie!" : `${winner} Wins!`;
      overlaySubtitle.textContent = 'Final Scores';
    }

    overlay.style.display = 'flex';
  }

  /* ---- SCREEN TRANSITIONS ---- */
  function showGame() {
    menuScreen.classList.remove('active');
    gameScreen.classList.add('active');
    menuScreen.style.display = 'none';
    gameScreen.style.display = 'flex';
  }

  function showMenu() {
    stopAI();
    state.gameActive = false;
    overlay.style.display = 'none';
    gameScreen.classList.remove('active');
    menuScreen.classList.add('active');
    gameScreen.style.display = 'none';
    menuScreen.style.display = 'flex';
  }

  /* ---- RESIZE HANDLING ---- */
  window.addEventListener('resize', () => {
    if (state.gameActive) {
      state.boards.forEach(b => drawTiles(b));
    }
  });

  /* ---- INIT ---- */
  // Show game-screen via flex when active
  gameScreen.style.display = 'none';
})();
