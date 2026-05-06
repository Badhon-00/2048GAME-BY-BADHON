# 2048 Game

A full-featured 2048 puzzle game playable on web and mobile, with AI opponent, multiplayer modes, and difficulty levels.

## Run & Operate

- **Start**: `node 2048GAME/server.js`
- **Port**: 5000 (Replit webview)
- **No env vars required**

## Stack

- Node.js 20 + Express 4 (static file server)
- Vanilla JS (no frameworks)
- CSS3 (animations, responsive, mobile-first)

## Where things live

- `2048GAME/index.html` — Main game shell
- `2048GAME/css/style.css` — All styles and animations
- `2048GAME/js/game.js` — Core board logic + AI engine (GameBoard, AIEngine classes)
- `2048GAME/js/ui.js` — All game modes, rendering, input handling
- `2048GAME/server.js` — Express server serving static files
- `2048GAME/vercel.json` — Vercel deployment config

## Architecture decisions

- Pure vanilla JS with no build step — instant load, zero dependencies on client
- AI uses Expectimax algorithm with configurable depth per difficulty
- Board state is a plain 4×4 array; clone-based simulation for AI lookahead
- All four game modes (solo, watch AI, vs AI, vs friend) share one rendering pipeline
- Touch swipe and keyboard arrows handled with a single unified move handler

## Product

- **Solo Play** — Classic 2048, keyboard + swipe
- **Watch AI** — Sit back and watch the AI solve
- **vs AI** — Two side-by-side boards, you vs AI simultaneously
- **vs Friend** — Two boards, players take turns
- **AI Difficulty**: Easy (random), Normal (depth 3), Hard (depth 5), Extreme (depth 7)
- **Mobile ready** — Responsive layout, swipe gestures, touch-friendly UI

## Gotchas

- Express 5.x requires `/{*path}` instead of `*` for catch-all routes
- Replit webview requires port 5000
- AI depth 7 (Extreme) can be slow on low-end devices — speed slider helps
