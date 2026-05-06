# 2048 GAME — All Languages Edition

A complete 2048 puzzle game implemented in **4 languages**, all with identical features:
Solo Play · Watch AI · vs AI · vs Friend · 4 AI difficulty levels.

---

## 🌐 Web Version (JavaScript + Node.js)

The main web game — playable in any browser on desktop or mobile.

```bash
cd 2048GAME
npm install
npm start
# Open http://localhost:5000
```

**Controls:** Arrow keys or touch swipe | Menu to switch modes

---

## 🐍 Python Terminal Version

Full terminal game with true-color ANSI tile rendering.

```bash
cd 2048GAME/python
python3 main.py
```

**Controls:** W/A/S/D or arrow keys · P=pause (Watch AI) · R=restart · Q=quit

Files:
```
python/
├── game.py          # GameBoard class — core board logic
├── ai.py            # AIEngine class — Expectimax + heuristics
├── main.py          # Terminal UI, all 4 game modes, 24-bit ANSI color
└── requirements.txt # No external deps (stdlib only)
```

---

## ⚙️ C++ Terminal Version

Native compiled game. Fastest AI execution.

```bash
cd 2048GAME/cpp
make
./2048
```

**Controls:** W/A/S/D or arrow keys · P=pause · R=restart · Q=quit

Files:
```
cpp/
├── game.hpp / game.cpp   # GameBoard class
├── ai.hpp  / ai.cpp      # AIEngine class
├── main.cpp              # Terminal UI, all 4 game modes
└── Makefile              # g++ -std=c++17 -O2
```

---

## 🟣 C# Terminal Version

.NET 8 console application with 24-bit color tiles.

```bash
cd 2048GAME/csharp
dotnet run
```

**Controls:** W/A/S/D or arrow keys · R=restart · Q=quit

Files:
```
csharp/
├── Game.cs          # GameBoard class
├── AI.cs            # AIEngine class
├── Program.cs       # Terminal UI, all 4 game modes
└── Game2048.csproj  # .NET 8 project file
```

---

## 🟨 Node.js CLI Version

Terminal version in pure Node.js — no npm packages needed.

```bash
cd 2048GAME/nodejs
node main.js
```

**Controls:** W/A/S/D or arrow keys · P=pause · R=restart · Q=quit

Files:
```
nodejs/
├── game.js      # GameBoard class
├── ai.js        # AIEngine class
├── main.js      # Terminal UI, all 4 game modes
└── package.json
```

---

## AI Difficulty Levels

| Level   | Algorithm                             | Description                        |
|---------|---------------------------------------|------------------------------------|
| Easy    | Random valid move                     | Picks any legal move randomly      |
| Normal  | Expectimax depth 3                    | Solid play, fast response          |
| Hard    | Expectimax depth 5                    | Strong play with deeper lookahead  |
| Extreme | Expectimax depth 7 + full heuristics  | Near-optimal, may be slow          |

**Heuristics used:** empty cells, monotonicity, smoothness, corner bonus, merge potential.

---

## Game Modes (all versions)

| Mode        | Description                                          |
|-------------|------------------------------------------------------|
| Solo Play   | Classic 2048 — reach the 2048 tile                   |
| Watch AI    | AI plays automatically with adjustable speed         |
| vs AI       | Your board vs AI board side-by-side                  |
| vs Friend   | Two players take turns on separate boards            |

---

## Deploy to Vercel

```bash
npm install -g vercel
cd 2048GAME
vercel
```

---

## Project Structure

```
2048GAME/
├── index.html          # Web game UI
├── css/style.css       # Responsive styles & tile animations
├── js/game.js          # Web game logic
├── js/ui.js            # Web game modes & controls
├── server.js           # Express.js server (port 5000)
├── package.json        # Node deps
├── vercel.json         # Vercel deployment
├── python/             # Python 3.11 terminal version
├── cpp/                # C++ terminal version
├── csharp/             # C# (.NET 8) terminal version
└── nodejs/             # Node.js CLI terminal version
```
