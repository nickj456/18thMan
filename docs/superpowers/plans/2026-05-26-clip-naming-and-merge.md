# Clip Naming and Merge by Player — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add timestamps to clip labels, store playerName on event-sourced clips, and add "Merge by player" in both the Clips tab (post-hoc) and ClipBuilder (one-shot create+export+merge).

**Architecture:** Four independent tasks. Tasks 1 and 2 are prerequisites for Tasks 3 and 4 — do them first. `addClip` in App.jsx is extended to accept caller-provided `id` and `status` so the ClipBuilder merge flow can track clips through export. No new IPC handlers needed — reuses `exportClip` and `exportHighlightReel`.

**Tech Stack:** React 18, Electron IPC (`window.electron.exportClip`, `window.electron.exportHighlightReel`), ffmpeg-static (already bundled).

---

## File Map

| Action | File | What changes |
|--------|------|--------------|
| Modify | `src/renderer/components/EventsTab.jsx` | Label gets timestamp, addClip call gets playerName |
| Modify | `src/renderer/components/ClipBuilder.jsx` | Label gets timestamp, addClip call gets playerName, merge toggle + async export+merge flow, new props |
| Modify | `src/renderer/App.jsx` | addClip accepts caller-provided id and status |
| Modify | `src/renderer/components/ClipsTab.jsx` | Destructure addClip prop, add mergeByPlayer handler + button |
| Modify | `src/renderer/components/RightPanel.jsx` | Pass outputFolder, videoFile, updateClipStatus to ClipBuilder |

---

## Task 1: Timestamp + playerName on Event-Sourced Clips

**Files:**
- Modify: `src/renderer/components/EventsTab.jsx:29-45`
- Modify: `src/renderer/components/ClipBuilder.jsx:76-89`

- [ ] **Step 1: Update EventsTab handleAutoClip label and add playerName**

  In `src/renderer/components/EventsTab.jsx`, find `handleAutoClip` and change the `addClip` call from:
  ```jsx
  addClip?.({ inPoint, outPoint, label: `${ev.statLabel} – ${ev.playerName}` })
  ```
  to:
  ```jsx
  addClip?.({ inPoint, outPoint, label: `${ev.statLabel} – ${ev.playerName} ${fmt(ev.timestamp)}`, playerName: ev.playerName })
  ```

- [ ] **Step 2: Update ClipBuilder handleCreateClips label and add playerName**

  In `src/renderer/components/ClipBuilder.jsx`, find `handleCreateClips` and change the `addClip` call from:
  ```jsx
  addClip?.({ inPoint, outPoint, label: `${ev.statLabel} – ${ev.playerName}` })
  ```
  to:
  ```jsx
  addClip?.({ inPoint, outPoint, label: `${ev.statLabel} – ${ev.playerName} ${fmt(ev.timestamp)}`, playerName: ev.playerName })
  ```

- [ ] **Step 3: Manual verification**

  Run `npm run dev`. Log 3+ events for the same player, then use AUTO-CLIP or Clip Builder CREATE. In the Clips tab, confirm labels now read e.g. `Missed tackle – John Smith 01:23` with distinct timestamps for each clip.

---

## Task 2: addClip Accepts Caller-Provided id and status

**Files:**
- Modify: `src/renderer/App.jsx:366`

This is needed so the ClipBuilder merge flow can generate a stable clip ID before calling addClip, then update that clip's status via updateClipStatus after export.

- [ ] **Step 1: Update addClip in App.jsx**

  In `src/renderer/App.jsx` line 366, change:
  ```js
  const addClip = useCallback((clip) => setClips(p => [...p, { ...clip, id: Date.now(), status:'pending' }]), [])
  ```
  to:
  ```js
  const addClip = useCallback((clip) => setClips(p => [...p, { ...clip, id: clip.id ?? Date.now(), status: clip.status ?? 'pending' }]), [])
  ```

  This is non-breaking: all existing callers that don't pass `id` or `status` get the same behaviour as before. The ClipBuilder merge flow will pass explicit values for both.

- [ ] **Step 2: Manual verification**

  Run `npm run dev`. Create a clip manually via ClipControls — confirm it still appears as `pending` and exports normally. The change is non-breaking.

---

## Task 3: Clips Tab "Merge by Player" Button

**Files:**
- Modify: `src/renderer/components/ClipsTab.jsx:6-9,30-41,95-108`

- [ ] **Step 1: Add addClip to ClipsTab props destructuring**

  In `src/renderer/components/ClipsTab.jsx`, change the function signature from:
  ```jsx
  export default function ClipsTab({
    clips, updateClipStatus, deleteClip, reorderClips,
    outputFolder, setOutputFolder, showNotification, videoFile, videoRef,
  }) {
  ```
  to:
  ```jsx
  export default function ClipsTab({
    clips, addClip, updateClipStatus, deleteClip, reorderClips,
    outputFolder, setOutputFolder, showNotification, videoFile, videoRef,
  }) {
  ```

  (`addClip` is already passed from RightPanel — it just wasn't being destructured.)

- [ ] **Step 2: Add mergeByPlayer state and handler**

  After the existing `const [reelExporting, setReelExporting] = useState(false)` line, add:
  ```jsx
  const [mergeExporting, setMergeExporting] = useState(false)
  ```

  After the existing `exportHighlightReel` function (after line 41), add the new handler:
  ```jsx
  const mergeByPlayer = async () => {
    if (!outputFolder) { showNotification('Choose an output folder first', 'error'); return }
    const saved = clips.filter(c => c.status === 'saved' && c.playerName)
    const groups = {}
    saved.forEach(c => {
      if (!groups[c.playerName]) groups[c.playerName] = []
      groups[c.playerName].push(c)
    })
    const qualifying = Object.entries(groups).filter(([, g]) => g.length >= 2)
    if (qualifying.length === 0) {
      showNotification('Need 2+ exported clips for at least one player', 'error')
      return
    }
    setMergeExporting(true)
    let merged = 0
    for (const [playerName, playerClips] of qualifying) {
      const outputPath = `${outputFolder}\\${playerName} – All Clips.mp4`
      const result = await window.electron?.exportHighlightReel({ clips: playerClips, outputPath })
      if (result?.success) {
        addClip({ label: `${playerName} – All Clips`, status: 'saved', outputFile: outputPath, inPoint: 0, outPoint: 0 })
        merged++
      }
    }
    setMergeExporting(false)
    if (merged > 0) showNotification(`Merged clips for ${merged} player${merged > 1 ? 's' : ''}`)
    else showNotification('Merge failed', 'error')
  }
  ```

- [ ] **Step 3: Add the Merge by Player button to the toolbar**

  In the toolbar section (after the existing `🎬 REEL` button block, still inside the `<>` fragment), add:
  ```jsx
  {clips.filter(c => c.status === 'saved' && c.playerName).length >= 2 && (
    <button
      onClick={mergeByPlayer}
      disabled={mergeExporting}
      style={btnStyle(false)}
      title="Merge exported clips into one file per player"
    >
      {mergeExporting ? '…' : '👤 MERGE BY PLAYER'}
    </button>
  )}
  ```

  Place this immediately after the `🎬 REEL` button block.

- [ ] **Step 4: Manual verification**

  Run `npm run dev`. Log events for 2 players, auto-clip, export all. Confirm "MERGE BY PLAYER" button appears in the Clips toolbar. Click it — confirm a merged clip per player appears in the list (e.g. `John Smith – All Clips`) alongside the individual clips.

---

## Task 4: ClipBuilder Merge Toggle

**Files:**
- Modify: `src/renderer/components/ClipBuilder.jsx:19,76-89,98-108,208-224`
- Modify: `src/renderer/components/RightPanel.jsx:147-155`

- [ ] **Step 1: Add new props and merge toggle state to ClipBuilder**

  In `src/renderer/components/ClipBuilder.jsx`, change the function signature from:
  ```jsx
  export default function ClipBuilder({ players, events, addClip, videoRef, showNotification }) {
  ```
  to:
  ```jsx
  export default function ClipBuilder({ players, events, addClip, videoRef, showNotification, outputFolder, videoFile, updateClipStatus }) {
  ```

  After the existing `const [uncheckedEventIds, ...]` line, add:
  ```jsx
  const [mergeAfterExport, setMergeAfterExport] = useState(false)
  const [merging, setMerging] = useState(false)
  ```

- [ ] **Step 2: Replace handleCreateClips with async merge-aware version**

  Replace the existing `handleCreateClips` function entirely with:
  ```jsx
  const handleCreateClips = async () => {
    if (!selectedEvents.length) return
    const duration = videoRef?.current?.duration

    // Build clip objects with stable IDs for tracking through export
    const newClips = []
    selectedEvents.forEach((ev, i) => {
      const inPoint  = Math.max(0, ev.timestamp - bufferBefore)
      const outPoint = duration ? Math.min(duration, ev.timestamp + bufferAfter) : ev.timestamp + bufferAfter
      if (outPoint > inPoint) {
        newClips.push({
          id: Date.now() + i,
          inPoint,
          outPoint,
          label: `${ev.statLabel} – ${ev.playerName} ${fmt(ev.timestamp)}`,
          playerName: ev.playerName,
        })
      }
    })
    if (!newClips.length) return

    // Add individual clips to state (pending)
    newClips.forEach(clip => addClip?.({ id: clip.id, inPoint: clip.inPoint, outPoint: clip.outPoint, label: clip.label, playerName: clip.playerName }))

    if (!mergeAfterExport) {
      showNotification?.(`${newClips.length} clips created — go to Clips tab to export`)
      return
    }

    if (!outputFolder || !videoFile?.path) {
      showNotification?.('Select an output folder first to use merge', 'error')
      return
    }

    setMerging(true)

    // Export each clip immediately
    const exportedClips = []
    for (const clip of newClips) {
      const result = await window.electron?.exportClip({
        sourceFile: videoFile.path,
        inPoint: clip.inPoint,
        outPoint: clip.outPoint,
        label: clip.label,
        outputFolder,
      })
      if (result?.success) {
        updateClipStatus?.(clip.id, 'saved', result.outputFile)
        exportedClips.push({ ...clip, outputFile: result.outputFile })
      } else {
        updateClipStatus?.(clip.id, 'error')
      }
    }

    // Group exported clips by playerName and merge those with 2+ clips
    const groups = {}
    exportedClips.forEach(c => {
      if (!groups[c.playerName]) groups[c.playerName] = []
      groups[c.playerName].push(c)
    })

    let merged = 0
    for (const [playerName, playerClips] of Object.entries(groups)) {
      if (playerClips.length < 2) continue
      const outputPath = `${outputFolder}\\${playerName} – All Clips.mp4`
      const result = await window.electron?.exportHighlightReel({ clips: playerClips, outputPath })
      if (result?.success) {
        addClip?.({ label: `${playerName} – All Clips`, status: 'saved', outputFile: outputPath, inPoint: 0, outPoint: 0 })
        merged++
      }
    }

    setMerging(false)
    showNotification?.(`${exportedClips.length} clips exported${merged > 0 ? ` · merged for ${merged} player${merged > 1 ? 's' : ''}` : ''}`)
  }
  ```

- [ ] **Step 3: Add the merge toggle checkbox to the left column**

  In the left column, after the closing `</div>` of the Buffer inputs section (after line 108), add:
  ```jsx
  {/* Merge toggle */}
  <div style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
      <input
        type="checkbox"
        checked={mergeAfterExport}
        onChange={e => setMergeAfterExport(e.target.checked)}
        disabled={!outputFolder || !videoFile?.path}
      />
      <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 700, color: mergeAfterExport ? 'var(--brand)' : 'var(--muted)', lineHeight: 1.3 }}>
        Merge clips by player after export
      </span>
    </label>
    {mergeAfterExport && (!outputFolder || !videoFile?.path) && (
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--red)', marginTop: 4 }}>
        Requires video + output folder
      </div>
    )}
  </div>
  ```

- [ ] **Step 4: Update the CREATE button label and disabled state**

  Replace the existing CREATE button JSX:
  ```jsx
  <button
    onClick={handleCreateClips}
    disabled={selectedEvents.length === 0}
    style={{
      width: '100%', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800,
      background: selectedEvents.length > 0 ? 'var(--brand)' : 'var(--border)',
      color: selectedEvents.length > 0 ? '#fff' : 'var(--muted)',
      border: 'none', borderRadius: 2, padding: '7px 0',
      cursor: selectedEvents.length > 0 ? 'pointer' : 'default',
      letterSpacing: 0.5,
    }}
  >
    ✂️ CREATE {selectedEvents.length} CLIPS
  </button>
  ```
  with:
  ```jsx
  <button
    onClick={handleCreateClips}
    disabled={selectedEvents.length === 0 || merging}
    style={{
      width: '100%', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800,
      background: selectedEvents.length > 0 && !merging ? 'var(--brand)' : 'var(--border)',
      color: selectedEvents.length > 0 && !merging ? '#fff' : 'var(--muted)',
      border: 'none', borderRadius: 2, padding: '7px 0',
      cursor: selectedEvents.length > 0 && !merging ? 'pointer' : 'default',
      letterSpacing: 0.5,
    }}
  >
    {merging
      ? 'EXPORTING…'
      : mergeAfterExport
        ? `✂️ CREATE ${selectedEvents.length} CLIPS + MERGE BY PLAYER`
        : `✂️ CREATE ${selectedEvents.length} CLIPS`}
  </button>
  ```

- [ ] **Step 5: Pass new props from RightPanel to ClipBuilder**

  In `src/renderer/components/RightPanel.jsx`, find the ClipBuilder render block:
  ```jsx
  {activeTab === 'builder' && (
    <ClipBuilder
      players={players}
      events={events}
      addClip={addClip}
      videoRef={videoRef}
      showNotification={showNotification}
    />
  )}
  ```
  Replace with:
  ```jsx
  {activeTab === 'builder' && (
    <ClipBuilder
      players={players}
      events={events}
      addClip={addClip}
      videoRef={videoRef}
      showNotification={showNotification}
      outputFolder={outputFolder}
      videoFile={videoFile}
      updateClipStatus={updateClipStatus}
    />
  )}
  ```

- [ ] **Step 6: Manual verification**

  Run `npm run dev`. Load a video, set an output folder, log events for 2+ players.

  1. Go to Clip Builder tab — confirm the "Merge clips by player after export" checkbox appears below buffer inputs.
  2. Check the merge checkbox — confirm button reads "CREATE N CLIPS + MERGE BY PLAYER".
  3. Click CREATE — confirm clips appear as pending, then exporting, then saved. Confirm merged clips (e.g. `John Smith – All Clips`) appear in the Clips tab alongside the individuals.
  4. Uncheck the merge checkbox — confirm button reverts to "CREATE N CLIPS" and clips are created as pending only.
  5. With merge checked but no output folder set — confirm the checkbox is disabled and shows "Requires video + output folder".
