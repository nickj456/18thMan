import React, { useState, useCallback } from 'react'
import VideoPlayer from './VideoPlayer'
import ClipControls from './ClipControls'
import PlayerSelector from './PlayerSelector'

export default function LeftPanel({
  style,
  videoRef, videoFile, setVideoFile,
  players, setPlayers, updatePlayer, selectedPlayer, setSelectedPlayer, onPlayerCardClick,
  half, setHalf, clips, addClip, updateClipStatus, deleteClip,
  outputFolder, setOutputFolder, showNotification, events,
}) {
  const [videoHeight, setVideoHeight] = useState(320)
  const [dragging, setDragging] = useState(false)

  const onVideoResizeMouseDown = useCallback((e) => {
    e.preventDefault()
    setDragging(true)
    const startY = e.clientY
    const startH = videoHeight
    const onMove = (ev) => {
      setVideoHeight(Math.max(180, Math.min(startH + (ev.clientY - startY), 560)))
    }
    const onUp = () => {
      setDragging(false)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [videoHeight])

  return (
    <div style={{
      ...style,
      display: 'flex',
      flexDirection: 'column',
      borderRight: '1px solid var(--border)',
      overflow: 'hidden',
      cursor: dragging ? 'row-resize' : 'default',
    }}>
      <VideoPlayer
        videoRef={videoRef}
        videoFile={videoFile}
        setVideoFile={setVideoFile}
        half={half}
        setHalf={setHalf}
        clips={clips}
        events={events}
        videoHeight={videoHeight}
      />

      {/* Vertical resize handle */}
      <div
        className={`resize-handle-v${dragging ? ' active' : ''}`}
        onMouseDown={onVideoResizeMouseDown}
      />

      <ClipControls
        videoRef={videoRef}
        videoFile={videoFile}
        clips={clips}
        addClip={addClip}
        updateClipStatus={updateClipStatus}
        deleteClip={deleteClip}
        outputFolder={outputFolder}
        setOutputFolder={setOutputFolder}
        showNotification={showNotification}
      />
      <PlayerSelector
        players={players}
        setPlayers={setPlayers}
        updatePlayer={updatePlayer}
        selectedPlayer={selectedPlayer}
        setSelectedPlayer={setSelectedPlayer}
        onPlayerCardClick={onPlayerCardClick}
      />
    </div>
  )
}
