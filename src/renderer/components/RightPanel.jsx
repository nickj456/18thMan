import React, { useEffect, useCallback } from 'react'
import StatButtons from './StatButtons'
import PlayerNotes from './PlayerNotes'
import EventsTab from './EventsTab'
import StatsTab from './StatsTab'
import ClipsTab from './ClipsTab'
import { generateParentEmail } from '../utils/export'
import ScoutTab from './ScoutTab'
import ClipBuilder from './ClipBuilder'

const TABS = ['EVENTS', 'STATS', 'CLIPS', 'BUILDER', 'SCOUT']

const STAT_KEYS = {
  t: { key: 'try',          label: 'Try',          color: 'var(--green)' },
  a: { key: 'tackle',       label: 'Tackle',        color: 'var(--blue)' },
  m: { key: 'missed_tackle',label: 'Missed tackle', color: 'var(--red)' },
  c: { key: 'carry',        label: 'Carry',         color: 'var(--amber)' },
  l: { key: 'line_break',   label: 'Line break',    color: 'var(--purple)' },
  s: { key: 'support',      label: 'Support',       color: 'var(--teal)' },
  o: { key: 'offload',      label: 'Offload',       color: 'var(--teal)' },
  k: { key: 'kick',         label: 'Kick',          color: 'var(--dark-red)' },
  p: { key: 'penalty_won',  label: 'Penalty won',   color: 'var(--green)' },
  n: { key: 'penalty_con',  label: 'Penalty con',   color: 'var(--orange)' },
  e: { key: 'error',        label: 'Error',         color: 'var(--red)' },
  i: { key: 'intercept',    label: 'Intercept',     color: 'var(--purple)' },
}

export default function RightPanel({
  selectedPlayer, addEvent, events, deleteEvent, players, videoRef,
  clips, addClip, updateClipStatus, deleteClip, reorderClips,
  outputFolder, setOutputFolder, showNotification, videoFile,
  activeTab, setActiveTab, updatePlayer,
  trackOpposition, setTrackOpposition,
  sharedReports, setSharedReports, squadReviews, setSquadReviews, matchInfo,
  onUndoDelete, canUndoDelete, authUser,
}) {
  const handleKeyDown = useCallback((ev) => {
    if (['INPUT', 'TEXTAREA'].includes(ev.target.tagName)) return
    const stat = STAT_KEYS[ev.key.toLowerCase()]
    if (!stat) return
    addEvent(stat.key, stat.label, stat.color)
  }, [addEvent])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const seekTo = (time) => {
    if (videoRef.current) videoRef.current.currentTime = Math.max(0, time)
  }

  const handleEmailParent = useCallback(async (player) => {
    if (!player.parentEmail) return
    const { subject, html, text } = generateParentEmail({ player, events, matchInfo, sharedReports, squadReviews })
    const result = await window.electron?.sendEmail({ to: player.parentEmail, subject, html, text })
    if (result?.success) {
      showNotification(`Email sent to ${player.parentEmail}`)
    } else {
      showNotification(result?.error || 'Email failed — check ⚙ Settings', 'error')
    }
  }, [events, matchInfo, sharedReports, showNotification])

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
      <StatButtons selectedPlayer={selectedPlayer} addEvent={addEvent} />

      {/* Player notes — shown when a player is selected */}
      {selectedPlayer && (
        <PlayerNotes
          player={selectedPlayer}
          updatePlayer={updatePlayer}
          onEmailParent={handleEmailParent}
        />
      )}

      {/* Tab bar */}
      <div style={{
        display: 'flex', borderBottom: '1px solid var(--border)',
        background: 'var(--panel)', flexShrink: 0,
      }}>
        {TABS.map((tab) => {
          const active = activeTab === tab.toLowerCase()
          return (
            <button key={tab} onClick={() => setActiveTab(tab.toLowerCase())} style={{
              flex: 1, padding: '9px 0',
              background: active ? 'var(--bg)' : 'transparent',
              color: active ? 'var(--brand)' : 'var(--muted)',
              borderBottom: `2px solid ${active ? 'var(--brand)' : 'transparent'}`,
              border: 'none', borderTop: 'none', borderLeft: 'none',
              borderRight: '1px solid var(--border)',
              cursor: 'pointer',
              fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800,
              letterSpacing: 1.2, textTransform: 'uppercase',
            }}>
              {tab}
            </button>
          )
        })}
      </div>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 'events' && (
          <EventsTab
            events={events} deleteEvent={deleteEvent} seekTo={seekTo}
            videoDuration={videoRef.current?.duration}
            addClip={addClip} showNotification={showNotification}
            onUndo={onUndoDelete} canUndo={canUndoDelete}
          />
        )}
        {activeTab === 'stats' && (
          <StatsTab
            events={events}
            players={players}
            trackOpposition={trackOpposition}
            setTrackOpposition={setTrackOpposition}
          />
        )}
        {activeTab === 'scout' && (
          <ScoutTab
            events={events}
            players={players}
            matchInfo={matchInfo}
            sharedReports={sharedReports}
            setSharedReports={setSharedReports}
            squadReviews={squadReviews}
            setSquadReviews={setSquadReviews}
            showNotification={showNotification}
            authUser={authUser}
            videoFile={videoFile}
          />
        )}
        {activeTab === 'clips' && (
          <ClipsTab
            clips={clips}
            addClip={addClip}
            updateClipStatus={updateClipStatus}
            deleteClip={deleteClip}
            reorderClips={reorderClips}
            outputFolder={outputFolder}
            setOutputFolder={setOutputFolder}
            showNotification={showNotification}
            videoFile={videoFile}
            videoRef={videoRef}
          />
        )}
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
      </div>
    </div>
  )
}
