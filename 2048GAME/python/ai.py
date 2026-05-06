"""
ai.py — AIEngine: Expectimax AI for 2048 (Python)
"""
import random
import math
from game import GameBoard


class AIEngine:
    DEPTHS = {'easy': 0, 'normal': 3, 'hard': 5, 'extreme': 7}

    def __init__(self, difficulty='normal'):
        self.difficulty = difficulty

    def best_move(self, board):
        if self.difficulty == 'easy':
            return self._random_move(board)
        depth = self.DEPTHS[self.difficulty]
        return self._expectimax(board, depth)

    # ---- Random ----
    def _random_move(self, board):
        moves = board.valid_moves()
        return random.choice(moves) if moves else -1

    # ---- Expectimax ----
    def _expectimax(self, board, depth):
        moves = board.valid_moves()
        if not moves:
            return -1
        best_score, best_dir = float('-inf'), moves[0]
        for d in moves:
            b = board.clone()
            moved, _ = b.move(d, sim=True)
            if not moved:
                continue
            s = self._expect_node(b, depth - 1)
            if s > best_score:
                best_score, best_dir = s, d
        return best_dir

    def _expect_node(self, board, depth):
        if depth == 0 or board.over:
            return self._heuristic(board)
        cells = board.empty_cells()
        if not cells:
            return self._heuristic(board)
        sample = cells if depth <= 2 else random.sample(cells, min(4, len(cells)))
        score = 0.0
        for (r, c) in sample:
            for val, prob in ((2, 0.9), (4, 0.1)):
                b = board.clone()
                b.grid[r][c] = val
                score += prob * self._max_node(b, depth - 1)
        return score / len(sample)

    def _max_node(self, board, depth):
        if depth == 0 or board.over:
            return self._heuristic(board)
        moves = board.valid_moves()
        if not moves:
            return self._heuristic(board)
        best = float('-inf')
        for d in moves:
            b = board.clone()
            moved, _ = b.move(d, sim=True)
            if not moved:
                continue
            s = self._expect_node(b, depth - 1)
            if s > best:
                best = s
        return best

    # ---- Heuristic ----
    def _heuristic(self, board):
        g = board.grid

        def lg(v):
            return math.log2(v) if v > 0 else 0.0

        empty = sum(1 for row in g for v in row if v == 0)

        mono = 0.0
        for r in range(4):
            inc = dec = 0.0
            for c in range(1, 4):
                d = lg(g[r][c]) - lg(g[r][c - 1])
                if d > 0:
                    inc += d
                else:
                    dec -= d
            mono -= min(inc, dec)
        for c in range(4):
            inc = dec = 0.0
            for r in range(1, 4):
                d = lg(g[r][c]) - lg(g[r - 1][c])
                if d > 0:
                    inc += d
                else:
                    dec -= d
            mono -= min(inc, dec)

        smooth = 0.0
        for r in range(4):
            for c in range(4):
                if g[r][c]:
                    if c < 3 and g[r][c + 1]:
                        smooth -= abs(lg(g[r][c]) - lg(g[r][c + 1]))
                    if r < 3 and g[r + 1][c]:
                        smooth -= abs(lg(g[r][c]) - lg(g[r + 1][c]))

        max_val = board.max_tile()
        corners = [g[0][0], g[0][3], g[3][0], g[3][3]]
        corner_bonus = lg(max_val) * 2.0 if max_val in corners else 0.0

        merges = 0
        for r in range(4):
            for c in range(4):
                if c < 3 and g[r][c] and g[r][c] == g[r][c + 1]:
                    merges += 1
                if r < 3 and g[r][c] and g[r][c] == g[r + 1][c]:
                    merges += 1

        return (empty * 270 + mono * 47 + smooth * 0.1 +
                corner_bonus * 100 + merges * 700 + board.score * 0.1)
