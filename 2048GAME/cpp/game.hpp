#pragma once
#include <array>
#include <vector>
#include <random>
#include <algorithm>

class GameBoard {
public:
    static const int SIZE = 4;
    using Grid = std::array<std::array<int, SIZE>, SIZE>;

    Grid  grid;
    int   score;
    bool  over;
    bool  won;

    GameBoard();
    void reset();
    GameBoard clone() const;

    std::vector<std::pair<int,int>> emptyCells() const;
    bool addRandom();

    struct MoveResult { bool moved; int gained; };

    /* dir: 0=left 1=right 2=up 3=down */
    MoveResult move(int dir);
    MoveResult moveSim(int dir);   /* no random tile added */

    bool canMove() const;
    int  maxTile() const;
    std::vector<int> validMoves() const;

private:
    std::mt19937 rng;

    struct RowResult { std::array<int, SIZE> row; int gained; };
    RowResult slideRow(std::array<int, SIZE> row);

    /* Helpers to rotate / transpose grid for unified slide logic */
    Grid rotateRight(const Grid& g) const;
    MoveResult applySlide(int dir);
};
