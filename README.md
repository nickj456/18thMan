# 18th Man

A coaching platform built for rugby league coaches, by a former professional player with 20+ years of coaching experience.

**Live:** [18thman.app](https://18thman.app)

18th Man has two parts:

1. **The web platform** for designing drills, planning sessions, analysing players and connecting with other coaches.
2. **Match Analyst**, a desktop app for tagging match video and capturing player stats.

## Web platform

- **Drill Library**: browse, search and rate drills. Paste a YouTube link and AI turns the video into a structured coaching guide.
- **Drill Designer**: draw drills on a rugby league pitch with players, runs, equipment and zones. Export as PNG or PDF.
- **Play Designer**: draw a play and watch it animate. Export as a video clip or image.
- **Session Planner**: build a timed session from the drill library and export it as a PDF.
- **Coach Chat**: an AI rugby league assistant, direct messages, and community discussions.
- **Coach DNA**: a coaching style assessment with a shareable profile card.
- **Clubs and groups**: manage squads and share content across a club.

Built with Next.js, TypeScript, Supabase (auth, Postgres, realtime, edge functions), the Vercel AI SDK, React Konva and Remotion. Deployed on Vercel.

```bash
cd web
npm install
npm run dev
npm test
```

You'll need a `.env.local` with your own Supabase project URL and keys.

## Match Analyst (desktop)

An Electron app for coaches to tag live or recorded match video with keyboard shortcuts.

- Streams video from disk, so 2GB+ files work fine.
- Everything stays local. Nothing is uploaded.
- Auto-saves every 500 ms and offers to restore your last session.
- Exports stats to CSV and PDF, and clips with ffmpeg (bundled, no separate install).

Requires Node.js 18+. Windows 10/11 for the installer; dev mode also runs on Mac and Linux.

```bash
npm install
npm run dev     # Vite + Electron in parallel
npm run build   # builds the Windows installer into dist/
```

Installers are published to [Releases](https://github.com/nickj456/18thMan/releases) when a version tag is pushed.

### Keyboard shortcuts

**Player selection**

| Key | Player |
|---|---|
| 1 to 9 | Players 1 to 9 |
| 0 | Player 10 |
| - | Player 11 |
| = | Player 12 |
| Backspace | Player 13 |

**Stat capture**

| Key | Stat | Key | Stat |
|---|---|---|---|
| T | Try | K | Kick |
| A | Tackle | P | Penalty won |
| M | Missed tackle | N | Penalty conceded |
| C | Carry | E | Error |
| L | Line break | I | Intercept |
| S | Support | O | Offload |

Shortcuts are disabled while a text box is focused.

## Project structure

```
web/        Next.js web platform
src/        Match Analyst desktop app (Electron + React)
remotion/   Animated drill and play videos
supabase/   Edge functions
docs/       Design plans and specs
```

See [CHANGELOG.md](CHANGELOG.md) for release history.

## Author

Built by [Nick Johnson](https://github.com/nickj456).
