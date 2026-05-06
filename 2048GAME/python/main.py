#!/usr/bin/env python3
"""
main.py — 2048 Terminal UI (Python)
Controls: W/A/S/D or arrow keys | R=restart | Q=quit
"""
import sys
import os
import time
import tty
import termios
import select
from game import GameBoard
from ai import AIEngine

# ── ANSI helpers ──────────────────────────────────────────────
RESET  = "\033[0m"
BOLD   = "\033[1m"

def bg(r, g, b): return f"\033[48;2;{r};{g};{b}m"
def fg(r, g, b): return f"\033[38;2;{r};{g};{b}m"

TILE_STYLES = {
    0:    (bg(205,193,180), fg(205,193,180), "   "),
    2:    (bg(238,228,218), fg(119,110,101), " 2 "),
    4:    (bg(237,224,200), fg(119,110,101), " 4 "),
    8:    (bg(242,177,121), fg(249,246,242), " 8 "),
    16:   (bg(245,149, 99), fg(249,246,242), "16 "),
    32:   (bg(246,124, 95), fg(249,246,242), "32 "),
    64:   (bg(246, 94, 59), fg(249,246,242), "64 "),
    128:  (bg(237,207,114), fg(249,246,242), "128"),
    256:  (bg(237,204, 97), fg(249,246,242), "256"),
    512:  (bg(237,200, 80), fg(249,246,242), "512"),
    1024: (bg(237,197, 63), fg(249,246,242), "1K "),
    2048: (bg(237,194, 46), fg(249,246,242), "2K "),
}

def tile_str(val):
    if val in TILE_STYLES:
        b, f, label = TILE_STYLES[val]
        return f"{b}{f}{BOLD} {label:^3} {RESET}"
    col = bg(60, 58, 50)
    return f"{col}{fg(249,246,242)}{BOLD} {str(val):^5} {RESET}"

def clear(): os.system('clear')

# ── Raw keyboard ──────────────────────────────────────────────
_orig_term = None

def enable_raw():
    global _orig_term
    fd = sys.stdin.fileno()
    _orig_term = termios.tcgetattr(fd)
    tty.setraw(fd)

def disable_raw():
    if _orig_term:
        termios.tcsetattr(sys.stdin.fileno(), termios.TCSAFLUSH, _orig_term)

def read_key():
    c = sys.stdin.read(1)
    if c == '\x1b':
        if select.select([sys.stdin], [], [], 0.05)[0]:
            c2 = sys.stdin.read(1)
            if c2 == '[' and select.select([sys.stdin], [], [], 0.05)[0]:
                c3 = sys.stdin.read(1)
                return {'A': 'up', 'B': 'down', 'C': 'right', 'D': 'left'}.get(c3, 'esc')
        return 'esc'
    return c.lower()

def key_to_dir(k):
    return {'a': 0, 'left': 0, 'd': 1, 'right': 1,
            'w': 2, 'up': 2, 's': 3, 'down': 3}.get(k, -1)

def nonblocking_key():
    if select.select([sys.stdin], [], [], 0)[0]:
        return read_key()
    return None

# ── Render ────────────────────────────────────────────────────
SEP = f"  {bg(187,173,160)}  {RESET}{bg(187,173,160)}{'─'*7}{RESET}{bg(187,173,160)}{'─'*7}{RESET}{bg(187,173,160)}{'─'*7}{RESET}{bg(187,173,160)}{'─'*7}{RESET}{bg(187,173,160)}  {RESET}"

def draw_board(board, label, score, label_color="\033[36m"):
    pad = bg(187, 173, 160)
    print(f"\n  {BOLD}{label_color}{label}{RESET}   {BOLD}Score: \033[33m{score}{RESET}")
    print(f"  {pad}{'':^32}{RESET}")
    for row in board.grid:
        print(f"  {pad} {RESET}", end="")
        for val in row:
            print(tile_str(val), end=f"{pad} {RESET}")
        print()
    print(f"  {pad}{'':^32}{RESET}")

# ── Modes ─────────────────────────────────────────────────────
def play_solo():
    b = GameBoard()
    while True:
        clear()
        print(f"\n  {BOLD}\033[33m2048 — Solo Play{RESET}  W/A/S/D · R=restart · Q=quit")
        draw_board(b, "YOU", b.score, "\033[32m")
        if b.won:
            print(f"  {BOLD}\033[32m★ You reached 2048! Keep going!\033[0m")
        if b.over:
            print(f"  {BOLD}\033[31mGame Over!\033[0m")
            break
        k = read_key()
        if k == 'q':
            break
        if k == 'r':
            b = GameBoard()
            continue
        d = key_to_dir(k)
        if d >= 0:
            b.move(d)
    print(f"\n  Final score: {BOLD}{b.score}{RESET}  Best tile: {BOLD}{b.max_tile()}{RESET}")
    print("\n  Press any key...")
    read_key()


def watch_ai(diff):
    b = GameBoard()
    ai = AIEngine(diff)
    moves = 0
    paused = False
    label_map = {'easy': '\033[32mEasy', 'normal': '\033[34mNormal',
                 'hard': '\033[33mHard', 'extreme': '\033[31mExtreme'}
    while not b.over:
        clear()
        print(f"\n  {BOLD}\033[33m2048 — Watch AI ({diff}){RESET}  P=pause · Q=quit  Moves={moves}")
        draw_board(b, f"AI [{diff}]", b.score, label_map.get(diff, ''))
        if b.won:
            print(f"  {BOLD}\033[32m★ AI reached 2048!\033[0m")
        if paused:
            print(f"  {BOLD}\033[36m[PAUSED] Press P to resume\033[0m")
            while True:
                k = read_key()
                if k == 'p':
                    paused = False
                    break
                if k == 'q':
                    return
        k = nonblocking_key()
        if k == 'p':
            paused = True
            continue
        if k == 'q':
            break
        d = ai.best_move(b)
        if d < 0:
            break
        b.move(d)
        moves += 1
        time.sleep(0.12)
    clear()
    draw_board(b, "AI — FINISHED", b.score, "\033[35m")
    print(f"\n  Moves: {moves}  Score: {BOLD}{b.score}{RESET}  Best: {BOLD}{b.max_tile()}{RESET}")
    print("\n  Press any key...")
    read_key()


def vs_ai(diff):
    human = GameBoard()
    ai_board = GameBoard()
    ai = AIEngine(diff)
    while not (human.over and ai_board.over):
        clear()
        print(f"\n  {BOLD}\033[33m2048 — You vs AI ({diff}){RESET}  W/A/S/D · R=restart · Q=quit\n")
        draw_board(human,    "YOU",          human.score,    "\033[32m")
        draw_board(ai_board, f"AI ({diff})", ai_board.score, "\033[35m")
        if human.over:
            print(f"  \033[31mYour board: GAME OVER\033[0m")
        if ai_board.over:
            print(f"  \033[33mAI board: FINISHED\033[0m")
        if human.over and ai_board.over:
            break
        if not human.over:
            k = read_key()
            if k == 'q':
                break
            if k == 'r':
                human = GameBoard()
                ai_board = GameBoard()
                continue
            d = key_to_dir(k)
            if d >= 0:
                human.move(d)
        if not ai_board.over:
            d = ai.best_move(ai_board)
            if d >= 0:
                ai_board.move(d)
    print(f"\n  YOU : {human.score}  (best {human.max_tile()})")
    print(f"  AI  : {ai_board.score}  (best {ai_board.max_tile()})")
    if human.score > ai_board.score:
        print(f"  {BOLD}\033[32mYOU WIN!\033[0m")
    elif ai_board.score > human.score:
        print(f"  {BOLD}\033[35mAI WINS!\033[0m")
    else:
        print(f"  {BOLD}\033[33mTIE!\033[0m")
    print("\n  Press any key...")
    read_key()


def vs_friend():
    p1 = GameBoard()
    p2 = GameBoard()
    turn = 0
    while not (p1.over and p2.over):
        clear()
        print(f"\n  {BOLD}\033[33m2048 — Player 1 vs Player 2{RESET}  W/A/S/D · R=restart · Q=quit\n")
        draw_board(p1, "PLAYER 1", p1.score, "\033[32m")
        draw_board(p2, "PLAYER 2", p2.score, "\033[34m")
        boards = [p1, p2]
        active = boards[turn]
        if active.over:
            turn = 1 - turn
            continue
        col = "\033[32m" if turn == 0 else "\033[34m"
        print(f"  {BOLD}{col}*** PLAYER {turn+1}'S TURN ***\033[0m")
        k = read_key()
        if k == 'q':
            break
        if k == 'r':
            p1, p2 = GameBoard(), GameBoard()
            turn = 0
            continue
        d = key_to_dir(k)
        if d >= 0:
            active.move(d)
            turn = 1 - turn
    print(f"\n  P1: {p1.score}  (best {p1.max_tile()})")
    print(f"  P2: {p2.score}  (best {p2.max_tile()})")
    if p1.score > p2.score:
        print(f"  {BOLD}\033[32mPLAYER 1 WINS!\033[0m")
    elif p2.score > p1.score:
        print(f"  {BOLD}\033[34mPLAYER 2 WINS!\033[0m")
    else:
        print(f"  {BOLD}\033[33mTIE!\033[0m")
    print("\n  Press any key...")
    read_key()


# ── Menus ─────────────────────────────────────────────────────
def select_mode():
    while True:
        clear()
        print(f"""
  {BOLD}\033[33m╔══════════════════════╗
  ║   2048  (Python)     ║
  ╚══════════════════════╝{RESET}

  1) Solo Play
  2) Watch AI
  3) You vs AI
  4) vs Friend (take turns)
  Q) Quit

  Choice: """, end='', flush=True)
        k = read_key()
        if k == '1': return 'solo'
        if k == '2': return 'ai'
        if k == '3': return 'vs-ai'
        if k == '4': return 'vs-friend'
        if k == 'q': disable_raw(); sys.exit(0)


def select_difficulty():
    while True:
        clear()
        print(f"""
  {BOLD}AI Difficulty:{RESET}

  1) \033[32mEasy\033[0m
  2) \033[34mNormal\033[0m
  3) \033[33mHard\033[0m
  4) \033[31mExtreme\033[0m

  Choice: """, end='', flush=True)
        k = read_key()
        if k == '1': return 'easy'
        if k == '2': return 'normal'
        if k == '3': return 'hard'
        if k == '4': return 'extreme'


# ── Entry point ───────────────────────────────────────────────
def main():
    enable_raw()
    import signal
    signal.signal(signal.SIGINT, lambda *_: (disable_raw(), sys.exit(0)))
    try:
        while True:
            mode = select_mode()
            diff = None
            if mode in ('ai', 'vs-ai'):
                diff = select_difficulty()
            if mode == 'solo':
                play_solo()
            elif mode == 'ai':
                watch_ai(diff)
            elif mode == 'vs-ai':
                vs_ai(diff)
            elif mode == 'vs-friend':
                vs_friend()
    finally:
        disable_raw()


if __name__ == '__main__':
    main()
