const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  chooseFolder: () => ipcRenderer.invoke('dialog:chooseFolder'),

  exportClip: (args) => ipcRenderer.invoke('ffmpeg:exportClip', args),
  exportAllClips: (args) => ipcRenderer.invoke('ffmpeg:exportAllClips', args),
  onFfmpegProgress: (cb) => {
    ipcRenderer.on('ffmpeg:progress', (_, data) => cb(data))
    return () => ipcRenderer.removeAllListeners('ffmpeg:progress')
  },

  saveSession: (data) => ipcRenderer.invoke('store:save', data),
  loadSession: () => ipcRenderer.invoke('store:load'),
  clearSession: () => ipcRenderer.invoke('store:clear'),

  printPdf: (args) => ipcRenderer.invoke('print:pdf', args),
  openPath: (p) => ipcRenderer.invoke('shell:openPath', p),
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  minimizeWindow:  () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow:  () => ipcRenderer.invoke('window:maximize'),
  closeWindow:     () => ipcRenderer.invoke('window:close'),
  setFullScreen:   (f) => ipcRenderer.invoke('window:setFullScreen', f),

  listSessions:   ()        => ipcRenderer.invoke('sessions:list'),
  saveNamedSession: (args)  => ipcRenderer.invoke('sessions:save', args),
  loadNamedSession: (id)    => ipcRenderer.invoke('sessions:load', id),
  deleteSession:  (id)      => ipcRenderer.invoke('sessions:delete', id),
  findOldSessionData: () => ipcRenderer.invoke('sessions:findOldData'),
  importSessionsFromFolder: (knownPath) => ipcRenderer.invoke('sessions:importFromFolder', knownPath),

  getSettings: () => ipcRenderer.invoke('settings:get'),
  chooseSessionsFolder: () => ipcRenderer.invoke('settings:setSessionsFolder'),
  clearSessionsFolder: () => ipcRenderer.invoke('settings:clearSessionsFolder'),

  fileExists: (p) => ipcRenderer.invoke('file:exists', p),

  listSquads:      ()     => ipcRenderer.invoke('squads:list'),
  saveSquad:       (args) => ipcRenderer.invoke('squads:save', args),
  deleteSquad:     (id)   => ipcRenderer.invoke('squads:delete', id),

  exportHighlightReel: (args) => ipcRenderer.invoke('ffmpeg:highlightReel', args),

  resolveVeoVideo: (url) => ipcRenderer.invoke('veo:resolveVideo', url),

  loadEmailSettings: () => ipcRenderer.invoke('emailSettings:load'),
  saveEmailSettings: (s) => ipcRenderer.invoke('emailSettings:save', s),
  sendEmail: (args) => ipcRenderer.invoke('email:send', args),

  onUpdateAvailable: (cb) => ipcRenderer.on('update:available', (_, data) => cb(data)),
  onUpdateReady: (cb) => ipcRenderer.on('update:ready', () => cb()),
  onUpdateInstallError: (cb) => ipcRenderer.on('update:install-error', (_, msg) => cb(msg)),
  installUpdate: () => ipcRenderer.send('update:install'),
  removeUpdateListeners: () => {
    ipcRenderer.removeAllListeners('update:available')
    ipcRenderer.removeAllListeners('update:ready')
    ipcRenderer.removeAllListeners('update:install-error')
  },
})
