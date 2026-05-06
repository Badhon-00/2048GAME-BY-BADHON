#include "ai.hpp"
#include <cmath>
#include <limits>
#include <algorithm>

AIEngine::AIEngine(const std::string& difficulty)
    : difficulty_(difficulty), rng_(std::random_device{}()) {}

/* ---------- Public ---------- */

int AIEngine::bestMove(GameBoard& board) {
    if (difficulty_ == "easy")    return randomMove(board);
    int depth = (difficulty_ == "normal") ? 3
              : (difficulty_ == "hard")   ? 5 : 7;
    return expectimax(board, depth);
}

/* ---------- Random ---------- */

int AIEngine::randomMove(GameBoard& board) {
    auto moves = board.validMoves();
    if (moves.empty()) return -1;
    std::uniform_int_distribution<int> d(0, (int)moves.size() - 1);
    return moves[d(rng_)];
}

/* ---------- Expectimax ---------- */

int AIEngine::expectimax(GameBoard& board, int depth) {
    auto moves = board.validMoves();
    if (moves.empty()) return -1;

    int    bestDir   = moves[0];
    double bestScore = -std::numeric_limits<double>::infinity();

    for (int dir : moves) {
        GameBoard b = board.clone();
        if (!b.moveSim(dir).moved) continue;
        double s = expectNode(b, depth - 1);
        if (s > bestScore) { bestScore = s; bestDir = dir; }
    }
    return bestDir;
}

double AIEngine::expectNode(GameBoard board, int depth) {
    if (depth == 0 || board.over) return heuristic(board);
    auto cells = board.emptyCells();
    if (cells.empty()) return heuristic(board);

    auto sample = sampleCells(cells, depth <= 2 ? (int)cells.size() : 4);
    double score = 0.0;

    for (auto [r, c] : sample) {
        for (auto [val, prob] : std::vector<std::pair<int,double>>{{2, 0.9}, {4, 0.1}}) {
            GameBoard b = board.clone();
            b.grid[r][c] = val;
            score += prob * maxNode(b, depth - 1);
        }
    }
    return score / (double)sample.size();
}

double AIEngine::maxNode(GameBoard board, int depth) {
    if (depth == 0 || board.over) return heuristic(board);
    auto moves = board.validMoves();
    if (moves.empty()) return heuristic(board);

    double best = -std::numeric_limits<double>::infinity();
    for (int dir : moves) {
        GameBoard b = board.clone();
        if (!b.moveSim(dir).moved) continue;
        double s = expectNode(b, depth - 1);
        if (s > best) best = s;
    }
    return best;
}

/* ---------- Heuristic ---------- */

double AIEngine::heuristic(const GameBoard& board) {
    const auto& g = board.grid;
    int sz = GameBoard::SIZE;

    /* Empty cells */
    int empty = 0;
    for (auto& row : g) for (int v : row) if (!v) ++empty;

    /* Monotonicity */
    double mono = 0;
    auto lg = [](int v) { return v > 0 ? std::log2(v) : 0.0; };
    for (int r = 0; r < sz; ++r) {
        double incR = 0, decR = 0;
        for (int c = 1; c < sz; ++c) {
            double d = lg(g[r][c]) - lg(g[r][c-1]);
            (d > 0 ? incR : decR) += std::abs(d);
        }
        mono -= std::min(incR, decR);
    }
    for (int c = 0; c < sz; ++c) {
        double incC = 0, decC = 0;
        for (int r = 1; r < sz; ++r) {
            double d = lg(g[r][c]) - lg(g[r-1][c]);
            (d > 0 ? incC : decC) += std::abs(d);
        }
        mono -= std::min(incC, decC);
    }

    /* Smoothness */
    double smooth = 0;
    for (int r = 0; r < sz; ++r)
        for (int c = 0; c < sz; ++c) {
            if (!g[r][c]) continue;
            if (c < sz-1 && g[r][c+1]) smooth -= std::abs(lg(g[r][c]) - lg(g[r][c+1]));
            if (r < sz-1 && g[r+1][c]) smooth -= std::abs(lg(g[r][c]) - lg(g[r+1][c]));
        }

    /* Corner bonus */
    int maxVal = board.maxTile();
    bool inCorner = (g[0][0] == maxVal || g[0][sz-1] == maxVal ||
                     g[sz-1][0] == maxVal || g[sz-1][sz-1] == maxVal);
    double cornerBonus = inCorner ? lg(maxVal) * 2.0 : 0.0;

    /* Merge potential */
    int merges = 0;
    for (int r = 0; r < sz; ++r)
        for (int c = 0; c < sz; ++c) {
            if (c < sz-1 && g[r][c] && g[r][c] == g[r][c+1]) ++merges;
            if (r < sz-1 && g[r][c] && g[r][c] == g[r+1][c]) ++merges;
        }

    return empty * 270.0 + mono * 47.0 + smooth * 0.1 +
           cornerBonus * 100.0 + merges * 700.0 + board.score * 0.1;
}

/* ---------- Helpers ---------- */

std::vector<std::pair<int,int>> AIEngine::sampleCells(
    const std::vector<std::pair<int,int>>& cells, int n) {
    auto v = cells;
    std::shuffle(v.begin(), v.end(), rng_);
    if ((int)v.size() > n) v.resize(n);
    return v;
}
