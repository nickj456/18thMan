# Filtered Clipping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let coaches filter events by player and/or event type before creating clips, via quick dropdowns in the Events tab and a dedicated Clip Builder tab.

**Architecture:** Events tab gains two filter `<select>` dropdowns (local state, no global changes) that narrow the visible event list and clip count. A new `ClipBuilder.jsx` component provides multi-select checkboxes for players and stat types, a live preview list with per-event toggles, and its own buffer settings. `RightPanel.jsx` adds a fifth "BUILDER" tab that renders `ClipBuilder`.

**Tech Stack:** React 18, `useState`, `useMemo` — no new dependencies.

---

## File Map

| Action | File | What changes |
|--------|------|--------------|
| Modify | `src/renderer/components/EventsTab.jsx` | Add filter state + `useMemo`, render 2 `<select>` dropdowns, filter table and clip count |
| Create | `src/renderer/components/ClipBuilder.jsx` | New component — full Clip Builder UI |
| Modify | `src/renderer/components/RightPanel.jsx` | Add `'BUILDER'` tab, import + render `ClipBuilder` with props |

---

## Task 1: Events Tab Quick Filters

**Files:**
- Modify: `src/renderer/components/EventsTab.jsx`

- [ ] **Step 1: Add filter state and derived data**

  Replace the top of the component (lines 1–8) with:

  ```jsx
  import React, { useState, useMemo } from 'react'
  import { fmtTime as fmt } from '../utils/format'

  export default function EventsTab({ events, deleteEvent, seekTo, videoDuration, addClip, showNotification, onUndo, canUndo }) {
    const [autoClipOpen, setAutoClipOpen] = useState(false)
    const [bufferBefore, setBufferBefore] = useState(5)
    const [bufferAfter, setBufferAfter]   = useState(8)
    const [filterPlayer, setFilterPlayer] = useState('all')
    const [filterStat, setFilterStat]     = useState('all')

    const playerOptions = useMemo(() => {
      const seen = new Map()
      events.forEach(ev => { if (!seen.has(ev.playerId)) seen.set(ev.playerId, ev.playerName) })
      return [...seen.entries()].map(([id, name]) => ({ id, name }))
    }, [events])

    const statOptions = useMemo(() => {
      const seen = new Map()
      events.forEach(ev => { if (!seen.has(ev.statKey)) seen.set(ev.statKey, ev.statLabel) })
      return [...seen.entries()].map(([key, label]) => ({ key, label }))
    }, [events])

    const filteredEvents = useMemo(() => events.filter(ev => {
      if (filterPlayer !== 'all' && ev.playerId !== filterPlayer) return false
      if (filterStat   !== 'all' && ev.statKey   !== filterStat)   return false
      return true
    }), [events, filterPlayer, filterStat])
  ```

- [ ] **Step 2: Update `handleAutoClip` to use `filteredEvents`**

  Replace the existing `handleAutoClip` function (lines 9–22) with:

  ```jsx
    const handleAutoClip = () => {
      if (!filteredEvents.length) { showNotification?.('No events to clip', 'error'); return }
      let count = 0
      filteredEvents.forEach(ev => {
        const inPoint  = Math.max(0, ev.timestamp - bufferBefore)
        const outPoint = videoDuration ? Math.min(videoDuration, ev.timestamp + bufferAfter) : ev.timestamp + bufferAfter
        if (outPoint > inPoint) {
          addClip?.({ inPoint, outPoint, label: `${ev.statLabel} – ${ev.playerName}` })
          count++
        }
      })
      setAutoClipOpen(false)
      showNotification?.(`${count} clips created — go to Clips tab to export`)
    }
  ```

- [ ] **Step 3: Add filter bar row above the auto-clip toolbar**

  In the `return` block, before the existing auto-clip toolbar `<div>` (the one that starts with `padding: '6px 8px'`), insert:

  ```jsx
      {/* Filter bar */}
      <div style={{ padding: '5px 8px', borderBottom: '1px solid var(--border)', background: 'var(--panel)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 800, color: 'var(--muted)', letterSpacing: 1.2 }}>FILTER</span>
        <select
          value={filterPlayer}
          onChange={e => setFilterPlayer(e.target.value)}
          style={{ fontFamily: 'var(--font-ui)', fontSize: 10, background: 'var(--panel)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 2, padding: '2px 4px', cursor: 'pointer' }}
        >
          <option value="all">All Players</option>
          {playerOptions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select
          value={filterStat}
          onChange={e => setFilterStat(e.target.value)}
          style={{ fontFamily: 'var(--font-ui)', fontSize: 10, background: 'var(--panel)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 2, padding: '2px 4px', cursor: 'pointer' }}
        >
          <option value="all">All Event Types</option>
          {statOptions.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        {(filterPlayer !== 'all' || filterStat !== 'all') && (
          <button
            onClick={() => { setFilterPlayer('all'); setFilterStat('all') }}
            style={{ fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 700, background: 'transparent', border: '1px solid var(--border)', borderRadius: 2, padding: '2px 8px', cursor: 'pointer', color: 'var(--muted)' }}
          >
            CLEAR
          </button>
        )}
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', marginLeft: 'auto' }}>
          {filteredEvents.length} / {events.length}
        </span>
      </div>
  ```

- [ ] **Step 4: Update clip count and table to use `filteredEvents`**

  a) In the CREATE CLIPS button (currently line 52), change `events.length` to `filteredEvents.length`:
  ```jsx
              CREATE {filteredEvents.length} CLIPS
  ```

  b) In the empty state check (currently `events.length === 0`), change to:
  ```jsx
          {filteredEvents.length === 0 ? (
            <Empty>
              {events.length === 0
                ? 'No events yet. Select a player, then click a stat button or press a shortcut key.'
                : 'No events match the current filter.'}
            </Empty>
          ) : (
  ```

  c) In the table body, change `events.map` to `filteredEvents.map`:
  ```jsx
              {filteredEvents.map((ev) => (
  ```

- [ ] **Step 5: Commit**

  ```
  git add src/renderer/components/EventsTab.jsx
  git commit -m "feat: add player and event-type filter dropdowns to Events tab"
  ```

---

## Task 2: Clip Builder Component

**Files:**
- Create: `src/renderer/components/ClipBuilder.jsx`

- [ ] **Step 1: Create the file with state and logic**

  Create `src/renderer/components/ClipBuilder.jsx`:

  ```jsx
  import React, { useState, useMemo } from 'react'
  import { fmtTime as fmt } from '../utils/format'

  const ALL_STAT_TYPES = [
    { key: 'try',           label: 'Try',          color: 'var(--green)' },
    { key: 'tackle',        label: 'Tackle',        color: 'var(--blue)' },
    { key: 'missed_tackle', label: 'Missed tackle', color: 'var(--red)' },
    { key: 'carry',         label: 'Carry',         color: 'var(--amber)' },
    { key: 'line_break',    label: 'Line break',    color: 'var(--purple)' },
    { key: 'support',       label: 'Support',       color: 'var(--teal)' },
    { key: 'offload',       label: 'Offload',       color: 'var(--teal)' },
    { key: 'kick',          label: 'Kick',          color: 'var(--dark-red)' },
    { key: 'penalty_won',   label: 'Penalty won',   color: 'var(--green)' },
    { key: 'penalty_con',   label: 'Penalty con',   color: 'var(--orange)' },
    { key: 'error',         label: 'Error',         color: 'var(--red)' },
    { key: 'intercept',     label: 'Intercept',     color: 'var(--purple)' },
  ]

  export default function ClipBuilder({ players, events, addClip, videoDuration, showNotification }) {
    const [selectedPlayerIds, setSelectedPlayerIds] = useState(() => new Set(players.map(p => p.id)))
    const [selectedStatKeys, setSelectedStatKeys]   = useState(() => new Set(ALL_STAT_TYPES.map(s => s.key)))
    const [bufferBefore, setBufferBefore]           = useState(5)
    const [bufferAfter, setBufferAfter]             = useState(8)
    const [uncheckedEventIds, setUncheckedEventIds] = useState(() => new Set())

    const usedStatKeys = useMemo(() => new Set(events.map(ev => ev.statKey)), [events])

    const matchedEvents = useMemo(() => events.filter(ev =>
      selectedPlayerIds.has(ev.playerId) && selectedStatKeys.has(ev.statKey)
    ), [events, selectedPlayerIds, selectedStatKeys])

    const selectedEvents = matchedEvents.filter(ev => !uncheckedEventIds.has(ev.id))

    const togglePlayer = (id) => {
      setSelectedPlayerIds(prev => {
        const next = new Set(prev)
        next.has(id) ? next.delete(id) : next.add(id)
        return next
      })
      setUncheckedEventIds(new Set())
    }

    const allPlayersSelected = players.length > 0 && players.every(p => selectedPlayerIds.has(p.id))
    const toggleAllPlayers = () => {
      setSelectedPlayerIds(allPlayersSelected ? new Set() : new Set(players.map(p => p.id)))
      setUncheckedEventIds(new Set())
    }

    const toggleStat = (key) => {
      setSelectedStatKeys(prev => {
        const next = new Set(prev)
        next.has(key) ? next.delete(key) : next.add(key)
        return next
      })
      setUncheckedEventIds(new Set())
    }

    const allStatsSelected = ALL_STAT_TYPES.every(s => selectedStatKeys.has(s.key))
    const toggleAllStats = () => {
      setSelectedStatKeys(allStatsSelected ? new Set() : new Set(ALL_STAT_TYPES.map(s => s.key)))
      setUncheckedEventIds(new Set())
    }

    const toggleEventCheck = (id) => {
      setUncheckedEventIds(prev => {
        const next = new Set(prev)
        next.has(id) ? next.delete(id) : next.add(id)
        return next
      })
    }

    const handleCreateClips = () => {
      if (!selectedEvents.length) return
      let count = 0
      selectedEvents.forEach(ev => {
        const inPoint  = Math.max(0, ev.timestamp - bufferBefore)
        const outPoint = videoDuration ? Math.min(videoDuration, ev.timestamp + bufferAfter) : ev.timestamp + bufferAfter
        if (outPoint > inPoint) {
          addClip({ inPoint, outPoint, label: `${ev.statLabel} – ${ev.playerName}` })
          count++
        }
      })
      showNotification?.(`${count} clips created — go to Clips tab to export`)
    }
  ```

- [ ] **Step 2: Add the render — left column (criteria)**

  Continue the file, adding the return block:

  ```jsx
    return (
      <div style={{ height: '100%', display: 'flex', overflow: 'hidden' }}>

        {/* ── Left column: criteria ─────────────────────────────────── */}
        <div style={{ width: 195, flexShrink: 0, borderRight: '1px solid var(--border)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

          {/* Buffer inputs */}
          <div style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 800, color: 'var(--muted)', letterSpacing: 1.2, marginBottom: 6 }}>BUFFER (SECONDS)</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}>Before</span>
              <input type="number" value={bufferBefore} min={1} max={30} onChange={e => setBufferBefore(Number(e.target.value))}
                style={{ width: 40, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 11 }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}>After</span>
              <input type="number" value={bufferAfter} min={1} max={30} onChange={e => setBufferAfter(Number(e.target.value))}
                style={{ width: 40, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 11 }} />
            </div>
          </div>

          {/* Players */}
          <div style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 800, color: 'var(--muted)', letterSpacing: 1.2 }}>PLAYERS</span>
              <button onClick={toggleAllPlayers} style={{ fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 700, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                {allPlayersSelected ? 'None' : 'All'}
              </button>
            </div>
            {players.filter(p => !p.isOpposition).map(p => (
              <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, cursor: 'pointer' }}>
                <input type="checkbox" checked={selectedPlayerIds.has(p.id)} onChange={() => togglePlayer(p.id)} />
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11 }}>
                  <span style={{ fontWeight: 800, fontStyle: 'italic', color: 'var(--brand)', marginRight: 4 }}>#{p.number}</span>
                  {p.name}
                </span>
              </label>
            ))}
          </div>

          {/* Event Types */}
          <div style={{ padding: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 800, color: 'var(--muted)', letterSpacing: 1.2 }}>EVENT TYPES</span>
              <button onClick={toggleAllStats} style={{ fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 700, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                {allStatsSelected ? 'None' : 'All'}
              </button>
            </div>
            {ALL_STAT_TYPES.map(s => {
              const hasEvents = usedStatKeys.has(s.key)
              return (
                <label key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, cursor: hasEvents ? 'pointer' : 'default', opacity: hasEvents ? 1 : 0.4 }}>
                  <input type="checkbox" checked={selectedStatKeys.has(s.key)} disabled={!hasEvents} onChange={() => hasEvents && toggleStat(s.key)} />
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: s.color, fontWeight: 700 }}>{s.label}</span>
                </label>
              )
            })}
          </div>
        </div>
  ```

- [ ] **Step 3: Add the render — right column (preview + create button) and close component**

  Continue the return block:

  ```jsx
        {/* ── Right column: preview ─────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Header */}
          <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--border)', background: 'var(--panel)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>
              {matchedEvents.length} matched,&nbsp;
              <span style={{ color: 'var(--text)', fontWeight: 700 }}>{selectedEvents.length} selected</span>
            </span>
          </div>

          {/* Event list */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {matchedEvents.length === 0 ? (
              <div style={{ color: 'var(--muted)', fontFamily: 'var(--font-body)', fontSize: 12, textAlign: 'center', padding: '40px 24px', lineHeight: 1.8 }}>
                {events.length === 0 ? 'No events logged yet.' : 'No events match the selected criteria.'}
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--panel)', zIndex: 1 }}>
                    {['', 'TIME', 'H', 'PLAYER', 'STAT'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '5px 8px', fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 800, color: 'var(--muted)', letterSpacing: 1.2 }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matchedEvents.map(ev => {
                    const checked = !uncheckedEventIds.has(ev.id)
                    return (
                      <tr key={ev.id} style={{ borderBottom: '1px solid var(--border)', opacity: checked ? 1 : 0.4 }}>
                        <td style={{ padding: '4px 8px' }}>
                          <input type="checkbox" checked={checked} onChange={() => toggleEventCheck(ev.id)} />
                        </td>
                        <td style={{ padding: '4px 8px', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--brand)' }}>
                          {fmt(ev.timestamp)}
                        </td>
                        <td style={{ padding: '4px 8px', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>
                          {ev.half}
                        </td>
                        <td style={{ padding: '4px 8px', whiteSpace: 'nowrap' }}>
                          <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 800, fontStyle: 'italic', color: 'var(--brand)', fontSize: 12 }}>#{ev.playerNumber}</span>
                          <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, marginLeft: 4 }}>{ev.playerName}</span>
                        </td>
                        <td style={{ padding: '4px 8px' }}>
                          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: ev.color, border: `1px solid ${ev.color}50`, padding: '2px 7px', borderRadius: 2, background: `${ev.color}14`, whiteSpace: 'nowrap' }}>
                            {ev.statLabel}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Create button */}
          <div style={{ padding: '8px 10px', borderTop: '1px solid var(--border)', background: 'var(--panel)', flexShrink: 0 }}>
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
          </div>
        </div>

      </div>
    )
  }
  ```

- [ ] **Step 4: Commit**

  ```
  git add src/renderer/components/ClipBuilder.jsx
  git commit -m "feat: add ClipBuilder component with multi-select player/stat filtering"
  ```

---

## Task 3: Wire Clip Builder into RightPanel

**Files:**
- Modify: `src/renderer/components/RightPanel.jsx`

- [ ] **Step 1: Add the import and tab entry**

  At the top of `RightPanel.jsx`, after the existing imports, add:
  ```jsx
  import ClipBuilder from './ClipBuilder'
  ```

  Change the `TABS` constant (line 10) from:
  ```jsx
  const TABS = ['EVENTS', 'STATS', 'CLIPS', 'SCOUT']
  ```
  to:
  ```jsx
  const TABS = ['EVENTS', 'STATS', 'CLIPS', 'BUILDER', 'SCOUT']
  ```

- [ ] **Step 2: Render the ClipBuilder tab**

  In the tab content area (inside `<div style={{ flex: 1, overflow: 'hidden' }}>`), after the `activeTab === 'clips'` block and before the closing `</div>`, add:

  ```jsx
          {activeTab === 'builder' && (
            <ClipBuilder
              players={players}
              events={events}
              addClip={addClip}
              videoDuration={videoRef.current?.duration}
              showNotification={showNotification}
            />
          )}
  ```

- [ ] **Step 3: Manual verification**

  Run the app with `npm run dev`. Then:

  1. Load a video and log at least 5 events across 2+ players and 2+ stat types.
  2. Open the **Events tab** — confirm the filter bar appears with Player and Event Type dropdowns.
  3. Select a player from the dropdown — confirm the table narrows to that player's events and the count updates (e.g. "CREATE 3 CLIPS").
  4. Select an event type — confirm both filters combine (AND logic).
  5. Click CLEAR — confirm all events are visible again.
  6. Open the auto-clip panel and click CREATE — confirm only the filtered events become clips.
  7. Click the **BUILDER** tab — confirm it appears in the tab bar and the component renders.
  8. Uncheck a player — confirm matched events update and the count decreases.
  9. Uncheck an individual event row — confirm it goes opaque and the "selected" count drops.
  10. Click CREATE X CLIPS — confirm the correct number of clips appear in the Clips tab.

- [ ] **Step 4: Commit**

  ```
  git add src/renderer/components/RightPanel.jsx
  git commit -m "feat: add Clip Builder tab to RightPanel"
  ```
