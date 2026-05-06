// AI.cs — AIEngine: Expectimax AI for 2048 (C#)
using System;
using System.Collections.Generic;

namespace Game2048
{
    public class AIEngine
    {
        private string _difficulty;
        private static readonly Random Rng = new();
        private static readonly Dictionary<string, int> Depths =
            new() { ["easy"] = 0, ["normal"] = 3, ["hard"] = 5, ["extreme"] = 7 };

        public AIEngine(string difficulty = "normal") => _difficulty = difficulty;

        public int BestMove(GameBoard board)
        {
            if (_difficulty == "easy") return RandomMove(board);
            int depth = Depths.GetValueOrDefault(_difficulty, 3);
            return Expectimax(board, depth);
        }

        // ── Random ────────────────────────────────────────────────────────
        private static int RandomMove(GameBoard board)
        {
            var moves = board.ValidMoves();
            if (moves.Count == 0) return -1;
            return moves[Rng.Next(moves.Count)];
        }

        // ── Expectimax ────────────────────────────────────────────────────
        private int Expectimax(GameBoard board, int depth)
        {
            var moves = board.ValidMoves();
            if (moves.Count == 0) return -1;
            int bestDir = moves[0];
            double bestScore = double.NegativeInfinity;
            foreach (int d in moves)
            {
                var b = board.Clone();
                if (!b.Move(d, sim: true).moved) continue;
                double s = ExpectNode(b, depth - 1);
                if (s > bestScore) { bestScore = s; bestDir = d; }
            }
            return bestDir;
        }

        private double ExpectNode(GameBoard board, int depth)
        {
            if (depth == 0 || board.Over) return Heuristic(board);
            var cells = board.EmptyCells();
            if (cells.Count == 0) return Heuristic(board);

            var sample = depth <= 2 ? cells : SampleCells(cells, 4);
            double score = 0;
            foreach (var (r, c) in sample)
                foreach (var (val, prob) in new[] { (2, 0.9), (4, 0.1) })
                {
                    var b = board.Clone();
                    b.Grid[r, c] = val;
                    score += prob * MaxNode(b, depth - 1);
                }
            return score / sample.Count;
        }

        private double MaxNode(GameBoard board, int depth)
        {
            if (depth == 0 || board.Over) return Heuristic(board);
            var moves = board.ValidMoves();
            if (moves.Count == 0) return Heuristic(board);
            double best = double.NegativeInfinity;
            foreach (int d in moves)
            {
                var b = board.Clone();
                if (!b.Move(d, sim: true).moved) continue;
                double s = ExpectNode(b, depth - 1);
                if (s > best) best = s;
            }
            return best;
        }

        // ── Heuristic ─────────────────────────────────────────────────────
        private static double Heuristic(GameBoard board)
        {
            var g = board.Grid;
            int sz = GameBoard.Size;
            static double Lg(int v) => v > 0 ? Math.Log2(v) : 0;

            int empty = 0;
            foreach (int v in g) if (v == 0) empty++;

            double mono = 0;
            for (int r = 0; r < sz; r++)
            {
                double inc = 0, dec = 0;
                for (int c = 1; c < sz; c++)
                { double d = Lg(g[r,c]) - Lg(g[r,c-1]); if (d > 0) inc += d; else dec -= d; }
                mono -= Math.Min(inc, dec);
            }
            for (int c = 0; c < sz; c++)
            {
                double inc = 0, dec = 0;
                for (int r = 1; r < sz; r++)
                { double d = Lg(g[r,c]) - Lg(g[r-1,c]); if (d > 0) inc += d; else dec -= d; }
                mono -= Math.Min(inc, dec);
            }

            double smooth = 0;
            for (int r = 0; r < sz; r++)
                for (int c = 0; c < sz; c++)
                {
                    if (g[r, c] == 0) continue;
                    if (c < sz-1 && g[r,c+1] != 0) smooth -= Math.Abs(Lg(g[r,c]) - Lg(g[r,c+1]));
                    if (r < sz-1 && g[r+1,c] != 0) smooth -= Math.Abs(Lg(g[r,c]) - Lg(g[r+1,c]));
                }

            int maxVal = board.MaxTile();
            bool inCorner = g[0,0]==maxVal || g[0,sz-1]==maxVal ||
                            g[sz-1,0]==maxVal || g[sz-1,sz-1]==maxVal;
            double cornerBonus = inCorner ? Lg(maxVal) * 2 : 0;

            int merges = 0;
            for (int r = 0; r < sz; r++)
                for (int c = 0; c < sz; c++)
                {
                    if (c < sz-1 && g[r,c] != 0 && g[r,c] == g[r,c+1]) merges++;
                    if (r < sz-1 && g[r,c] != 0 && g[r,c] == g[r+1,c]) merges++;
                }

            return empty*270 + mono*47 + smooth*0.1 + cornerBonus*100 + merges*700 + board.Score*0.1;
        }

        private static List<(int r, int c)> SampleCells(List<(int r, int c)> cells, int n)
        {
            var copy = new List<(int,int)>(cells);
            for (int i = copy.Count - 1; i > 0; i--)
            { int j = Rng.Next(i+1); (copy[i], copy[j]) = (copy[j], copy[i]); }
            if (copy.Count > n) copy.RemoveRange(n, copy.Count - n);
            return copy;
        }
    }
}
