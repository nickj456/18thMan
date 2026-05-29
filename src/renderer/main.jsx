import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/global.css'

// Catch unhandled errors and show them instead of a blank screen
window.addEventListener('error', (e) => {
  document.body.style.cssText = 'background:#07080d;color:#e8e4dc;font-family:monospace;padding:24px;'
  document.body.innerHTML = `<h2 style="color:#e8560a;margin-bottom:16px">18th Man — Startup Error</h2><pre style="white-space:pre-wrap;font-size:12px">${e.message}\n\n${e.filename}:${e.lineno}\n\n${e.error?.stack || ''}</pre><p style="margin-top:16px;font-size:11px;color:#7a7875">Press F12 to open DevTools for more detail.</p>`
})

window.addEventListener('unhandledrejection', (e) => {
  document.body.style.cssText = 'background:#07080d;color:#e8e4dc;font-family:monospace;padding:24px;'
  document.body.innerHTML = `<h2 style="color:#e8560a;margin-bottom:16px">18th Man — Unhandled Promise Rejection</h2><pre style="white-space:pre-wrap;font-size:12px">${String(e.reason)}\n\n${e.reason?.stack || ''}</pre><p style="margin-top:16px;font-size:11px;color:#7a7875">Press F12 to open DevTools for more detail.</p>`
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
