// Program.cs — 2048 Terminal UI (C#)
// Controls: W/A/S/D or arrow keys | R=restart | Q=quit
using System;
using System.Collections.Generic;
using System.Threading;
using Game2048;

Console.OutputEncoding = System.Text.Encoding.UTF8;

// ── ANSI helpers ──────────────────────────────────────────────────────────────
static string Bg(int r, int g, int b) => $"\x1b[48;2;{r};{g};{b}m";
static string Fg(int r, int g, int b) => $"\x1b[38;2;{r};{g};{b}m";
const string RESET = "\x1b[0m";
const string BOLD  = "\x1b[1m";

static string TileStr(int val)
{
    return val switch
    {
        0    => $"{Bg(205,193,180)}{Fg(205,193,180)}     {RESET}",
        2    => $"{Bg(238,228,218)}{Fg(119,110,101)}{BOLD}  2  {RESET}",
        4    => $"{Bg(237,224,200)}{Fg(119,110,101)}{BOLD}  4  {RESET}",
        8    => $"{Bg(242,177,121)}{Fg(249,246,242)}{BOLD}  8  {RESET}",
        16   => $"{Bg(245,149, 99)}{Fg(249,246,242)}{BOLD} 16  {RESET}",
        32   => $"{Bg(246,124, 95)}{Fg(249,246,242)}{BOLD} 32  {RESET}",
        64   => $"{Bg(246, 94, 59)}{Fg(249,246,242)}{BOLD} 64  {RESET}",
        128  => $"{Bg(237,207,114)}{Fg(249,246,242)}{BOLD} 128 {RESET}",
        256  => $"{Bg(237,204, 97)}{Fg(249,246,242)}{BOLD} 256 {RESET}",
        512  => $"{Bg(237,200, 80)}{Fg(249,246,242)}{BOLD} 512 {RESET}",
        1024 => $"{Bg(237,197, 63)}{Fg(249,246,242)}{BOLD}1024 {RESET}",
        2048 => $"{Bg(237,194, 46)}{Fg(249,246,242)}{BOLD}2048 {RESET}",
        _    => $"{Bg( 60, 58, 50)}{Fg(249,246,242)}{BOLD}{val,5}{RESET}",
    };
}

static void DrawBoard(GameBoard board, string label, string labelAnsi = "\x1b[36m")
{
    Console.WriteLine($"\n  {BOLD}{labelAnsi}{label}{RESET}   {BOLD}Score: \x1b[33m{board.Score}{RESET}");
    string rowSep = $"  {Bg(187,173,160)}{"",33}{RESET}";
    Console.WriteLine(rowSep);
    for (int r = 0; r < GameBoard.Size; r++)
    {
        Console.Write($"  {Bg(187,173,160)} {RESET}");
        for (int c = 0; c < GameBoard.Size; c++)
            Console.Write(TileStr(board.Grid[r, c]) + $"{Bg(187,173,160)} {RESET}");
        Console.WriteLine();
    }
    Console.WriteLine(rowSep);
}

static int KeyToDir(ConsoleKey key) => key switch
{
    ConsoleKey.A or ConsoleKey.LeftArrow  => 0,
    ConsoleKey.D or ConsoleKey.RightArrow => 1,
    ConsoleKey.W or ConsoleKey.UpArrow    => 2,
    ConsoleKey.S or ConsoleKey.DownArrow  => 3,
    _ => -1,
};

// ── Solo ──────────────────────────────────────────────────────────────────────
static void PlaySolo()
{
    var b = new GameBoard();
    while (true)
    {
        Console.Clear();
        Console.WriteLine($"\n  {BOLD}\x1b[33m2048 — Solo Play{RESET}  W/A/S/D · R=restart · Q=quit");
        DrawBoard(b, "YOU", "\x1b[32m");
        if (b.Won) Console.WriteLine($"  {BOLD}\x1b[32m★ You reached 2048! Keep going!\x1b[0m");
        if (b.Over) { Console.WriteLine($"  {BOLD}\x1b[31mGame Over!\x1b[0m"); break; }
        var ki = Console.ReadKey(true);
        if (ki.Key == ConsoleKey.Q) break;
        if (ki.Key == ConsoleKey.R) { b = new GameBoard(); continue; }
        int dir = KeyToDir(ki.Key);
        if (dir >= 0) b.Move(dir);
    }
    Console.WriteLine($"\n  Final score: {BOLD}{b.Score}{RESET}  Best tile: {BOLD}{b.MaxTile()}{RESET}");
    Console.Write("\n  Press any key..."); Console.ReadKey(true);
}

// ── Watch AI ─────────────────────────────────────────────────────────────────
static void WatchAI(string diff)
{
    var b = new GameBoard();
    var ai = new AIEngine(diff);
    int moveCount = 0;
    bool paused = false;
    string col = diff switch { "easy" => "\x1b[32m", "hard" => "\x1b[33m", "extreme" => "\x1b[31m", _ => "\x1b[34m" };
    while (!b.Over)
    {
        Console.Clear();
        Console.WriteLine($"\n  {BOLD}\x1b[33m2048 — Watch AI ({diff}){RESET}  P=pause · Q=quit  Moves={moveCount}");
        DrawBoard(b, $"AI [{diff}]", col);
        if (b.Won) Console.WriteLine($"  {BOLD}\x1b[32m★ AI reached 2048!\x1b[0m");
        if (paused)
        {
            Console.WriteLine($"  {BOLD}\x1b[36m[PAUSED] Press P to resume\x1b[0m");
            while (true) { var k2 = Console.ReadKey(true).Key; if (k2==ConsoleKey.P){paused=false;break;} if(k2==ConsoleKey.Q)return; }
        }
        if (Console.KeyAvailable)
        {
            var k = Console.ReadKey(true).Key;
            if (k == ConsoleKey.Q) break;
            if (k == ConsoleKey.P) paused = true;
            continue;
        }
        int dir = ai.BestMove(b);
        if (dir < 0) break;
        b.Move(dir);
        moveCount++;
        Thread.Sleep(120);
    }
    Console.Clear();
    DrawBoard(b, "AI — FINISHED", "\x1b[35m");
    Console.WriteLine($"\n  Moves: {moveCount}  Score: {BOLD}{b.Score}{RESET}  Best: {BOLD}{b.MaxTile()}{RESET}");
    Console.Write("\n  Press any key..."); Console.ReadKey(true);
}

// ── vs AI ────────────────────────────────────────────────────────────────────
static void VsAI(string diff)
{
    var human = new GameBoard(); var aiBoard = new GameBoard();
    var ai = new AIEngine(diff);
    while (!(human.Over && aiBoard.Over))
    {
        Console.Clear();
        Console.WriteLine($"\n  {BOLD}\x1b[33m2048 — You vs AI ({diff}){RESET}  W/A/S/D · R=restart · Q=quit\n");
        DrawBoard(human,   "YOU",       "\x1b[32m");
        DrawBoard(aiBoard, $"AI({diff})","\x1b[35m");
        if (human.Over)   Console.WriteLine($"  \x1b[31mYour board: GAME OVER\x1b[0m");
        if (aiBoard.Over) Console.WriteLine($"  \x1b[33mAI board: FINISHED\x1b[0m");
        if (human.Over && aiBoard.Over) break;
        if (!human.Over)
        {
            var ki = Console.ReadKey(true);
            if (ki.Key == ConsoleKey.Q) break;
            if (ki.Key == ConsoleKey.R) { human = new GameBoard(); aiBoard = new GameBoard(); continue; }
            int dir = KeyToDir(ki.Key);
            if (dir >= 0) human.Move(dir);
        }
        if (!aiBoard.Over) { int d = ai.BestMove(aiBoard); if (d >= 0) aiBoard.Move(d); }
    }
    Console.WriteLine($"\n  YOU : {human.Score}  (best {human.MaxTile()})");
    Console.WriteLine($"  AI  : {aiBoard.Score}  (best {aiBoard.MaxTile()})");
    if (human.Score > aiBoard.Score)       Console.WriteLine($"  {BOLD}\x1b[32mYOU WIN!\x1b[0m");
    else if (aiBoard.Score > human.Score)  Console.WriteLine($"  {BOLD}\x1b[35mAI WINS!\x1b[0m");
    else                                   Console.WriteLine($"  {BOLD}\x1b[33mTIE!\x1b[0m");
    Console.Write("\n  Press any key..."); Console.ReadKey(true);
}

// ── vs Friend ────────────────────────────────────────────────────────────────
static void VsFriend()
{
    var p1 = new GameBoard(); var p2 = new GameBoard();
    int turn = 0;
    while (!(p1.Over && p2.Over))
    {
        Console.Clear();
        Console.WriteLine($"\n  {BOLD}\x1b[33m2048 — Player 1 vs Player 2{RESET}  W/A/S/D · R=restart · Q=quit\n");
        DrawBoard(p1, "PLAYER 1", "\x1b[32m");
        DrawBoard(p2, "PLAYER 2", "\x1b[34m");
        var active = turn == 0 ? p1 : p2;
        if (active.Over) { turn = 1 - turn; continue; }
        string tc = turn == 0 ? "\x1b[32m" : "\x1b[34m";
        Console.WriteLine($"  {BOLD}{tc}*** PLAYER {turn+1}'S TURN ***\x1b[0m");
        var ki = Console.ReadKey(true);
        if (ki.Key == ConsoleKey.Q) break;
        if (ki.Key == ConsoleKey.R) { p1 = new GameBoard(); p2 = new GameBoard(); turn = 0; continue; }
        int dir = KeyToDir(ki.Key);
        if (dir >= 0) { active.Move(dir); turn = 1 - turn; }
    }
    Console.WriteLine($"\n  P1: {p1.Score}  (best {p1.MaxTile()})");
    Console.WriteLine($"  P2: {p2.Score}  (best {p2.MaxTile()})");
    if (p1.Score > p2.Score)      Console.WriteLine($"  {BOLD}\x1b[32mPLAYER 1 WINS!\x1b[0m");
    else if (p2.Score > p1.Score) Console.WriteLine($"  {BOLD}\x1b[34mPLAYER 2 WINS!\x1b[0m");
    else                          Console.WriteLine($"  {BOLD}\x1b[33mTIE!\x1b[0m");
    Console.Write("\n  Press any key..."); Console.ReadKey(true);
}

// ── Main menu ────────────────────────────────────────────────────────────────
static string SelectMode()
{
    while (true)
    {
        Console.Clear();
        Console.WriteLine($"""

  {BOLD}\x1b[33m╔═══════════════════════╗
  ║   2048  (C#/.NET)     ║
  ╚═══════════════════════╝{RESET}

  1) Solo Play
  2) Watch AI
  3) You vs AI
  4) vs Friend (take turns)
  Q) Quit

  Choice: """);
        var k = Console.ReadKey(true).Key;
        if (k == ConsoleKey.D1) return "solo";
        if (k == ConsoleKey.D2) return "ai";
        if (k == ConsoleKey.D3) return "vs-ai";
        if (k == ConsoleKey.D4) return "vs-friend";
        if (k == ConsoleKey.Q)  Environment.Exit(0);
    }
}

static string SelectDifficulty()
{
    while (true)
    {
        Console.Clear();
        Console.WriteLine($"""

  {BOLD}AI Difficulty:{RESET}

  1) \x1b[32mEasy\x1b[0m
  2) \x1b[34mNormal\x1b[0m
  3) \x1b[33mHard\x1b[0m
  4) \x1b[31mExtreme\x1b[0m

  Choice: """);
        var k = Console.ReadKey(true).Key;
        if (k == ConsoleKey.D1) return "easy";
        if (k == ConsoleKey.D2) return "normal";
        if (k == ConsoleKey.D3) return "hard";
        if (k == ConsoleKey.D4) return "extreme";
    }
}

// ── Entry ────────────────────────────────────────────────────────────────────
while (true)
{
    string mode = SelectMode();
    string diff = (mode == "ai" || mode == "vs-ai") ? SelectDifficulty() : "";
    switch (mode)
    {
        case "solo":      PlaySolo();    break;
        case "ai":        WatchAI(diff); break;
        case "vs-ai":     VsAI(diff);    break;
        case "vs-friend": VsFriend();    break;
    }
}
