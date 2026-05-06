#pragma once
#include "game.hpp"
#include <string>

class AIEngine {
public:
    explicit AIEngine(const std::string& difficulty = "normal");

    /* Returns best direction (0-3) or -1 if no move available */
    int bestMove(GameBoard& board);

    void setDifficulty(const std::string& diff) { difficulty_ = diff; }
    std::string difficulty() const { return difficulty_; }

private:
    std::string difficulty_;
    std::mt19937 rng_;

    int  randomMove(GameBoard& board);
    int  expectimax(GameBoard& board, int depth);
    double expectNode(GameBoard board, int depth);
    double maxNode(GameBoard board, int depth);
    double heuristic(const GameBoard& board);

    std::vector<std::pair<int,int>> sampleCells(
        const std::vector<std::pair<int,int>>& cells, int n);
};
