try {
  const paths = require.resolve.paths('electron')
  console.log('Resolve paths:', JSON.stringify(paths, null, 2))
} catch(e) { console.log('resolve error:', e.message) }

try {
  const resolved = require.resolve('electron')
  console.log('Resolved to:', resolved)
} catch(e) { console.log('resolve failed:', e.message) }

const e = require('electron')
console.log('Got type:', typeof e)
