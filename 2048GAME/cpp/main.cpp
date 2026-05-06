/*  ============================================================
    2048 — C++ Terminal Version
    Controls : W/A/S/D  or  Arrow keys  |  Q = quit  |  R = restart
    Modes    : Solo, Watch AI, vs AI, vs Friend
    ============================================================ */

#include "game.hpp"
#include "ai.hpp"

#include <iostream>
#include <string>
#include <sstream>
#include <iomanip>
#include <thread>
#include <chrono>
#include <cstdio>
#include <csignal>

#ifdef _WIN32
  #include <conio.h>
  #include <windows.h>
  #define CLEAR "cls"
#else
  #include <termios.h>
  #include <unistd.h>
  #define CLEAR "clear"
#endif

/* ---- ANSI color codes ---- */
namespace Color {
  const std::string RESET  = "\033[0m";
  const std::string BOLD   = "\033[1m";
  const std::string BLACK  = "\033[30m";
  const std::string RED    = "\033[31m";
  const std::string GREEN  = "\033[32m";
  const std::string YELLOW = "\033[33m";
  const std::string BLUE   = "\033[34m";
  const std::string MAGENTA= "\033[35m";
  const std::string CYAN   = "\033[36m";
  const std::string WHITE  = "\033[37m";
  const std::string BG_BLACK   = "\033[40m";
  const std::string BG_RED     = "\033[41m";
  const std::string BG_GREEN   = "\033[42m";
  const std::string BG_YELLOW  = "\033[43m";
  const std::string BG_BLUE    = "\033[44m";
  const std::string BG_MAGENTA = "\033[45m";
  const std::string BG_CYAN    = "\033[46m";
  const std::string BG_WHITE   = "\033[47m";
}

/* ---- Terminal raw-mode helpers (Unix only) ---- */
#ifndef _WIN32
static termios originalTerm;

void enableRawMode() {
    tcgetattr(STDIN_FILENO, &originalTerm);
    termios raw = originalTerm;
    raw.c_lflag &= ~(ECHO | ICANON);
    raw.c_cc[VMIN]  = 1;
    raw.c_cc[VTIME] = 0;
    tcsetattr(STDIN_FILENO, TCSAFLUSH, &raw);
}

void disableRawMode() {
    tcsetattr(STDIN_FILENO, TCSAFLUSH, &originalTerm);
}

int readKey() {
    unsigned char c = 0;
    if (read(STDIN_FILENO, &c, 1) != 1) return -1;
    if (c == 27) {           /* ESC sequence → arrow key */
        unsigned char seq[2] = {};
        if (read(STDIN_FILENO, &seq[0], 1) != 1) return 27;
        if (read(STDIN_FILENO, &seq[1], 1) != 1) return 27;
        if (seq[0] == '[') {
            switch (seq[1]) {
                case 'A': return 1001; /* Up    → 2 */
                case 'B': return 1002; /* Down  → 3 */
                case 'C': return 1003; /* Right → 1 */
                case 'D': return 1004; /* Left  → 0 */
            }
        }
        return 27;
    }
    return (int)c;
}
#else
int readKey() {
    int c = _getch();
    if (c == 0 || c == 0xE0) {
        int c2 = _getch();
        switch (c2) {
            case 72: return 1001; /* Up    */
            case 80: return 1002; /* Down  */
            case 77: return 1003; /* Right */
            case 75: return 1004; /* Left  */
        }
    }
    return c;
}
void enableRawMode()  {}
void disableRawMode() {}
#endif

/* ---- Tile colours ---- */
std::string tileColor(int val) {
    switch (val) {
        case    2: return Color::BG_WHITE   + Color::BLACK;
        case    4: return Color::BG_WHITE   + Color::YELLOW;
        case    8: return Color::BG_YELLOW  + Color::BLACK;
        case   16: return Color::BG_YELLOW  + Color::RED;
        case   32: return Color::BG_RED     + Color::WHITE;
        case   64: return Color::BG_RED     + Color::YELLOW;
        case  128: return Color::BG_MAGENTA + Color::WHITE;
        case  256: return Color::BG_MAGENTA + Color::YELLOW;
        case  512: return Color::BG_BLUE    + Color::WHITE;
        case 1024: return Color::BG_CYAN    + Color::BLACK;
        case 2048: return Color::BG_GREEN   + Color::WHITE;
        default:   return Color::BG_BLACK   + Color::CYAN;
    }
}

/* ---- Render a single board ---- */
void drawBoard(const GameBoard& b, const std::string& label,
               int score, const std::string& labelColor = Color::CYAN) {
    const int W = 7; /* cell width */
    std::string sep = "+" + std::string(W, '-') + "+" +
                           std::string(W, '-') + "+" +
                           std::string(W, '-') + "+" +
                           std::string(W, '-') + "+";

    /* Label + score */
    std::cout << Color::BOLD << labelColor
              << std::left << std::setw(20) << label
              << Color::RESET
              << Color::BOLD << " Score: " << Color::YELLOW
              << score << Color::RESET << "\n";

    std::cout << sep << "\n";
    for (int r = 0; r < GameBoard::SIZE; ++r) {
        std::cout << "|";
        for (int c = 0; c < GameBoard::SIZE; ++c) {
            int v = b.grid[r][c];
            if (v == 0) {
                std::cout << std::string(W, ' ') << "|";
            } else {
                std::string cell = std::to_string(v);
                int pad  = (W - (int)cell.size());
                int lpad = pad / 2, rpad = pad - lpad;
                std::cout << tileColor(v) << Color::BOLD
                          << std::string(lpad, ' ')
                          << cell
                          << std::string(rpad, ' ')
                          << Color::RESET << "|";
            }
        }
        std::cout << "\n" << sep << "\n";
    }
}

/* ---- Game modes ---- */
enum class Mode { SOLO, WATCH_AI, VS_AI, VS_FRIEND };

/* ---- Main menu ---- */
Mode selectMode() {
    while (true) {
        system(CLEAR);
        std::cout << Color::BOLD << Color::YELLOW
                  << "  ╔══════════════════╗\n"
                  << "  ║   2048  (C++)    ║\n"
                  << "  ╚══════════════════╝\n"
                  << Color::RESET << "\n"
                  << "  1) Solo Play\n"
                  << "  2) Watch AI\n"
                  << "  3) You vs AI\n"
                  << "  4) vs Friend (take turns)\n"
                  << "  Q) Quit\n\n"
                  << "  Choice: ";
        int k = readKey();
        if (k == '1') return Mode::SOLO;
        if (k == '2') return Mode::WATCH_AI;
        if (k == '3') return Mode::VS_AI;
        if (k == '4') return Mode::VS_FRIEND;
        if (k == 'q' || k == 'Q') { disableRawMode(); exit(0); }
    }
}

std::string selectDifficulty() {
    while (true) {
        system(CLEAR);
        std::cout << Color::BOLD << "  AI Difficulty:\n" << Color::RESET
                  << "  1) Easy\n"
                  << "  2) Normal\n"
                  << "  3) Hard\n"
                  << "  4) Extreme\n\n"
                  << "  Choice: ";
        int k = readKey();
        if (k == '1') return "easy";
        if (k == '2') return "normal";
        if (k == '3') return "hard";
        if (k == '4') return "extreme";
    }
}

/* ---- Key → direction ---- */
int keyToDir(int k) {
    if (k == 'a' || k == 'A' || k == 1004) return 0; /* left  */
    if (k == 'd' || k == 'D' || k == 1003) return 1; /* right */
    if (k == 'w' || k == 'W' || k == 1001) return 2; /* up    */
    if (k == 's' || k == 'S' || k == 1002) return 3; /* down  */
    return -1;
}

/* ---- Direction name ---- */
const char* dirName(int d) {
    switch(d){ case 0:return "LEFT"; case 1:return "RIGHT";
               case 2:return "UP";   case 3:return "DOWN"; default:return "?"; }
}

/* ===== SOLO ===== */
void playSolo() {
    GameBoard b;
    b.reset();
    while (true) {
        system(CLEAR);
        std::cout << Color::BOLD << Color::YELLOW
                  << "  2048 — Solo Play\n" << Color::RESET
                  << "  W/A/S/D or arrows · R=restart · Q=quit\n\n";
        drawBoard(b, "YOU", b.score, Color::GREEN);
        if (b.won)  { std::cout << Color::BOLD << Color::GREEN  << "\n  ★ You reached 2048! Keep going!\n" << Color::RESET; }
        if (b.over) { std::cout << Color::BOLD << Color::RED    << "\n  Game Over!\n" << Color::RESET; break; }
        int k = readKey();
        if (k == 'q' || k == 'Q') break;
        if (k == 'r' || k == 'R') { b.reset(); continue; }
        int dir = keyToDir(k);
        if (dir >= 0) b.move(dir);
    }
    std::cout << "\n  Final Score: " << Color::BOLD << b.score << Color::RESET
              << "  Best Tile: "  << Color::BOLD << b.maxTile() << Color::RESET << "\n";
    std::cout << "\n  Press any key..."; readKey();
}

/* ===== WATCH AI ===== */
void watchAI(const std::string& diff) {
    GameBoard b;
    b.reset();
    AIEngine ai(diff);
    int moveCount = 0;
    bool paused = false;
    while (!b.over) {
        system(CLEAR);
        std::cout << Color::BOLD << Color::YELLOW
                  << "  2048 — Watch AI (" << diff << ")\n" << Color::RESET
                  << "  P=pause  Q=quit  Moves=" << moveCount << "\n\n";
        drawBoard(b, "AI", b.score, Color::MAGENTA);
        if (paused) {
            std::cout << Color::BOLD << Color::CYAN << "\n  [PAUSED] Press P to resume\n" << Color::RESET;
            while (true) {
                int k = readKey();
                if (k == 'p' || k == 'P') { paused = false; break; }
                if (k == 'q' || k == 'Q') goto done;
            }
        }
        /* non-blocking check for pause/quit */
#ifndef _WIN32
        fd_set fds; FD_ZERO(&fds); FD_SET(STDIN_FILENO, &fds);
        timeval tv{0, 0};
        if (select(1, &fds, nullptr, nullptr, &tv) > 0) {
            int k = readKey();
            if (k == 'p' || k == 'P') paused = true;
            if (k == 'q' || k == 'Q') goto done;
        }
#endif
        int dir = ai.bestMove(b);
        if (dir < 0) break;
        b.move(dir);
        ++moveCount;
        std::this_thread::sleep_for(std::chrono::milliseconds(120));
    }
    done:
    system(CLEAR);
    drawBoard(b, "AI — FINISHED", b.score, Color::MAGENTA);
    std::cout << "\n  Moves: " << moveCount
              << "  Score: " << Color::BOLD << b.score << Color::RESET
              << "  Best: " << Color::BOLD << b.maxTile() << Color::RESET << "\n";
    std::cout << "\n  Press any key..."; readKey();
}

/* ===== VS AI ===== */
void vsAI(const std::string& diff) {
    GameBoard human, aiBoard;
    human.reset(); aiBoard.reset();
    AIEngine ai(diff);

    while (!human.over || !aiBoard.over) {
        system(CLEAR);
        std::cout << Color::BOLD << Color::YELLOW
                  << "  2048 — You vs AI (" << diff << ")\n" << Color::RESET
                  << "  W/A/S/D=move · R=restart · Q=quit\n\n";

        drawBoard(human,   "YOU",          human.score,   Color::GREEN);
        std::cout << "\n";
        drawBoard(aiBoard, "AI (" + diff + ")", aiBoard.score, Color::MAGENTA);

        if (human.over)   std::cout << Color::RED    << "\n  Your board: GAME OVER\n" << Color::RESET;
        if (aiBoard.over) std::cout << Color::YELLOW << "\n  AI board: FINISHED\n"    << Color::RESET;

        if (human.over && aiBoard.over) break;

        /* Human move */
        if (!human.over) {
            int k = readKey();
            if (k == 'q' || k == 'Q') break;
            if (k == 'r' || k == 'R') { human.reset(); aiBoard.reset(); continue; }
            int dir = keyToDir(k);
            if (dir >= 0) human.move(dir);
        }
        /* AI move */
        if (!aiBoard.over) {
            int dir = ai.bestMove(aiBoard);
            if (dir >= 0) aiBoard.move(dir);
        }
    }

    std::cout << "\n  === RESULTS ===\n";
    std::cout << "  You : " << human.score   << "  (best tile " << human.maxTile()   << ")\n";
    std::cout << "  AI  : " << aiBoard.score << "  (best tile " << aiBoard.maxTile() << ")\n";
    if (human.score > aiBoard.score)       std::cout << Color::BOLD << Color::GREEN   << "  YOU WIN!\n" << Color::RESET;
    else if (aiBoard.score > human.score)  std::cout << Color::BOLD << Color::MAGENTA << "  AI WINS!\n" << Color::RESET;
    else                                   std::cout << Color::BOLD << Color::YELLOW  << "  TIE!\n"     << Color::RESET;
    std::cout << "\n  Press any key..."; readKey();
}

/* ===== VS FRIEND ===== */
void vsFriend() {
    GameBoard p1, p2;
    p1.reset(); p2.reset();
    int turn = 0; /* 0=P1, 1=P2 */

    while (!p1.over || !p2.over) {
        system(CLEAR);
        std::cout << Color::BOLD << Color::YELLOW
                  << "  2048 — Player 1 vs Player 2\n" << Color::RESET
                  << "  W/A/S/D=move · R=restart · Q=quit\n\n";

        drawBoard(p1, "PLAYER 1", p1.score, Color::GREEN);
        std::cout << "\n";
        drawBoard(p2, "PLAYER 2", p2.score, Color::BLUE);

        if (!p1.over && !p2.over) {
            std::cout << Color::BOLD
                      << (turn == 0 ? Color::GREEN : Color::BLUE)
                      << "\n  *** " << (turn == 0 ? "PLAYER 1" : "PLAYER 2")
                      << "'S TURN ***\n" << Color::RESET;
        }

        GameBoard& active = (turn == 0) ? p1 : p2;
        if (active.over) { turn = 1 - turn; continue; }

        int k = readKey();
        if (k == 'q' || k == 'Q') break;
        if (k == 'r' || k == 'R') { p1.reset(); p2.reset(); turn = 0; continue; }
        int dir = keyToDir(k);
        if (dir >= 0) {
            active.move(dir);
            turn = 1 - turn;
        }
    }

    std::cout << "\n  === FINAL RESULTS ===\n";
    std::cout << "  P1: " << p1.score << "  (best tile " << p1.maxTile() << ")\n";
    std::cout << "  P2: " << p2.score << "  (best tile " << p2.maxTile() << ")\n";
    if (p1.score > p2.score)      std::cout << Color::BOLD << Color::GREEN << "  PLAYER 1 WINS!\n" << Color::RESET;
    else if (p2.score > p1.score) std::cout << Color::BOLD << Color::BLUE  << "  PLAYER 2 WINS!\n" << Color::RESET;
    else                          std::cout << Color::BOLD << Color::YELLOW << "  TIE!\n"           << Color::RESET;
    std::cout << "\n  Press any key..."; readKey();
}

/* ===== MAIN ===== */
int main() {
    enableRawMode();
    /* Restore terminal on Ctrl+C */
    std::signal(SIGINT, [](int){ disableRawMode(); exit(0); });

    while (true) {
        Mode mode = selectMode();
        std::string diff;
        if (mode == Mode::WATCH_AI || mode == Mode::VS_AI)
            diff = selectDifficulty();

        switch (mode) {
            case Mode::SOLO:      playSolo();       break;
            case Mode::WATCH_AI:  watchAI(diff);    break;
            case Mode::VS_AI:     vsAI(diff);       break;
            case Mode::VS_FRIEND: vsFriend();       break;
        }
    }

    disableRawMode();
    return 0;
}
