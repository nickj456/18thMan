// Launcher that strips ELECTRON_RUN_AS_NODE before starting Electron.
// This env var being set to 1 causes Electron to behave like plain Node.js,
// stripping out all Electron APIs. We must remove it entirely.
const { spawn } = require('child_process')
const path = require('path')

const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE
env.NODE_ENV = 'development'

const electronBin = path.join(__dirname, '..', 'node_modules', '.bin', 'electron')

const child = spawn(electronBin, ['.'], {
  env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

child.on('close', (code) => process.exit(code ?? 0))
child.on('error', (err) => { console.error('Electron launch failed:', err.message); process.exit(1) })
