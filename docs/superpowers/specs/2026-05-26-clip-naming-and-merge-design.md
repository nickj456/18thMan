# Clip Naming and Merge by Player — Design Spec

**Date:** 2026-05-26  
**Status:** Approved

## Overview

Three related improvements to the clipping workflow:

1. **Timestamp in clip labels** — clips created from events include the event timestamp so multiple clips for the same player/stat are distinguishable
2. **Merge by player (Clips tab)** — post-hoc button that groups existing saved clips by player and produces one merged video per player, added to the clips list alongside the individuals
3. **Merge by player (ClipBuilder toggle)** — one-shot flow at clip creation time: create + export + merge in a single action

---

## Feature 1: Timestamp in Clip Labels

### What changes

Clip labels generated from events change from:

```
Missed tackle – John Smith
```

to:

```
Missed tackle – John Smith 01:23
```

`fmtTime` (already imported in both files) formats the timestamp.

### Files affected

- `src/renderer/components/EventsTab.jsx` — `handleAutoClip`: change label template
- `src/renderer/components/ClipBuilder.jsx` — `handleCreateClips`: change label template

### Change

```js
// Before
label: `${ev.statLabel} – ${ev.playerName}`

// After
label: `${ev.statLabel} – ${ev.playerName} ${fmt(ev.timestamp)}`
```

---

## Feature 2: Store playerName on Event-Sourced Clips

### What changes

When clips are created from events, `addClip` receives an additional `playerName` field. Manual clips from `ClipControls` do not receive this field — it is `undefined` for them.

The existing `addClip` handler in `App.jsx` uses spread (`{ ...clip, id: Date.now(), status: 'pending' }`), so `playerName` passes through automatically with no App.jsx changes.

### Files affected

- `src/renderer/components/EventsTab.jsx` — `handleAutoClip`
- `src/renderer/components/ClipBuilder.jsx` — `handleCreateClips`

### Change

```js
addClip?.({ inPoint, outPoint, label: `...`, playerName: ev.playerName })
```

---

## Feature 3: Clips Tab "Merge by Player" Button

### Where it lives

A "MERGE BY PLAYER" button added to the existing toolbar row in `ClipsTab.jsx`, alongside the existing export/reel controls.

### Behaviour

- **Enabled** only when there are 2+ saved clips (status `'saved'`) that share the same `playerName`
- **Disabled** (greyed out) otherwise, with tooltip "Export 2+ clips for a player to enable"
- When clicked:
  1. Groups all `saved` clips by `playerName` (clips without `playerName` are ignored)
  2. Skips any player group with fewer than 2 clips
  3. For each qualifying player group, calls `window.electron.exportHighlightReel({ clips: group, outputPath: '{outputFolder}/{playerName} – All Clips.mp4' })`
  4. On completion, calls `addClip({ label: '{playerName} – All Clips', status: 'saved', outputFile: outputPath })` — the merged clip appears in the list
  5. Shows notification: "Merged clips for N player(s)"

### What it does NOT do

- Does not delete or alter the individual clips
- Does not re-export clips that are already saved — uses their existing `outputFile` paths
- Ignores clips without a `playerName` (manually created clips)

### Files affected

- `src/renderer/components/ClipsTab.jsx` — add button to toolbar, add merge handler

### Props already available in ClipsTab

`clips`, `addClip`, `outputFolder`, `showNotification` — all already passed. No new props needed.

---

## Feature 4: ClipBuilder "Merge by Player" Toggle

### Where it lives

A checkbox "Merge clips by player after export" in the left column of `ClipBuilder`, directly below the buffer inputs section.

### Behaviour

- Default: unchecked
- When unchecked: CREATE button works exactly as today
- When checked:
  1. CREATE button label changes to "✂️ CREATE N CLIPS + MERGE BY PLAYER"
  2. On click:
     a. Creates all individual clips via `addClip` (with `playerName`)
     b. Immediately calls `window.electron.exportAllClips({ clips: newClips, sourceFile: videoFile.path, outputFolder })` to export them
     c. As each clip exports, calls `updateClipStatus(id, 'saved', outputFile)`
     d. After all exports complete, groups by `playerName` and calls `window.electron.exportHighlightReel` per player group (2+ clips only)
     e. Adds each merged result via `addClip({ label: '{playerName} – All Clips', status: 'saved', outputFile: path })`
     f. Shows notification: "N clips created and merged for M player(s)"
- If `outputFolder` is not set when CREATE is clicked with the toggle on, shows error notification: "Select an output folder first" (same guard as existing export flow)
- If `videoFile` is not set, same guard

### New props passed to ClipBuilder from RightPanel

| Prop | Source |
|------|--------|
| `outputFolder` | already in RightPanel props |
| `videoFile` | already in RightPanel props |
| `updateClipStatus` | already in RightPanel props |

### Files affected

- `src/renderer/components/ClipBuilder.jsx` — add toggle state, update CREATE handler, update button label
- `src/renderer/components/RightPanel.jsx` — pass 3 additional props to ClipBuilder

---

## Data Flow Summary

```
EventsTab / ClipBuilder
    addClip({ ..., playerName })
          ↓
    clips[] in App.jsx  ←→  ClipsTab (Merge by player button)
          ↓
    exportHighlightReel (per player group)
          ↓
    addClip({ label: '{player} – All Clips', status: 'saved', outputFile })
          ↓
    clips[] (individual clips + merged clips side by side)
```

---

## Out of Scope

- Merging manual (non-event) clips by player
- Any UI to rename or reorder clips within a merge group before merging
- Automatic re-merge when new clips are added for a player
