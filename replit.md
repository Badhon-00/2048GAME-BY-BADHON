# 2048 Game — All Languages Edition

A full-featured 2048 puzzle game in 4 languages: Web (JS), Python, C++, C#, Node.js CLI.

## Run & Operate

- **Web (default)**: `node 2048GAME/server.js` → port 5000
- **Python CLI**: `python3 2048GAME/python/main.py`
- **C++ CLI**: `cd 2048GAME/cpp && make && ./2048`
- **C# CLI**: `cd 2048GAME/csharp && dotnet run`
- **Node.js CLI**: `node 2048GAME/nodejs/main.js`

## Stack

- Node.js 20 + Express 4 (web server)
- Vanilla JS (web frontend, no framework)
- Python 3.11 (terminal version, stdlib only)
- C++17 with g++ -O2 (terminal version)
- C# .NET 8 (terminal version)
- CSS3 animations, mobile-first responsive

## Where things live

- `2048GAME/index.html` — Web game shell
- `2048GAME/css/style.css` — All styles and animations
- `2048GAME/js/game.js` — Web board logic + AI engine
- `2048GAME/js/ui.js` — Web game modes, rendering, input
- `2048GAME/server.js` — Express server
- `2048GAME/python/` — Python terminal version (game.py, ai.py, main.py)
- `2048GAME/cpp/` — C++ terminal version (game.hpp/cpp, ai.hpp/cpp, main.cpp, Makefile)
- `2048GAME/csharp/` — C# terminal version (Game.cs, AI.cs, Program.cs, Game2048.csproj)
- `2048GAME/nodejs/` — Node.js CLI version (game.js, ai.js, main.js)
- `2048GAME/vercel.json` — Vercel deployment config

## Architecture decisions

- Same Expectimax algorithm + heuristics implemented identically in all 4 languages
- Board state is a plain 4×4 array/grid; clone-based simulation for AI lookahead
- All CLI versions use raw terminal input + ANSI 24-bit true-color tile rendering
- Four game modes (solo, watch AI, vs AI, vs friend) shared across all versions
- Touch swipe + keyboard arrows on web; WASD + arrows in all terminal versions

## Product

- **Solo Play** — Classic 2048, reach the 2048 tile
- **Watch AI** — AI plays automatically with pause/speed control
- **vs AI** — Two boards side-by-side, you vs AI simultaneously
- **vs Friend** — Two boards, players take turns
- **AI Difficulty**: Easy (random), Normal (depth 3), Hard (depth 5), Extreme (depth 7)
- **Mobile ready** — Responsive layout, swipe gestures, touch-friendly UI

## Gotchas

- Express 5.x requires `/{*path}` instead of `*` for catch-all routes
- Replit webview requires port 5000
- Python terminal version uses `tty`/`termios` — Unix/Linux only (works on Replit)
- C# requires `dotnet` SDK 8+ to build and run
- AI depth 7 (Extreme) can be slow on low-end devices
