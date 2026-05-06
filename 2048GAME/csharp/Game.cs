// Game.cs — GameBoard class: core 2048 logic (C#)
using System;
using System.Collections.Generic;

namespace Game2048
{
    public class GameBoard
    {
        public const int Size = 4;
        public int[,] Grid { get; private set; } = new int[Size, Size];
        public int Score { get; set; }
        public bool Over { get; set; }
        public bool Won  { get; set; }

        private static readonly Random Rng = new();

        public GameBoard() => Reset();

        public void Reset()
        {
            Grid  = new int[Size, Size];
            Score = 0;
            Over  = false;
            Won   = false;
            AddRandom();
            AddRandom();
        }

        public GameBoard Clone()
        {
            var b = new GameBoard { Score = Score, Over = Over, Won = Won };
            // skip Reset's two AddRandom calls by directly cloning:
            b.Grid = (int[,])Grid.Clone();
            return b;
        }

        // ── Cells ──────────────────────────────────────────────────────────
        public List<(int r, int c)> EmptyCells()
        {
            var cells = new List<(int, int)>();
            for (int r = 0; r < Size; r++)
                for (int c = 0; c < Size; c++)
                    if (Grid[r, c] == 0) cells.Add((r, c));
            return cells;
        }

        public bool AddRandom()
        {
            var cells = EmptyCells();
            if (cells.Count == 0) return false;
            var (r, c) = cells[Rng.Next(cells.Count)];
            Grid[r, c] = Rng.NextDouble() < 0.9 ? 2 : 4;
            return true;
        }

        // ── Row slide ──────────────────────────────────────────────────────
        private static (int[] row, int gained) SlideRow(int[] row)
        {
            var arr = new List<int>();
            foreach (int v in row) if (v != 0) arr.Add(v);
            int gained = 0;
            for (int i = 0; i < arr.Count - 1; i++)
            {
                if (arr[i] == arr[i + 1])
                {
                    arr[i] *= 2;
                    gained += arr[i];
                    arr.RemoveAt(i + 1);
                }
            }
            while (arr.Count < Size) arr.Add(0);
            return (arr.ToArray(), gained);
        }

        // ── Rotate 90° clockwise ──────────────────────────────────────────
        private static int[,] RotateRight(int[,] g)
        {
            var o = new int[Size, Size];
            for (int r = 0; r < Size; r++)
                for (int c = 0; c < Size; c++)
                    o[c, Size - 1 - r] = g[r, c];
            return o;
        }

        // ── Move ──────────────────────────────────────────────────────────
        public (bool moved, int gained) Move(int dir, bool sim = false)
        {
            int[] rotsBefore = { 0, 2, 3, 1 };
            int[] rotsAfter  = { 0, 2, 1, 3 };
            var g = (int[,])Grid.Clone();
            for (int i = 0; i < rotsBefore[dir]; i++) g = RotateRight(g);

            bool moved = false;
            int totalGained = 0;
            for (int r = 0; r < Size; r++)
            {
                var rowIn = new int[Size];
                for (int c = 0; c < Size; c++) rowIn[c] = g[r, c];
                var (newRow, gained) = SlideRow(rowIn);
                bool changed = false;
                for (int c = 0; c < Size; c++)
                    if (newRow[c] != g[r, c]) { changed = true; break; }
                if (changed) moved = true;
                for (int c = 0; c < Size; c++) g[r, c] = newRow[c];
                totalGained += gained;
            }

            for (int i = 0; i < rotsAfter[dir]; i++) g = RotateRight(g);

            if (moved)
            {
                Grid   = g;
                Score += totalGained;
                if (!sim)
                {
                    if (!Won && MaxTile() >= 2048) Won = true;
                    AddRandom();
                    if (!CanMove()) Over = true;
                }
            }
            return (moved, totalGained);
        }

        // ── Utilities ─────────────────────────────────────────────────────
        public bool CanMove()
        {
            if (EmptyCells().Count > 0) return true;
            for (int r = 0; r < Size; r++)
                for (int c = 0; c < Size; c++)
                {
                    int v = Grid[r, c];
                    if (c < Size - 1 && Grid[r, c + 1] == v) return true;
                    if (r < Size - 1 && Grid[r + 1, c] == v) return true;
                }
            return false;
        }

        public int MaxTile()
        {
            int m = 0;
            foreach (int v in Grid) m = Math.Max(m, v);
            return m;
        }

        public List<int> ValidMoves()
        {
            var moves = new List<int>();
            for (int d = 0; d < 4; d++)
            {
                var b = Clone();
                if (b.Move(d, sim: true).moved) moves.Add(d);
            }
            return moves;
        }
    }
}
