"""
game.py — GameBoard class: core 2048 logic (Python)
"""
import random
import math
import copy


class GameBoard:
    SIZE = 4

    def __init__(self):
        self.grid = [[0] * 4 for _ in range(4)]
        self.score = 0
        self.over = False
        self.won = False
        self.add_random()
        self.add_random()

    def clone(self):
        b = object.__new__(GameBoard)
        b.grid = [row[:] for row in self.grid]
        b.score = self.score
        b.over = self.over
        b.won = self.won
        return b

    def empty_cells(self):
        return [(r, c) for r in range(4) for c in range(4) if self.grid[r][c] == 0]

    def add_random(self):
        cells = self.empty_cells()
        if not cells:
            return False
        r, c = random.choice(cells)
        self.grid[r][c] = 2 if random.random() < 0.9 else 4
        return True

    @staticmethod
    def _slide_row(row):
        arr = [v for v in row if v != 0]
        gained = 0
        i = 0
        while i < len(arr) - 1:
            if arr[i] == arr[i + 1]:
                arr[i] *= 2
                gained += arr[i]
                arr.pop(i + 1)
            i += 1
        arr += [0] * (4 - len(arr))
        return arr, gained

    @staticmethod
    def _rotate_right(g):
        return [[g[3 - c][r] for c in range(4)] for r in range(4)]

    def move(self, direction, sim=False):
        """direction: 0=left 1=right 2=up 3=down. Returns (moved, gained)."""
        rotations = {0: 0, 1: 2, 2: 3, 3: 1}
        g = [row[:] for row in self.grid]
        rots = rotations[direction]
        for _ in range(rots):
            g = self._rotate_right(g)

        moved = False
        total_gained = 0
        for r in range(4):
            new_row, gained = self._slide_row(g[r])
            if new_row != g[r]:
                moved = True
            g[r] = new_row
            total_gained += gained

        rots_back = (4 - rots) % 4
        for _ in range(rots_back):
            g = self._rotate_right(g)

        if moved:
            self.grid = g
            self.score += total_gained
            if not sim:
                if not self.won and self.max_tile() >= 2048:
                    self.won = True
                self.add_random()
                if not self.can_move():
                    self.over = True
        return moved, total_gained

    def can_move(self):
        if self.empty_cells():
            return True
        for r in range(4):
            for c in range(4):
                v = self.grid[r][c]
                if c < 3 and self.grid[r][c + 1] == v:
                    return True
                if r < 3 and self.grid[r + 1][c] == v:
                    return True
        return False

    def max_tile(self):
        return max(v for row in self.grid for v in row)

    def valid_moves(self):
        moves = []
        for d in range(4):
            b = self.clone()
            moved, _ = b.move(d, sim=True)
            if moved:
                moves.append(d)
        return moves
