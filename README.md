# 18thMan Match Analyst

Desktop video analysis application for rugby league coaches.

## Requirements

- Node.js 18+
- Windows 10/11 (for `.exe` packaging; dev mode works on Mac/Linux too)

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

Starts the Vite dev server (port 5173) and Electron in parallel. DevTools open automatically in a detached window.

## Build installer

```bash
npm run build
```

Runs `vite build` (outputs to `dist-react/`) then `electron-builder` (outputs NSIS `.exe` to `dist/`).

## Project structure

```
src/
  main/
    main.js       — Electron main process, IPC handlers, ffmpeg export
    preload.js    — contextBridge API exposed to renderer
  renderer/
    App.jsx       — Root component + global state
    components/   — All UI components
    utils/
      export.js   — CSV download + PDF HTML generator
  assets/
    logo.png      — Drop your logo here (displayed in header)
    icon.ico      — App icon used by Windows installer
```

## Adding your logo

Drop `logo.png` into `src/assets/`. The header displays it automatically; if the file is missing it falls back to the "18thMAN" amber text.

## Keyboard shortcuts

### Player selection
| Key | Player |
|-----|--------|
| `1`–`9` | Players 1–9 |
| `0` | Player 10 |
| `-` | Player 11 |
| `=` | Player 12 |
| `Backspace` | Player 13 |

### Stat capture
| Key | Stat |
|-----|------|
| `T` | Try |
| `A` | Tackle |
| `M` | Missed tackle |
| `C` | Carry |
| `L` | Line break |
| `S` | Support |
| `O` | Offload |
| `K` | Kick |
| `P` | Penalty won |
| `N` | Penalty conceded |
| `E` | Error |
| `I` | Intercept |

Shortcuts are disabled when a text input is focused.

## Notes

- Video files are streamed from disk via `file://` — no memory loading. Works with 2GB+ files.
- All processing is local. Nothing is uploaded.
- Session auto-saves every 500 ms via `electron-store`. On next launch you'll be offered to restore it.
- `ffmpeg-static` is bundled in `app.asar.unpacked` so users need no separate install.
