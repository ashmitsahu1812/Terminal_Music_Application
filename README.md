# Terminal Music Player 🎵

A production-grade, feature-rich Terminal User Interface (TUI) Music Player application built with Node.js, TypeScript, and Blessed.

![Terminal Music Player](https://img.shields.io/badge/Status-Production--Ready-brightgreen)
![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## ✨ Features

- 🎧 **Low-Latency Audio Backend Engine:**
  - Built-in low latency native audio engine supporting MP3, WAV, FLAC, OGG, M4A, and AAC formats.
  - Supports macOS `afplay`, `mpv` IPC socket JSON-RPC API, and `ffplay` backends with automatic fallback detection.
  - Non-blocking audio process spawning keeping the TUI responsive at 60 FPS.
  - Precise position seeking (`-5s`, `+5s`, `-30s`, `+30s`, absolute time).
  - Logarithmic gain volume control (`0-100%`) and instant mute toggle.

- 🖥️ **Responsive Multi-Tab Terminal User Interface:**
  - **Library View (`1`):** Interactive track list table with column sorting (Title, Artist, Album, Duration, Format), instant fuzzy search, and quick play.
  - **Playlists View (`2`):** Create, rename, edit track contents, reorder, and delete playlists.
  - **Queue View (`3`):** Dynamic "Up Next" list with hotkey reordering (`Shift+J`/`Shift+K`), item removal (`d`), and clear queue.
  - **Spectrum Visualizer View (`4`):** Real-time ASCII audio spectrum analyzer with dynamic frequency bars (` ▂▃▄▅▆▇█`).
  - **Album Art & Metadata View (`5`):** 24-bit TrueColor RGB ANSI half-block (`▀`/`▄`) graphics renderer displaying cover art alongside full ID3 tag details.

- ⚡ **Power-User Controls & Hotkeys:**
  - **Vim Navigation:** `j` / `k` row navigation, `h` / `l` seek, `1-5` tab switching.
  - **Playback Keys:** `[Space]` Play/Pause, `n` Next track, `p` Previous track, `s` Shuffle (Fisher-Yates algorithm), `r` Loop mode cycle (`off` → `track` → `queue`).
  - **Command Palette (`:`):** Vim-style command prompt for commands like `:play <name>`, `:queue add <name>`, `:theme cyberpunk`, `:volume 80`, `:seek +10`, `:scan <dir>`.
  - **Fuzzy Search (`/`):** Real-time library filtering powered by `Fuse.js`.

- 💾 **State Persistence & Configuration:**
  - Saved settings (keybindings, theme, volume, loop/shuffle mode), library catalog index, and playlists persisted to local JSON files (`~/.config/terminal-music/`).
  - Customizable color themes: `cyberpunk`, `matrix`, `nord`, `dark`, `monochrome`.

---

## 🚀 Quick Start

### 1. Installation

```bash
git clone https://github.com/ashmitsahu1812/Terminal_Music_Application.git
cd Terminal_Music_Application
npm install
```

### 2. Generate Sample Tracks (Optional)

Generate 3 synthesized WAV sample music tracks to test immediately:

```bash
npm run generate-samples
```

### 3. Run the Application

```bash
npm start
```

Or scan a custom directory containing your music collection:

```bash
npx tsx src/index.ts --dir /path/to/your/music
```

### 4. Build TypeScript

```bash
npm run build
```

### 5. Run Automated Tests

```bash
npm test
```

---

## ⌨️ Keyboard Shortcuts Reference

| Key | Description |
|---|---|
| `Space` | Play / Pause active track |
| `n` | Next track in queue |
| `p` | Previous track / restart |
| `h` / `l` | Seek backward / forward 5 seconds |
| `+` / `-` | Increase / decrease volume by 5% |
| `m` | Toggle mute |
| `s` | Toggle Fisher-Yates shuffle mode |
| `r` | Cycle loop mode (Off → Track → Queue) |
| `1` - `5` | Switch between Library, Playlists, Queue, Visualizer, Album Art views |
| `a` | Add selected library track to Queue |
| `Shift+J` / `Shift+K` | Move selected track down / up in Queue view |
| `d` | Delete selected track from Queue view |
| `/` | Trigger fuzzy search filter across library |
| `:` | Open Command Palette prompt |
| `q` / `Ctrl+C` | Clean exit & restore terminal raw mode |

---

## 🛠️ Architecture Overview

```
src/
├── audio/
│   └── AudioEngine.ts        # Event-driven audio process spawner (afplay, mpv, ffplay)
├── parser/
│   ├── MetadataParser.ts     # music-metadata tag extraction & directory scanner
│   └── ANSIArtRenderer.ts    # 24-bit TrueColor ANSI half-block album art graphics
├── storage/
│   └── StorageManager.ts     # Persistence layer (~/.config/terminal-music/*.json)
├── store/
│   └── AppStore.ts           # Central reactive state manager & Fisher-Yates queue
├── ui/
│   ├── Theme.ts              # Multi-theme color definitions
│   ├── Header.ts             # App header bar with ASCII logo & clock
│   ├── Footer.ts             # Bottom dock with progress bar & volume status
│   ├── LibraryView.ts        # Track library table & column sorter
│   ├── PlaylistView.ts       # Playlist manager
│   ├── QueueView.ts          # Interactive queue manager
│   ├── VisualizerView.ts     # Real-time ASCII spectrum analyzer
│   ├── AlbumArtView.ts       # ANSI cover art & metadata inspector
│   ├── CommandPalette.ts     # Overlay CLI command prompt & fuzzy search
│   ├── ShortcutsBar.ts       # Context-aware keybindings helper bar
│   └── UIManager.ts          # Blessed screen manager & signal dispatcher
└── index.ts                  # CLI entry point
```

---

## 📜 License

MIT License © 2026 Ashmit Sahu
