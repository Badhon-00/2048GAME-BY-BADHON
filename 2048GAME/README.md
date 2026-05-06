# 2048 GAME

A full-featured 2048 puzzle game playable on **web and mobile**.

## Features

- **Solo Play** — Classic 2048 experience
- **Watch AI** — Let the AI solve the puzzle for you
- **vs AI** — Compete on parallel boards against the AI
- **vs Friend** — Two players take turns on side-by-side boards
- **4 AI Difficulty Levels** — Easy / Normal / Hard / Extreme
- **Mobile Ready** — Touch swipe support, responsive layout
- **Smooth Animations** — Tile pop & merge animations

## AI Difficulty

| Level   | Algorithm                        |
|---------|----------------------------------|
| Easy    | Random valid move                |
| Normal  | Expectimax depth 3               |
| Hard    | Expectimax depth 5               |
| Extreme | Expectimax depth 7 + heuristics  |

Heuristics include: monotonicity, smoothness, empty cells, corner bonus, merge potential.

## Project Structure

```
2048GAME/
├── index.html       # Main game interface
├── css/
│   └── style.css    # Styling & animations
├── js/
│   ├── game.js      # Core logic + AI engine
│   └── ui.js        # UI, controls, game modes
├── server.js        # Express.js server
├── package.json     # Node dependencies
├── vercel.json      # Vercel deployment config
├── .replit          # Replit workflow config
└── README.md        # This file
```

## C++ Terminal Version

A full native C++ implementation lives in `cpp/`. Same game logic and AI — runs entirely in your terminal with ANSI color tiles.

```
2048GAME/cpp/
├── game.hpp / game.cpp   # GameBoard class — board logic, move engine
├── ai.hpp  / ai.cpp      # AIEngine class — Expectimax + heuristics
├── main.cpp              # Terminal UI, all 4 game modes
└── Makefile              # Build config
```

**Build & run:**
```bash
cd 2048GAME/cpp
make
./2048
```

**Controls:** `W A S D` or Arrow keys · `R` = restart · `P` = pause (Watch AI) · `Q` = quit

## Run Web Version Locally

```bash
cd 2048GAME
npm install
npm start
# Open http://localhost:5000
```

## Deploy to Vercel

```bash
npm install -g vercel
vercel
```

## Controls

- **Keyboard**: Arrow keys ↑ ↓ ← →
- **Mobile**: Swipe in any direction

## License

MIT
