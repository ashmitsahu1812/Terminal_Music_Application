# Terminal Music Player

[![GitHub](https://img.shields.io/badge/GitHub-Repository-blue?logo=github)](https://github.com/ashmitsahu1812/Terminal_Music_Application)

A terminal-based music player built with Node.js that runs entirely in the command line.

🔗 **Repository:** [https://github.com/ashmitsahu1812/Terminal_Music_Application](https://github.com/ashmitsahu1812/Terminal_Music_Application)

## Features

✨ **Full Terminal UI** — Box-drawn interface with colors and visual indicators  
🎵 **Auto-play** — Automatically plays next song when current finishes  
⏭️ **Skip Controls** — Jump to next/previous tracks instantly  
⏸️ **Pause/Resume** — Full playback control  
📊 **Progress Bar** — Visual playlist position indicator  
🎹 **Keyboard Navigation** — Arrow keys, shortcuts, and number selection

## How to Run

1. **Add MP3 files** to the `songs/` folder
2. **Run the player:**
   ```bash
   node musicPlayer.js
   ```

## Controls

| Key | Action |
|-----|--------|
| `↑` / `↓` | Navigate up/down in playlist |
| `Enter` | Play the selected song |
| `N` | Skip to next song |
| `B` | Go back to previous song |
| `P` | Pause current song |
| `R` | Resume paused song |
| `Q` | Quit the player |
| `1-9` | Jump directly to that song number |

## Technical Details

- **Language:** Node.js (JavaScript)
- **Dependencies:** None (uses built-in modules only)
- **Modules:** `child_process`, `fs`
- **Audio Player:** `afplay` (macOS built-in)
- **UI:** ANSI escape codes for terminal graphics

## How It Works

1. **File Loading:** Uses `fs.readdirSync()` to read all `.mp3` and `.aiff` files from the `songs/` directory
2. **Audio Playback:** Uses `child_process.spawn()` to launch `afplay` as a separate process
3. **Pause/Resume:** Sends Unix signals `SIGSTOP` and `SIGCONT` to the audio process
4. **Keyboard Input:** Uses `process.stdin` in raw mode to capture keypresses instantly
5. **UI Rendering:** Clears screen and redraws using ANSI escape sequences on every state change

## Architecture

```
musicPlayer.js
│
├── State Variables
│   ├── songs array (loaded from files)
│   ├── selected (currently highlighted song)
│   ├── nowPlaying (current song name)
│   ├── childProcess (afplay process reference)
│   └── isPaused (playback state)
│
├── Core Functions
│   ├── render() — draws the full UI
│   ├── playSong(index) — starts playback
│   ├── playNext() — skip forward
│   ├── playPrevious() — skip backward
│   ├── pause() — sends SIGSTOP
│   └── resume() — sends SIGCONT
│
└── Input Handler
    └── process.stdin.on('data') — captures all keypresses
```

## Viva Questions & Answers

**Q: What modules are used?**  
A: `child_process` for spawning the audio player process, and `fs` for reading the songs directory.

**Q: Why use `spawn` instead of `exec`?**  
A: `spawn` gives us a live process reference so we can send signals (pause/resume) and listen for events. `exec` is for short commands that run and exit.

**Q: How does pause/resume work?**  
A: We send Unix signals to the process. `SIGSTOP` freezes the process without killing it, and `SIGCONT` unfreezes it to continue playback.

**Q: What is `setRawMode(true)`?**  
A: It puts stdin in raw mode, meaning every keypress is sent immediately to our program without waiting for Enter. This enables arrow keys and single-letter commands.

**Q: How are arrow keys detected?**  
A: Arrow keys send escape sequences. Up arrow is `\x1b[A`, down is `\x1b[B`. We check for these in the input handler.

**Q: How does the UI update without scrolling?**  
A: Every render clears the entire screen with `\x1b[2J\x1b[H` (ANSI clear screen + move cursor to top), then redraws everything. This creates the illusion of an in-place update.

**Q: What are ANSI escape codes?**  
A: Special character sequences starting with `\x1b[` that terminals interpret as formatting commands — colors, bold, clear screen, etc.

## Project Summary

> "A terminal music player in Node.js that uses `fs` to load MP3s, `child_process.spawn` to play them via `afplay`, Unix signals SIGSTOP/SIGCONT for pause/resume, and ANSI escape codes to render a live-updating terminal UI with keyboard navigation."
