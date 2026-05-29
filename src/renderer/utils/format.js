export function fmtTime(sec, fallback = '0:00') {
  if ((!sec && sec !== 0) || isNaN(sec)) return fallback
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
