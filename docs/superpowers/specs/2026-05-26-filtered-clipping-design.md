# Filtered Clipping — Design Spec

**Date:** 2026-05-26  
**Status:** Approved

## Overview

Two new features that let coaches clip events for a specific player or event type, rather than always clipping every event at once.

1. **Events Tab Quick Filters** — dropdowns to narrow the existing "CREATE N CLIPS" action
2. **Clip Builder Tab** — a dedicated tab with multi-select criteria and an individual-event preview before creating clips

No changes to the ffmpeg export pipeline, clip data structure, or Clips tab.

---

## Feature 1: Events Tab Quick Filters

### What changes

Two dropdowns added above the buffer controls in `EventsTab.jsx`:

- **Player** — options: "All Players" + one entry per player who has at least one event logged (derived from the `events` prop)
- **Event Type** — options: "All Event Types" + one entry per distinct `statKey` present in logged events (e.g. "Missed Tackle", "Try", "Tackle"), displayed using `statLabel`

Both default to "All". Selecting a value filters the event list shown in the tab and recalculates the clip count on the button (e.g. "CREATE 4 CLIPS").

### Behaviour

- Filters are combined (AND): selecting a player AND an event type shows only events matching both.
- Filtered event list is what gets passed to the existing `onCreateClips` handler — no change to that function's signature or logic.
- Filter state lives in `EventsTab.jsx` local state (`useState`). No global state changes.
- Dropdowns repopulate whenever the `events` prop changes (derived with `useMemo`).

### Files affected

- `src/renderer/components/EventsTab.jsx` — add two `useState` for filter values, derive filtered events with `useMemo`, render two `<select>` elements above existing controls.

---

## Feature 2: Clip Builder Tab

### Where it lives

A new tab added to the sidebar tab bar alongside Events, Clips, Players. Tab label: "Clip Builder". Rendered by a new component `ClipBuilder.jsx`.

### Layout

Two columns side by side:

**Left column — Criteria**

- **Players** section
  - "Select All / None" toggle link
  - One checkbox per player in the `players` prop (all players, not just those with events — allows forward selection)
  - Players with no logged events are shown but their checkbox produces 0 matches

- **Event Types** section (below Players)
  - "Select All / None" toggle link
  - One checkbox per distinct `statKey` across all 12 stat types defined in the app
  - Types with no logged events are greyed out (disabled)

- **Buffer** inputs
  - "Before (s)" number input, default 5
  - "After (s)" number input, default 8
  - Independent from the Events tab buffer values

**Right column — Matching Events Preview**

- Header: "X events matched, Y selected"
- Scrollable list of events matching the current criteria (intersection of selected players × selected event types)
- Each row shows: player name, event type label, timestamp (MM:SS), half
- Each row has a checkbox — checked by default, user can uncheck to exclude individual events
- When criteria change, the list regenerates and all rows reset to checked
- "CREATE Y CLIPS" button pinned to the bottom of this column, disabled when Y = 0

### Behaviour

- All player checkboxes and all event type checkboxes are selected by default when the tab is first opened.
- Matching is the intersection: event must match a selected player AND a selected event type.
- Clicking "CREATE Y CLIPS" calls the existing `onCreateClips` handler with the selected (checked) subset of matched events, using the Clip Builder's own buffer values.
- Resulting clips appear in the Clips tab exactly as clips created from the Events tab do.

### Files affected

- `src/renderer/components/ClipBuilder.jsx` — new component, all logic self-contained
- `src/renderer/App.jsx` — add "Clip Builder" tab entry to the tab bar, pass `players`, `events`, and `onCreateClips` as props to `ClipBuilder`

---

## Data flow

```
players prop  ──┐
events prop   ──┤──► ClipBuilder (criteria state) ──► filtered+selected events ──► onCreateClips()
                │                                                                        │
                └──► EventsTab (filter dropdowns) ──► filtered events ──────────────────┘
                                                                                         │
                                                                                    addClip() × N
                                                                                         │
                                                                                    clips[] in App.jsx
                                                                                         │
                                                                                    ClipsTab (unchanged)
```

---

## Out of scope

- Saving/reusing filter presets
- Filtering within the Clips tab itself
- Any changes to the ffmpeg export pipeline or clip data structure
