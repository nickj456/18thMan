import React, { useState, useEffect, useCallback, useRef } from 'react'
import Header from './components/Header'
import LeftPanel from './components/LeftPanel'
import RightPanel from './components/RightPanel'
import GameLibrary from './components/GameLibrary'
import PresentationMode from './components/PresentationMode'
import CarryMeterageModal from './components/CarryMeterageModal'
import FloatingStatPopup from './components/FloatingStatPopup'
import PlayerNotesModal from './components/PlayerNotesModal'
import { initSupabase } from './utils/supabase'
import { authClient, checkAuth, signOut, trialDaysLeft } from './utils/authClient'
import { STAT_CLASSIFICATION } from './utils/stats'
import { generateParentEmail } from './utils/export'
import LoginScreen from './components/LoginScreen'


const OPPOSITION_PLAYER = {
  id:'opp', number:'OPP', name:'Opposition',
  comments:'', coachScore:null, parentEmail:'', isOpposition:true,
}

function makeDefaultSquad() {
  return Array.from({ length: 13 }, (_, i) => ({
    id: i+1, number: i+1, name: `Player ${i+1}`,
    comments:'', coachScore:null, parentEmail:'', isOpposition:false,
  }))
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export default function App() {
  const [videoFile, setVideoFile]           = useState(null)
  const [players, setPlayers]               = useState(makeDefaultSquad)
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [events, setEvents]                 = useState([])
  const [clips, setClips]                   = useState([])
  const [outputFolder, setOutputFolder]     = useState(null)
  const [half, setHalf]                     = useState(1)
  const [activeTab, setActiveTab]           = useState('events')
  const [notification, setNotification]     = useState(null)
  const [trackOpposition, setTrackOpposition] = useState(false)
  const [matchInfo, setMatchInfo]           = useState({ club:'', opposition:'', date:'', ourScore:'', oppScore:'' })

  // Auth
  const [authState, setAuthState]   = useState('checking') // 'checking' | 'logged-out' | 'no-subscription' | 'authenticated'
  const [authUser, setAuthUser]     = useState(null)
  const [authProfile, setAuthProfile] = useState(null)
  const [isTrial, setIsTrial]       = useState(false)

  // Undo stack for event deletion
  const [undoStack, setUndoStack]   = useState([])

  // Session management
  const [currentSessionId, setCurrentSessionId]     = useState(null)
  const [sessionName, setSessionName]               = useState(null)
  const [showLibrary, setShowLibrary]               = useState(true)
  const [crashRecoverySession, setCrashRecoverySession] = useState(null)
  const [isDirty, setIsDirty]                       = useState(false)
  const [notesPlayer, setNotesPlayer]               = useState(null)
  const loadingRef = useRef(false)

  // Presentation mode
  const [isPresenting, setIsPresenting] = useState(false)

  // Carry meterage prompt
  const [pendingCarry, setPendingCarry] = useState(null)

  // Floating stat popup
  const [statPopupAnchor, setStatPopupAnchor] = useState(null)

  // Coach collaboration — individual player reports
  const [sharedReports, setSharedReports]       = useState([])
  // Coach collaboration — whole-squad reviews
  const [squadReviews, setSquadReviews]         = useState([])
  const [newResponseAlert, setNewResponseAlert] = useState(null)

  // Auto-update
  const [updateVersion, setUpdateVersion] = useState(null)
  const [updateReady, setUpdateReady]     = useState(false)

  // Horizontal resize
  const [leftPx, setLeftPx]   = useState(null)
  const [draggingH, setDraggingH] = useState(false)
  const containerRef = useRef(null)
  const videoRef     = useRef(null)
  const saveTimerRef = useRef(null)

  const effectivePlayers = trackOpposition ? [...players, OPPOSITION_PLAYER] : players

  // ── Peer score aggregation ─────────────────────────────────────────────────
  // Re-run whenever reviews update OR the player roster changes (session load,
  // player added/removed). Keyed on player IDs so adding a player re-triggers.
  const playerRosterKey = players.filter(p => !p.isOpposition).map(p => p.id).join(',')
  useEffect(() => {
    if (!squadReviews.length) return
    setPlayers(prev => prev.map(player => {
      const peerScores = []
      squadReviews.forEach(review => {
        ;(review.responses || []).forEach(resp => {
          const rating = resp.ratings?.[player.number]
          if (rating?.score) peerScores.push({ responder: resp.responder, score: Number(rating.score) })
        })
      })
      return { ...player, peerScores }
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [squadReviews, playerRosterKey])

  // ── Auth check on startup ─────────────────────────────────────────────────
  useEffect(() => {
    checkAuth().then(result => {
      if (result.state === 'authenticated') {
        setAuthUser(result.user)
        setAuthProfile(result.profile)
        setIsTrial(!!result.trial)
        setAuthState('authenticated')
      } else if (result.state === 'no-subscription') {
        setAuthUser(result.user)
        setAuthProfile(result.profile)
        setAuthState('no-subscription')
      } else {
        setAuthState('logged-out')
      }
    })
  }, [])

  const handleAuthSuccess = ({ user, profile, trial }) => {
    setAuthUser(user)
    setAuthProfile(profile)
    setIsTrial(!!trial)
    setAuthState('authenticated')
  }

  const handleSignOut = async () => {
    await signOut()
    setAuthState('logged-out')
    setAuthUser(null)
    setAuthProfile(null)
  }

  // ── Supabase + real-time ──────────────────────────────────────────────────
  // Email Supabase (user-configured) — initialised for sending match emails only.
  useEffect(() => {
    window.electron?.loadEmailSettings().then((s) => {
      if (s?.supabaseUrl && s?.supabaseAnonKey) initSupabase(s.supabaseUrl, s.supabaseAnonKey)
    })
  }, [])

  // Platform Supabase (authClient) — squad reviews and coach responses always live here.
  useEffect(() => {
    // Squad reviews are always loaded — coaching feedback is valuable across sessions.
    authClient
      .from('squad_reviews')
      .select('*, squad_review_responses(*)')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data: reviews }) => {
        if (reviews) setSquadReviews(reviews.map(r => ({ ...r, responses: r.squad_review_responses || [] })))
      })

    // Real-time: individual player responses
    const coachResponsesCh = authClient.channel('coach_responses_live')
    coachResponsesCh
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'coach_responses' }, (payload) => {
        const resp = payload.new
        setSharedReports(prev => prev.map(r =>
          r.id === resp.report_id ? { ...r, responses: [...(r.responses||[]), resp] } : r
        ))
        setNewResponseAlert(resp.responder)
        setTimeout(() => setNewResponseAlert(null), 5000)
      })
      .subscribe()

    // Real-time: squad review responses
    const squadReviewsCh = authClient.channel('squad_review_responses_live')
    squadReviewsCh
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'squad_review_responses' }, (payload) => {
        const resp = payload.new
        setSquadReviews(prev => prev.map(r =>
          r.id === resp.review_id ? { ...r, responses: [...(r.responses||[]), resp] } : r
        ))
        setNewResponseAlert(resp.responder + ' completed squad review')
        setTimeout(() => setNewResponseAlert(null), 6000)
      })
      .subscribe()

    return () => {
      authClient.removeChannel(coachResponsesCh)
      authClient.removeChannel(squadReviewsCh)
    }
  }, [])

  // ── Load crash-recovery session on startup ────────────────────────────────
  useEffect(() => {
    window.electron?.loadSession().then(session => {
      if (session && (session.events?.length > 0 || session.clips?.length > 0 ||
          session.players?.some(p => !p.isOpposition && p.name !== `Player ${p.number}`))) {
        setCrashRecoverySession(session)
      }
    })
  }, [])

  // ── Notifications ─────────────────────────────────────────────────────────
  const showNotification = useCallback((msg, type='success') => {
    setNotification({ msg, type })
    setTimeout(() => setNotification(null), 3500)
  }, [])

  // ── Session helpers — declared before any callback that references them ────
  const buildSessionData = useCallback(() => ({
    videoFile, players, events, clips, outputFolder, half, trackOpposition, matchInfo,
    reportIds: sharedReports.map(r => r.id),
    reviewIds: squadReviews.map(r => r.id),
  }), [videoFile, players, events, clips, outputFolder, half, trackOpposition, matchInfo, sharedReports, squadReviews])

  const applySession = useCallback(async (data) => {
    if (!data) return
    loadingRef.current = true

    // Video path check — prompt to locate if missing
    let vf = data.videoFile
    if (vf?.path) {
      const exists = await window.electron?.fileExists(vf.path)
      if (!exists) {
        showNotification('Video not found — please locate the file', 'error')
        const newPath = await window.electron?.openFile()
        if (newPath) vf = { path: newPath, url: `file:///${newPath.replace(/\\/g, '/')}` }
        else vf = null
      }
    }

    setVideoFile(vf || null)
    setPlayers(data.players?.map(p => ({ comments:'', coachScore:null, parentEmail:'', isOpposition:false, ...p })) || makeDefaultSquad())
    setEvents(data.events || [])
    setClips(data.clips || [])
    setOutputFolder(data.outputFolder || null)
    setHalf(data.half || 1)
    setTrackOpposition(data.trackOpposition || false)
    setMatchInfo({ club:'', opposition:'', date:'', ourScore:'', oppScore:'', ...(data.matchInfo || {}) })

    // Load only the scout reports that belong to this saved session
    const reportIds = data.reportIds || []
    const reviewIds = data.reviewIds || []

    if (reportIds.length > 0) {
      const { data: reports } = await authClient
        .from('shared_player_reports')
        .select('*, coach_responses(*)')
        .in('id', reportIds)
      setSharedReports(reports?.map(r => ({ ...r, responses: r.coach_responses || [] })) || [])
    } else {
      setSharedReports([])
    }

    // Squad reviews are always loaded at startup — no session scoping needed here.
    // Allow one render cycle before re-enabling dirty tracking
    setTimeout(() => { loadingRef.current = false; setIsDirty(false) }, 0)
  }, [showNotification])

  // Declared after applySession so the deps array can reference it safely
  const handleContinueLastSession = useCallback(async () => {
    if (!crashRecoverySession) return
    await applySession(crashRecoverySession)
    setShowLibrary(false)
  }, [crashRecoverySession, applySession])

  // ── Auto-save crash recovery ──────────────────────────────────────────────
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      window.electron?.saveSession({
        videoFile, players, events, clips, outputFolder, half, trackOpposition, matchInfo,
        reportIds: sharedReports.map(r => r.id),
        reviewIds: squadReviews.map(r => r.id),
      })
    }, 500)
    return () => clearTimeout(saveTimerRef.current)
  }, [videoFile, players, events, clips, outputFolder, half, trackOpposition, matchInfo, sharedReports, squadReviews])

  useEffect(() => {
    window.electron?.onUpdateAvailable?.(({ version }) => setUpdateVersion(version))
    window.electron?.onUpdateReady?.(() => setUpdateReady(true))
    return () => {
      window.electron?.removeUpdateListeners?.()
    }
  }, [])

  // Mark dirty whenever meaningful state changes, but not during session loads
  useEffect(() => {
    if (loadingRef.current) return
    setIsDirty(true)
  }, [events, clips, matchInfo])

  const handleLoadSession = useCallback(async (id) => {
    const data = await window.electron?.loadNamedSession(id)
    if (!data) { showNotification('Could not load session', 'error'); return }
    await applySession(data)
    const sessions = await window.electron?.listSessions()
    const meta = sessions?.find(s => s.id === id)
    setCurrentSessionId(id)
    setSessionName(meta?.name || null)
    setShowLibrary(false)
    showNotification(`Loaded: ${meta?.name || 'session'}`)
  }, [applySession, showNotification])

  const handleSaveSession = useCallback(async () => {
    const id   = currentSessionId || genId()
    const data = buildSessionData()
    const opp  = data.matchInfo?.opposition
    const date = data.matchInfo?.date
    const name = sessionName ||
      (opp ? `vs ${opp}${date ? ' · ' + date : ''}` : `Match · ${new Date().toLocaleDateString('en-GB')}`)
    await window.electron?.saveNamedSession({ id, name, data })
    setCurrentSessionId(id)
    setSessionName(name)
    setIsDirty(false)
    showNotification(`Saved: ${name}`)
  }, [currentSessionId, sessionName, buildSessionData, showNotification])

  const handleNewSession = useCallback(() => {
    setVideoFile(null)
    // Keep player roster (names, numbers, emails) but clear match-specific scores/notes
    setPlayers(prev => {
      const hasCustomRoster = prev.some(p => !p.isOpposition && p.name !== `Player ${p.number}`)
      if (hasCustomRoster) {
        return prev
          .filter(p => !p.isOpposition)
          .map(p => ({ ...p, coachScore: null, comments: '' }))
      }
      return makeDefaultSquad()
    })
    setEvents([]); setClips([])
    setOutputFolder(null); setHalf(1); setTrackOpposition(false)
    setMatchInfo({ club:'', opposition:'', date:'', ourScore:'', oppScore:'' })
    setCurrentSessionId(null); setSessionName(null)
    setUndoStack([])
    setCrashRecoverySession(null)
    // Individual reports are game-specific — clear for a new session
    // Squad reviews stay visible across sessions (coaching feedback is persistent)
    setSharedReports([])
    setShowLibrary(false)
    window.electron?.clearSession()
  }, [])

  // ── Event capture ─────────────────────────────────────────────────────────
  const addEvent = useCallback((statKey, statLabel, color) => {
    if (!selectedPlayer) return false
    const base = {
      id: Date.now(),
      timestamp: videoRef.current?.currentTime ?? 0,
      half, playerId: selectedPlayer.id,
      playerName: selectedPlayer.name, playerNumber: selectedPlayer.number,
      statKey, statLabel, color, meterage: null,
    }
    if (statKey === 'carry') { setPendingCarry(base); return true }
    setEvents(prev => [...prev, base].sort((a,b) => a.timestamp - b.timestamp))
    return true
  }, [selectedPlayer, half])

  const confirmCarry = useCallback((meterage) => {
    if (!pendingCarry) return
    setEvents(prev => [...prev, { ...pendingCarry, meterage: meterage ?? null }].sort((a,b) => a.timestamp - b.timestamp))
    setPendingCarry(null)
  }, [pendingCarry])

  const deleteEvent = useCallback((id) => {
    setEvents(prev => {
      const ev = prev.find(e => e.id === id)
      if (ev) setUndoStack(u => [...u.slice(-9), ev])
      return prev.filter(e => e.id !== id)
    })
  }, [])

  const undoDeleteEvent = useCallback(() => {
    setUndoStack(prev => {
      if (prev.length === 0) return prev
      const ev = prev[prev.length - 1]
      setEvents(e => [...e, ev].sort((a, b) => a.timestamp - b.timestamp))
      return prev.slice(0, -1)
    })
  }, [])

  // ── Player management ─────────────────────────────────────────────────────
  const updatePlayer = useCallback((playerId, updates) => {
    setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, ...updates } : p))
    setSelectedPlayer(prev => prev?.id === playerId ? { ...prev, ...updates } : prev)
    if (updates.name !== undefined || updates.number !== undefined) {
      setEvents(prev => prev.map(e => {
        if (e.playerId !== playerId) return e
        return {
          ...e,
          playerName:   updates.name   !== undefined ? updates.name   : e.playerName,
          playerNumber: updates.number !== undefined ? updates.number : e.playerNumber,
        }
      }))
    }
  }, [])

  // ── Clip management ───────────────────────────────────────────────────────
  const addClip = useCallback((clip) => setClips(p => [...p, { ...clip, id: clip.id ?? Date.now(), status: clip.status ?? 'pending' }]), [])
  const updateClipStatus = useCallback((id, status, outputFile) =>
    setClips(p => p.map(c => c.id === id ? { ...c, status, outputFile } : c)), [])
  const deleteClip = useCallback((id) => setClips(p => p.filter(c => c.id !== id)), [])
  const reorderClips = useCallback((newOrder) => setClips(newOrder), [])

  // ── Floating popup ────────────────────────────────────────────────────────
  const handlePlayerCardClick = useCallback((player, rect) => {
    if (!player) { setStatPopupAnchor(null); return }
    const x = rect.right + 8 > window.innerWidth - 270 ? rect.left - 268 : rect.right + 8
    const y = Math.max(60, Math.min(rect.top, window.innerHeight - 330))
    setStatPopupAnchor({ x, y })
  }, [])

  // ── Horizontal resize ─────────────────────────────────────────────────────
  const onDividerMouseDown = useCallback((e) => {
    e.preventDefault(); setDraggingH(true)
    const container = containerRef.current
    if (!container) return
    const onMove = (ev) => {
      const rect = container.getBoundingClientRect()
      setLeftPx(Math.max(640, Math.min(ev.clientX - rect.left, rect.width - 340)))
    }
    const onUp = () => { setDraggingH(false); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  const leftStyle = leftPx ? { width: leftPx, flexShrink:0 } : { width:'60%', flexShrink:0 }

  // ── Auth gates ───────────────────────────────────────────────────────────
  if (authState === 'checking') {
    return (
      <div style={{
        position:'fixed', inset:0, background:'var(--bg)',
        display:'flex', alignItems:'center', justifyContent:'center',
        flexDirection:'column', gap:16, WebkitAppRegion:'drag',
      }}>
        <img src="src/assets/logo.png" alt="18th Man" style={{ height:60, opacity:0.8 }} onError={e => e.target.style.display='none'} />
        <div style={{ fontFamily:'var(--font-ui)', fontWeight:800, fontStyle:'italic', fontSize:20, color:'var(--brand)' }}>18th Man</div>
        <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--muted)' }}>Loading…</div>
      </div>
    )
  }

  if (authState === 'logged-out' || authState === 'no-subscription') {
    return <LoginScreen onSuccess={handleAuthSuccess} initialError={authState === 'no-subscription' ? 'upgrade' : null} />
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', background:'var(--bg)' }}>
      {updateVersion && (
        <div style={{
          background: updateReady ? '#16a34a' : '#1d4ed8',
          color: '#fff', fontSize: '13px', padding: '6px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '12px', flexShrink: 0,
        }}>
          <span>
            {updateReady
              ? `Update v${updateVersion} downloaded and ready to install.`
              : `Update v${updateVersion} available — downloading in the background…`}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {updateReady && (
              <button
                onClick={() => window.electron?.installUpdate()}
                style={{
                  background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)',
                  color: '#fff', borderRadius: '4px', padding: '2px 12px',
                  cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                }}
              >
                Restart &amp; Install
              </button>
            )}
            <button
              onClick={() => setUpdateVersion(null)}
              style={{
                background: 'transparent', border: 'none',
                color: 'rgba(255,255,255,0.7)', cursor: 'pointer',
                fontSize: '16px', lineHeight: 1, padding: '0 2px',
              }}
              title="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      )}
      <Header
        videoFile={videoFile} events={events} clips={clips}
        players={effectivePlayers} outputFolder={outputFolder}
        showNotification={showNotification}
        matchInfo={matchInfo} setMatchInfo={setMatchInfo}
        sharedReports={sharedReports}
        onSaveSession={handleSaveSession}
        isDirty={isDirty}
        onOpenLibrary={() => setShowLibrary(true)}
        onPresent={() => setIsPresenting(true)}
        sessionName={sessionName}
        authProfile={authProfile}
        isTrial={isTrial}
        trialDaysLeft={trialDaysLeft(authProfile)}
        onSignOut={handleSignOut}
      />

      <div
        ref={containerRef}
        style={{ display:'flex', flex:1, overflow:'hidden', cursor: draggingH ? 'col-resize' : 'default' }}
      >
        <LeftPanel
          style={leftStyle}
          videoRef={videoRef} videoFile={videoFile} setVideoFile={setVideoFile}
          players={effectivePlayers} setPlayers={setPlayers} updatePlayer={updatePlayer}
          selectedPlayer={selectedPlayer} setSelectedPlayer={setSelectedPlayer}
          onPlayerCardClick={handlePlayerCardClick}
          onNotesClick={(player) => setNotesPlayer(player)}
          half={half} setHalf={setHalf}
          clips={clips} addClip={addClip} updateClipStatus={updateClipStatus}
          deleteClip={deleteClip} outputFolder={outputFolder} setOutputFolder={setOutputFolder}
          showNotification={showNotification} events={events}
        />
        <div className={`resize-handle-h${draggingH ? ' active' : ''}`} onMouseDown={onDividerMouseDown} />
        <RightPanel
          selectedPlayer={selectedPlayer} addEvent={addEvent}
          events={events} deleteEvent={deleteEvent}
          players={effectivePlayers} videoRef={videoRef}
          clips={clips} addClip={addClip} updateClipStatus={updateClipStatus}
          deleteClip={deleteClip} reorderClips={reorderClips}
          outputFolder={outputFolder} setOutputFolder={setOutputFolder}
          showNotification={showNotification} videoFile={videoFile}
          activeTab={activeTab} setActiveTab={setActiveTab}
          updatePlayer={updatePlayer}
          trackOpposition={trackOpposition} setTrackOpposition={setTrackOpposition}
          sharedReports={sharedReports} setSharedReports={setSharedReports}
          squadReviews={squadReviews}   setSquadReviews={setSquadReviews}
          matchInfo={matchInfo}
          authUser={authUser}
          onUndoDelete={undoDeleteEvent} canUndoDelete={undoStack.length > 0}
        />
      </div>

      {/* Presentation mode */}
      {isPresenting && (
        <PresentationMode
          videoFile={videoFile} events={events}
          players={effectivePlayers} clips={clips}
          matchInfo={matchInfo}
          onExit={() => setIsPresenting(false)}
        />
      )}

      {/* Game Library */}
      {showLibrary && (
        <GameLibrary
          onLoad={handleLoadSession}
          onNew={handleNewSession}
          onContinue={crashRecoverySession ? handleContinueLastSession : null}
          crashSession={crashRecoverySession}
          onClose={currentSessionId || events.length > 0 ? () => setShowLibrary(false) : null}
        />
      )}

      {/* Floating stat popup */}
      {selectedPlayer && statPopupAnchor && !pendingCarry && (
        <FloatingStatPopup
          player={selectedPlayer} anchor={statPopupAnchor}
          addEvent={addEvent} onClose={() => setStatPopupAnchor(null)}
        />
      )}

      {/* Player notes modal */}
      {notesPlayer && (
        <PlayerNotesModal
          player={players.find(p => p.id === notesPlayer.id) || notesPlayer}
          updatePlayer={updatePlayer}
          onEmailParent={async (player) => {
            const { subject, html, text } = generateParentEmail({ player, events, matchInfo, sharedReports, squadReviews })
            const result = await window.electron?.sendEmail({ to: player.parentEmail, subject, html, text })
            showNotification(result?.success ? `Email sent to ${player.parentEmail}` : (result?.error || 'Email failed'), result?.success ? 'success' : 'error')
          }}
          onClose={() => setNotesPlayer(null)}
        />
      )}

      {/* Carry meterage modal */}
      {pendingCarry && (
        <CarryMeterageModal
          playerName={pendingCarry.playerName}
          onConfirm={confirmCarry}
          onSkip={() => confirmCarry(null)}
          onCancel={() => setPendingCarry(null)}
        />
      )}

      {/* Notifications */}
      {notification && (
        <div className="fadein" style={{
          position:'fixed', bottom:20, right:20,
          background: notification.type === 'error' ? 'var(--red)' : '#1a3a0f',
          color:'var(--text)', padding:'9px 14px', borderRadius:3,
          border:`1px solid ${notification.type === 'error' ? 'var(--red)' : 'var(--green)'}`,
          fontFamily:'var(--font-ui)', fontSize:12, fontWeight:600, letterSpacing:0.4,
          zIndex:9999, maxWidth:300,
        }}>
          {notification.msg}
        </div>
      )}

      {/* Real-time response alert */}
      {newResponseAlert && (
        <div className="fadein" onClick={() => { setActiveTab('scout'); setNewResponseAlert(null) }} style={{
          position:'fixed', bottom:60, right:20, cursor:'pointer',
          background:'var(--blue)', color:'#fff',
          padding:'9px 14px', borderRadius:3,
          border:'1px solid rgba(255,255,255,0.2)',
          fontFamily:'var(--font-ui)', fontSize:12, fontWeight:700,
          zIndex:9999, maxWidth:280,
        }}>
          💬 New response from {newResponseAlert} — click to view
        </div>
      )}
    </div>
  )
}
