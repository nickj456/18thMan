'use client'

import { useState } from 'react'

export function QRExpand({ dataUrl }: { dataUrl: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'inline-block',
          padding: '1.25rem',
          background: 'rgba(232,86,10,0.08)',
          border: '2px solid rgba(232,86,10,0.3)',
          borderRadius: '20px',
          marginBottom: '1rem',
          cursor: 'zoom-in',
          transition: 'border-color 0.15s, transform 0.15s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'rgba(232,86,10,0.7)'
          e.currentTarget.style.transform = 'scale(1.02)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'rgba(232,86,10,0.3)'
          e.currentTarget.style.transform = 'scale(1)'
        }}
        title="Click to enlarge"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dataUrl} alt="Scan to join" width={200} height={200} style={{ display: 'block' }} />
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.9)',
            backdropFilter: 'blur(8px)',
            zIndex: 200,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1.5rem',
            cursor: 'zoom-out',
          }}
        >
          <div
            style={{
              padding: '2rem',
              background: 'rgba(232,86,10,0.1)',
              border: '3px solid rgba(232,86,10,0.5)',
              borderRadius: '24px',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={dataUrl} alt="Scan to join" width={400} height={400} style={{ display: 'block' }} />
          </div>
          <p style={{
            fontFamily: 'system-ui',
            fontSize: '1.1rem',
            color: '#e8560a',
            letterSpacing: '0.1em',
            fontWeight: 700,
            textTransform: 'uppercase',
          }}>
            Scan to join free
          </p>
          <p style={{ fontFamily: 'system-ui', fontSize: '0.85rem', color: '#4a4845' }}>
            Tap anywhere to close
          </p>
        </div>
      )}
    </>
  )
}
