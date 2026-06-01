const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const { autoUpdater } = require('electron-updater')

// Portable build: store all data next to the .exe on the USB stick
if (process.env.PORTABLE_EXECUTABLE_DIR) {
  app.setPath('userData', process.env.PORTABLE_EXECUTABLE_DIR)
}

const isDev = process.env.NODE_ENV === 'development'

// ── Portable-to-installer data migration ─────────────────────────────────────
// Prior releases accidentally shipped a portable .exe instead of the NSIS
// installer. Portable builds store data NEXT TO the .exe (wherever the user
// kept it — Downloads, Desktop, Documents, etc.). The NSIS installer puts the
// exe in Program Files, which is completely different. We search all the common
// locations a user might have kept the old portable exe and import the first
// match we find.
function migratePortableData() {
  if (process.env.PORTABLE_EXECUTABLE_DIR) return // still running portable, skip
  const appDataDir = app.getPath('userData')
  const migrationFlag = path.join(appDataDir, '.portable-migration-v2-done')
  if (fs.existsSync(migrationFlag)) return

  const home = app.getPath('home')
  const searchDirs = [
    path.dirname(process.execPath),                    // Program Files (unlikely but safe)
    path.join(home, 'Downloads'),
    path.join(home, 'Desktop'),
    path.join(home, 'Documents'),
    path.join(home, 'OneDrive', 'Downloads'),
    path.join(home, 'OneDrive', 'Desktop'),
    path.join(home, 'OneDrive', 'Documents'),
  ]

  let migratedSessions = false
  let migratedStore    = false

  for (const dir of searchDirs) {
    try {
      const sessionsDir = path.join(dir, 'sessions')
      const storeFile   = path.join(dir, '18thman-session.json')

      if (!migratedSessions && fs.existsSync(sessionsDir)) {
        const dest = path.join(appDataDir, 'sessions')
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true })
        for (const f of fs.readdirSync(sessionsDir)) {
          const src = path.join(sessionsDir, f)
          const dst = path.join(dest, f)
          if (!fs.existsSync(dst)) fs.copyFileSync(src, dst)
        }
        migratedSessions = true
      }

      if (!migratedStore && fs.existsSync(storeFile)) {
        const dst = path.join(appDataDir, '18thman-session.json')
        if (!fs.existsSync(dst)) fs.copyFileSync(storeFile, dst)
        migratedStore = true
      }

      if (migratedSessions && migratedStore) break
    } catch (e) {
      // Keep searching other directories
    }
  }

  fs.writeFileSync(migrationFlag, '', 'utf8')
}

// ── App settings ─────────────────────────────────────────────────────────────

function getSettingsPath() {
  return path.join(app.getPath('userData'), 'app-settings.json')
}

function readSettings() {
  try { return JSON.parse(fs.readFileSync(getSettingsPath(), 'utf8')) }
  catch { return {} }
}

function writeSettings(settings) {
  fs.writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2), 'utf8')
}

// ── Session storage helpers ───────────────────────────────────────────────────

function getSessionsDir() {
  const settings = readSettings()
  const dir = settings.sessionsFolder || path.join(app.getPath('userData'), 'sessions')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

function readSessionsIndex() {
  try { return JSON.parse(fs.readFileSync(path.join(getSessionsDir(), 'index.json'), 'utf8')) }
  catch { return [] }
}

function writeSessionsIndex(index) {
  fs.writeFileSync(path.join(getSessionsDir(), 'index.json'), JSON.stringify(index), 'utf8')
}

function getFfmpegPath() {
  if (isDev) return require('ffmpeg-static')
  const unpacked = path.join(
    process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'ffmpeg-static',
    process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
  )
  if (fs.existsSync(unpacked)) return unpacked
  return require('ffmpeg-static')
}

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 950,
    minWidth: 1100,
    minHeight: 680,
    backgroundColor: '#07080d',
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
    title: '18thMan Match Analyst',
  })

  try {
    const iconPath = path.join(__dirname, '..', 'assets', 'icon.ico')
    if (fs.existsSync(iconPath)) mainWindow.setIcon(iconPath)
  } catch (_) {}

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', '..', 'dist-react', 'index.html'))
  }

  // Suppress default right-click context menu (app feels native)
  mainWindow.webContents.on('context-menu', (e) => e.preventDefault())

  // F12 opens DevTools in any mode — useful for diagnosing blank screens
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12') mainWindow.webContents.openDevTools({ mode: 'detach' })
  })

  mainWindow.on('closed', () => { mainWindow = null })
}

app.whenReady().then(() => {
  migratePortableData()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  if (!isDev) {
    autoUpdater.on('update-available', (info) => {
      mainWindow?.webContents.send('update:available', { version: info.version })
    })

    autoUpdater.on('update-downloaded', () => {
      mainWindow?.webContents.send('update:ready')
    })

    autoUpdater.checkForUpdates()
  }
})

ipcMain.on('update:install', () => {
  autoUpdater.quitAndInstall()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ── IPC: File dialogs ─────────────────────────────────────────────────────────

ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Video Files', extensions: ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'm4v', 'webm', 'ts', 'mts'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
})

ipcMain.handle('dialog:chooseFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
})

// ── IPC: ffmpeg clip export ───────────────────────────────────────────────────
// Uses spawn directly — matches spec: ffmpeg -ss {in} -to {out} -i {src} -c copy {out}
// Fast-seek (-ss before -i) + stream copy = near-instant for large files.

function doExportClip(event, { sourceFile, inPoint, outPoint, label, outputFolder }) {
  const ffmpegPath = getFfmpegPath()
  const { spawn } = require('child_process')

  const safeName = (label || 'clip').replace(/[^a-zA-Z0-9_\-. ]/g, '_').trim() || 'clip'
  const outputFile = path.join(outputFolder, `${safeName}.mp4`)
  const duration = outPoint - inPoint

  return new Promise((resolve) => {
    const args = [
      '-y',                                   // overwrite without prompting
      '-ss', String(inPoint),                 // fast seek (before -i)
      '-to', String(outPoint),                // end timestamp
      '-i', sourceFile,                       // input
      '-c', 'copy',                           // stream copy — no re-encode
      '-avoid_negative_ts', 'make_zero',
      outputFile,
    ]

    const proc = spawn(ffmpegPath, args)
    let stderr = ''

    proc.stderr.on('data', (chunk) => {
      const txt = chunk.toString()
      stderr += txt
      // Parse "time=HH:MM:SS.ss" from ffmpeg progress output
      const m = txt.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d+)/)
      if (m && duration > 0) {
        const elapsed = +m[1] * 3600 + +m[2] * 60 + parseFloat(m[3])
        const percent = Math.min(99, (elapsed / duration) * 100)
        if (event.sender && !event.sender.isDestroyed()) {
          event.sender.send('ffmpeg:progress', { label, percent })
        }
      }
    })

    proc.on('close', (code) => {
      if (code === 0) {
        if (event.sender && !event.sender.isDestroyed()) {
          event.sender.send('ffmpeg:progress', { label, percent: 100 })
        }
        resolve({ success: true, outputFile })
      } else {
        resolve({ success: false, error: stderr.slice(-600) || `ffmpeg exited ${code}` })
      }
    })

    proc.on('error', (err) => {
      resolve({ success: false, error: err.message })
    })
  })
}

ipcMain.handle('ffmpeg:exportClip', async (event, args) => {
  try { return await doExportClip(event, args) }
  catch (err) { return { success: false, error: err.message } }
})

ipcMain.handle('ffmpeg:exportAllClips', async (event, { clips, sourceFile, outputFolder }) => {
  const results = []
  const BATCH = 3
  for (let i = 0; i < clips.length; i += BATCH) {
    const batch = clips.slice(i, i + BATCH)
    const batchResults = await Promise.all(batch.map(clip =>
      doExportClip(event, { sourceFile, inPoint: clip.inPoint, outPoint: clip.outPoint, label: clip.label, outputFolder })
        .then(r => ({ id: clip.id, ...r }))
        .catch(err => ({ id: clip.id, success: false, error: err.message }))
    ))
    results.push(...batchResults)
  }
  return results
})

// ── IPC: Session store ────────────────────────────────────────────────────────

let storeInstance = null

async function getStore() {
  if (!storeInstance) {
    try {
      const mod = await import('electron-store')
      const Store = mod.default
      storeInstance = new Store({ name: '18thman-session' })
    } catch (_) {
      const filePath = path.join(app.getPath('userData'), '18thman-session.json')
      storeInstance = {
        get: (k, def) => { try { return JSON.parse(fs.readFileSync(filePath, 'utf8'))[k] ?? def } catch { return def } },
        set: (k, v) => { try { let d = {}; try { d = JSON.parse(fs.readFileSync(filePath, 'utf8')) } catch {} d[k] = v; fs.writeFileSync(filePath, JSON.stringify(d), 'utf8') } catch {} },
        delete: (k) => { try { let d = {}; try { d = JSON.parse(fs.readFileSync(filePath, 'utf8')) } catch {} delete d[k]; fs.writeFileSync(filePath, JSON.stringify(d), 'utf8') } catch {} },
      }
    }
  }
  return storeInstance
}

ipcMain.handle('store:save', async (_, data) => { const s = await getStore(); s.set('session', data); return true })
ipcMain.handle('store:load', async () => { const s = await getStore(); return s.get('session', null) })
ipcMain.handle('store:clear', async () => { const s = await getStore(); s.delete('session'); return true })

// ── IPC: PDF report ───────────────────────────────────────────────────────────

ipcMain.handle('print:pdf', async (_, { html, outputPath }) => {
  const os = require('os')
  const tmpHtml = path.join(os.tmpdir(), `18thman-report-${Date.now()}.html`)
  fs.writeFileSync(tmpHtml, html, 'utf8')
  const pdfWin = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true } })
  await pdfWin.loadFile(tmpHtml)
  try { fs.unlinkSync(tmpHtml) } catch {}
  const pdfBuffer = await pdfWin.webContents.printToPDF({
    pageSize: 'A4',
    printBackground: true,
    landscape: false,
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: `
      <div style="
        width:100%; padding:0 22mm; display:flex; justify-content:space-between;
        font-family:'Helvetica Neue',Arial,sans-serif; font-size:8px; color:#999;
        border-top:0.5px solid #e0e0e0; padding-top:4px; margin-top:0;
      ">
        <span>18th Man Match Analyst</span>
        <span>Page <span class="pageNumber"></span> / <span class="totalPages"></span></span>
      </div>`,
    margins: { marginType: 'custom', top: 0.6, bottom: 0.55, left: 0.75, right: 0.75 },
  })
  pdfWin.close()
  fs.writeFileSync(outputPath, pdfBuffer)
  shell.openPath(outputPath)
  return { success: true, outputPath }
})

ipcMain.handle('shell:openPath', async (_, p) => shell.openPath(p))

// ── IPC: Window controls ──────────────────────────────────────────────────────
ipcMain.handle('window:minimize', () => mainWindow?.minimize())
ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize()
  else mainWindow?.maximize()
})
ipcMain.handle('window:close', () => mainWindow?.close())

ipcMain.handle('shell:openExternal', async (_, url) => {
  await shell.openExternal(url)
  return true
})

// ── IPC: Named sessions ───────────────────────────────────────────────────────

ipcMain.handle('sessions:list', () => readSessionsIndex())

ipcMain.handle('sessions:save', (_, { id, name, data }) => {
  const dir = getSessionsDir()
  fs.writeFileSync(path.join(dir, `${id}.json`), JSON.stringify(data), 'utf8')
  const index = readSessionsIndex()
  const meta = {
    id, name,
    savedAt:     new Date().toISOString(),
    club:        data.matchInfo?.club || '',
    opposition:  data.matchInfo?.opposition || '',
    date:        data.matchInfo?.date || '',
    ourScore:    data.matchInfo?.ourScore ?? '',
    oppScore:    data.matchInfo?.oppScore ?? '',
    eventCount:  (data.events || []).length,
    clipCount:   (data.clips || []).length,
    playerCount: (data.players || []).filter(p => !p.isOpposition).length,
  }
  const idx = index.findIndex(s => s.id === id)
  if (idx >= 0) index[idx] = meta
  else index.unshift(meta)
  if (index.length > 200) index.splice(200)
  writeSessionsIndex(index)
  return { success: true }
})

ipcMain.handle('sessions:load', (_, id) => {
  try { return JSON.parse(fs.readFileSync(path.join(getSessionsDir(), `${id}.json`), 'utf8')) }
  catch { return null }
})

ipcMain.handle('sessions:delete', (_, id) => {
  try { fs.unlinkSync(path.join(getSessionsDir(), `${id}.json`)) } catch {}
  writeSessionsIndex(readSessionsIndex().filter(s => s.id !== id))
  return true
})

function importSessionsFromDir(srcFolder) {
  let imported = 0
  const directIndex = path.join(srcFolder, 'index.json')
  const nestedIndex = path.join(srcFolder, 'sessions', 'index.json')
  const sessionsDir = fs.existsSync(directIndex) ? srcFolder
                    : fs.existsSync(nestedIndex)  ? path.join(srcFolder, 'sessions')
                    : null

  if (sessionsDir) {
    const dest = getSessionsDir()
    const srcIndex = JSON.parse(fs.readFileSync(path.join(sessionsDir, 'index.json'), 'utf8'))
    const destIndex = readSessionsIndex()
    const existingIds = new Set(destIndex.map(s => s.id))
    for (const entry of srcIndex) {
      if (existingIds.has(entry.id)) continue
      const srcFile = path.join(sessionsDir, `${entry.id}.json`)
      if (fs.existsSync(srcFile)) {
        fs.copyFileSync(srcFile, path.join(dest, `${entry.id}.json`))
        destIndex.push(entry)
        imported++
      }
    }
    writeSessionsIndex(destIndex)
  }

  const storeFile = path.join(srcFolder, '18thman-session.json')
  if (fs.existsSync(storeFile)) {
    const dst = path.join(app.getPath('userData'), '18thman-session.json')
    if (!fs.existsSync(dst)) fs.copyFileSync(storeFile, dst)
  }

  return imported
}

// Scan common locations for old portable-build session data and return what was found.
ipcMain.handle('sessions:findOldData', () => {
  const home = app.getPath('home')
  const searchDirs = [
    { path: path.join(home, 'Downloads'), label: 'Downloads' },
    { path: path.join(home, 'Desktop'),   label: 'Desktop' },
    { path: path.join(home, 'Documents'), label: 'Documents' },
    { path: path.join(home, 'OneDrive', 'Downloads'), label: 'OneDrive › Downloads' },
    { path: path.join(home, 'OneDrive', 'Desktop'),   label: 'OneDrive › Desktop' },
    { path: path.join(home, 'OneDrive', 'Documents'), label: 'OneDrive › Documents' },
  ]

  const found = []
  const existingIds = new Set(readSessionsIndex().map(s => s.id))

  for (const { path: dir, label } of searchDirs) {
    try {
      const directIndex = path.join(dir, 'index.json')
      const nestedIndex = path.join(dir, 'sessions', 'index.json')
      const indexPath   = fs.existsSync(directIndex) ? directIndex
                        : fs.existsSync(nestedIndex)  ? nestedIndex
                        : null
      if (!indexPath) continue

      const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'))
      const newSessions = index.filter(s => !existingIds.has(s.id))
      if (newSessions.length > 0) {
        found.push({ dir, label, count: newSessions.length })
      }
    } catch {}
  }

  return found
})

ipcMain.handle('sessions:importFromFolder', async (_, knownPath) => {
  let srcFolder = knownPath || null

  if (!srcFolder) {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Select the folder where the old app was saved (e.g. Downloads)',
      properties: ['openDirectory'],
      defaultPath: app.getPath('downloads'),
    })
    if (canceled || !filePaths[0]) return { imported: 0 }
    srcFolder = filePaths[0]
  }

  try {
    return { imported: importSessionsFromDir(srcFolder) }
  } catch (e) {
    return { imported: 0, error: e.message }
  }
})

// ── IPC: Squad templates ──────────────────────────────────────────────────────

function getSquadTemplatesPath() {
  return path.join(app.getPath('userData'), 'squad-templates.json')
}

// ── IPC: App settings ────────────────────────────────────────────────────────

ipcMain.handle('settings:get', () => readSettings())

ipcMain.handle('settings:setSessionsFolder', async () => {
  const current = readSettings().sessionsFolder || path.join(app.getPath('userData'), 'sessions')
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Choose where to save your sessions',
    defaultPath: current,
    properties: ['openDirectory', 'createDirectory'],
  })
  if (canceled || !filePaths[0]) return null
  const settings = readSettings()
  settings.sessionsFolder = filePaths[0]
  writeSettings(settings)
  return filePaths[0]
})

ipcMain.handle('settings:clearSessionsFolder', () => {
  const settings = readSettings()
  delete settings.sessionsFolder
  writeSettings(settings)
  return true
})

// ── IPC: Squad templates ──────────────────────────────────────────────────────

ipcMain.handle('squads:list', () => {
  try { return JSON.parse(fs.readFileSync(getSquadTemplatesPath(), 'utf8')) }
  catch { return [] }
})

ipcMain.handle('squads:save', (_, { id, name, players }) => {
  const templates = (() => { try { return JSON.parse(fs.readFileSync(getSquadTemplatesPath(), 'utf8')) } catch { return [] } })()
  const meta = { id, name, playerCount: players.length, savedAt: new Date().toISOString() }
  const existing = templates.findIndex(t => t.id === id)
  if (existing >= 0) templates[existing] = { ...meta, players }
  else templates.unshift({ ...meta, players })
  fs.writeFileSync(getSquadTemplatesPath(), JSON.stringify(templates), 'utf8')
  return true
})

ipcMain.handle('squads:delete', (_, id) => {
  const templates = (() => { try { return JSON.parse(fs.readFileSync(getSquadTemplatesPath(), 'utf8')) } catch { return [] } })()
  fs.writeFileSync(getSquadTemplatesPath(), JSON.stringify(templates.filter(t => t.id !== id)), 'utf8')
  return true
})

// ── IPC: Highlight reel ───────────────────────────────────────────────────────

function runFfmpeg(ffmpegPath, args) {
  const { spawn } = require('child_process')
  return new Promise((resolve) => {
    const proc = spawn(ffmpegPath, args)
    let stderr = ''
    proc.stderr.on('data', d => { stderr += d.toString() })
    proc.on('close', code => resolve({ ok: code === 0, stderr }))
    proc.on('error', err => resolve({ ok: false, stderr: err.message }))
  })
}

ipcMain.handle('ffmpeg:highlightReel', async (event, { clips, outputPath }) => {
  const ffmpegPath = getFfmpegPath()
  const os = require('os')

  const validClips = clips.filter(c => c.outputFile && fs.existsSync(c.outputFile))
  if (validClips.length === 0) {
    return { success: false, error: 'No exported clips found. Export your clips first.' }
  }

  const tmpDir = path.join(os.tmpdir(), `18thman-reel-${Date.now()}`)
  fs.mkdirSync(tmpDir, { recursive: true })

  // Windows font path for drawtext — Arial Bold is universally present
  const winFont = process.env.WINDIR
    ? path.join(process.env.WINDIR, 'Fonts', 'arialbd.ttf').replace(/\\/g, '/').replace(':', '\\:')
    : null

  // Step 1: Re-encode each clip with the label overlaid for the first 3 seconds
  const titledPaths = []
  for (let i = 0; i < validClips.length; i++) {
    const clip  = validClips[i]
    const dest  = path.join(tmpDir, `clip_${i}.mp4`)
    // Sanitise label — remove chars that break ffmpeg filter strings
    const label = (clip.label || `Clip ${i + 1}`)
      .replace(/[':=\\[\]@,]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 60)

    const fontPart = winFont ? `fontfile='${winFont}':` : ''
    const filter = [
      `drawtext=${fontPart}`,
      `text='${label}':`,
      `fontcolor=white:fontsize=38:`,
      `x=30:y=h-th-30:`,
      `box=1:boxcolor=black@0.65:boxborderw=12:`,
      `enable='between(t\\,0\\,3.5)'`,
    ].join('')

    const r = await runFfmpeg(ffmpegPath, [
      '-y', '-i', clip.outputFile,
      '-vf', filter,
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '20',
      '-c:a', 'copy',
      dest,
    ])

    if (r.ok) {
      titledPaths.push(dest)
    } else {
      // If drawtext fails (e.g. missing font), fall back to the original clip untouched
      titledPaths.push(clip.outputFile)
    }
  }

  // Step 2: Concatenate all titled clips
  const listPath = path.join(tmpDir, 'list.txt')
  fs.writeFileSync(
    listPath,
    titledPaths.map(p => `file '${p.replace(/\\/g, '/').replace(/'/g, "'\\''")}'`).join('\n'),
    'utf8'
  )

  const concat = await runFfmpeg(ffmpegPath, [
    '-y', '-f', 'concat', '-safe', '0', '-i', listPath,
    '-c', 'copy',
    outputPath,
  ])

  // Clean up temp dir
  try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch {}

  if (concat.ok) return { success: true, outputPath }
  return { success: false, error: concat.stderr.slice(-400) }
})

// ── IPC: Veo video resolver ───────────────────────────────────────────────────

ipcMain.handle('veo:resolveVideo', async (_, veoUrl) => {
  try {
    const match = veoUrl.match(/matches\/([^/?#]+)/)
    if (!match) return { error: 'Invalid Veo URL — expected https://app.veo.co/matches/...' }
    const slug = match[1]
    const res = await fetch(`https://app.veo.co/api/app/matches/${slug}/videos/`)
    if (!res.ok) return { error: `Veo API returned ${res.status}` }
    const videos = await res.json()
    const video = videos.find(v => v.render_type === 'standard' && v.mime_type === 'video/mp4')
               || videos.find(v => v.mime_type === 'video/mp4')
    if (!video?.url) return { error: 'No playable video found for this match' }
    return { url: video.url, veoUrl }
  } catch (err) {
    return { error: err.message }
  }
})

// ── IPC: File utilities ───────────────────────────────────────────────────────

ipcMain.handle('file:exists', (_, filePath) => {
  try { return fs.existsSync(filePath) } catch { return false }
})

// ── IPC: Window — full screen ─────────────────────────────────────────────────

ipcMain.handle('window:setFullScreen', (_, flag) => {
  mainWindow?.setFullScreen(flag)
})

// ── IPC: Email settings ───────────────────────────────────────────────────────

ipcMain.handle('emailSettings:load', async () => {
  const store = await getStore()
  return store.get('emailSettings', null)
})

ipcMain.handle('emailSettings:save', async (_, settings) => {
  const store = await getStore()
  store.set('emailSettings', settings)
  return true
})

// ── IPC: Send email via Supabase Edge Function ────────────────────────────────

ipcMain.handle('email:send', async (_, { to, subject, html, text }) => {
  const store = await getStore()
  const settings = store.get('emailSettings', null)

  if (!settings?.supabaseUrl || !settings?.supabaseAnonKey) {
    return { success: false, error: 'Email not configured. Open ⚙ Settings and add your Supabase details.' }
  }

  const url = `${settings.supabaseUrl.replace(/\/$/, '')}/functions/v1/send-match-email`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.supabaseAnonKey}`,
        'apikey': settings.supabaseAnonKey,
      },
      body: JSON.stringify({
        to,
        subject,
        html,
        text,
        fromName: settings.fromName || '18th Man Coaching',
      }),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => `HTTP ${res.status}`)
      return { success: false, error: errText }
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})
