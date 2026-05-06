#include "game.hpp"
#include <cstdlib>
#include <ctime>

/* ---------- Constructor / Reset ---------- */

GameBoard::GameBoard() : score(0), over(false), won(false),
    rng(std::random_device{}()) {
    for (auto& row : grid) row.fill(0);
}

void GameBoard::reset() {
    for (auto& row : grid) row.fill(0);
    score = 0;
    over  = false;
    won   = false;
    addRandom();
    addRandom();
}

GameBoard GameBoard::clone() const {
    GameBoard b;
    b.grid  = grid;
    b.score = score;
    b.over  = over;
    b.won   = won;
    return b;
}

/* ---------- Cells ---------- */

std::vector<std::pair<int,int>> GameBoard::emptyCells() const {
    std::vector<std::pair<int,int>> cells;
    for (int r = 0; r < SIZE; ++r)
        for (int c = 0; c < SIZE; ++c)
            if (grid[r][c] == 0) cells.push_back({r, c});
    return cells;
}

bool GameBoard::addRandom() {
    auto cells = emptyCells();
    if (cells.empty()) return false;
    std::uniform_int_distribution<int> pick(0, (int)cells.size() - 1);
    auto [r, c] = cells[pick(rng)];
    std::uniform_real_distribution<double> prob(0.0, 1.0);
    grid[r][c] = (prob(rng) < 0.9) ? 2 : 4;
    return true;
}

/* ---------- Row slide ---------- */

GameBoard::RowResult GameBoard::slideRow(std::array<int, SIZE> row) {
    /* compact non-zero */
    std::array<int, SIZE> arr{};
    int idx = 0;
    for (int v : row) if (v) arr[idx++] = v;

    int gained = 0;
    for (int i = 0; i < idx - 1; ++i) {
        if (arr[i] && arr[i] == arr[i + 1]) {
            arr[i] *= 2;
            gained += arr[i];
            for (int j = i + 1; j < idx - 1; ++j) arr[j] = arr[j + 1];
            arr[--idx] = 0;
        }
    }
    /* pad with zeros */
    for (int i = idx; i < SIZE; ++i) arr[i] = 0;
    return { arr, gained };
}

/* ---------- Rotate grid 90° clockwise ---------- */

GameBoard::Grid GameBoard::rotateRight(const Grid& g) const {
    Grid out{};
    for (int r = 0; r < SIZE; ++r)
        for (int c = 0; c < SIZE; ++c)
            out[c][SIZE - 1 - r] = g[r][c];
    return out;
}

/* ---------- Move ---------- */

GameBoard::MoveResult GameBoard::applySlide(int dir) {
    /* Normalise: rotate so we always slide LEFT */
    /* dir: 0=left(0 rot), 1=right(2 rot), 2=up(3 rot), 3=down(1 rot) */
    const int rotsBefore[] = {0, 2, 3, 1};
    const int rotsAfter[]  = {0, 2, 1, 3};

    Grid g = grid;
    for (int i = 0; i < rotsBefore[dir]; ++i) g = rotateRight(g);

    bool moved   = false;
    int  gained  = 0;

    for (int r = 0; r < SIZE; ++r) {
        auto [newRow, g2] = slideRow(g[r]);
        if (newRow != g[r]) moved = true;
        g[r]  = newRow;
        gained += g2;
    }

    for (int i = 0; i < rotsAfter[dir]; ++i) g = rotateRight(g);

    if (moved) { grid = g; score += gained; }
    return { moved, gained };
}

GameBoard::MoveResult GameBoard::move(int dir) {
    auto res = applySlide(dir);
    if (res.moved) {
        if (!won && maxTile() >= 2048) won = true;
        addRandom();
        if (!canMove()) over = true;
    }
    return res;
}

GameBoard::MoveResult GameBoard::moveSim(int dir) {
    return applySlide(dir);
}

/* ---------- Utilities ---------- */

bool GameBoard::canMove() const {
    if (!emptyCells().empty()) return true;
    for (int r = 0; r < SIZE; ++r)
        for (int c = 0; c < SIZE; ++c) {
            int v = grid[r][c];
            if (c < SIZE-1 && grid[r][c+1] == v) return true;
            if (r < SIZE-1 && grid[r+1][c] == v) return true;
        }
    return false;
}

int GameBoard::maxTile() const {
    int m = 0;
    for (auto& row : grid) for (int v : row) m = std::max(m, v);
    return m;
}

std::vector<int> GameBoard::validMoves() const {
    std::vector<int> moves;
    for (int d = 0; d < 4; ++d) {
        GameBoard b = clone();
        if (b.moveSim(d).moved) moves.push_back(d);
    }
    return moves;
}
