import React, { useState, useCallback } from 'react'

export const ALL_STATS = [
  { key: 'try',            label: 'Try',           shortcut: 'T', color: 'var(--green)' },
  { key: 'tackle',         label: 'Tackle',         shortcut: 'A', color: 'var(--blue)' },
  { key: 'missed_tackle',  label: 'Missed Tackle',  shortcut: 'M', color: 'var(--red)' },
  { key: 'carry',          label: 'Carry',          shortcut: 'C', color: 'var(--amber)' },
  { key: 'line_break',     label: 'Line Break',     shortcut: 'L', color: 'var(--purple)' },
  { key: 'support',        label: 'Support',        shortcut: 'S', color: 'var(--teal)' },
  { key: 'offload',        label: 'Offload',        shortcut: 'O', color: 'var(--teal)' },
  { key: 'kick',           label: 'Kick',           shortcut: 'K', color: 'var(--dark-red)' },
  { key: 'penalty_won',    label: 'Penalty Won',    shortcut: 'P', color: 'var(--green)' },
  { key: 'penalty_con',    label: 'Penalty Con',    shortcut: 'N', color: 'var(--orange)' },
  { key: 'error',          label: 'Error',          shortcut: 'E', color: 'var(--red)' },
  { key: 'intercept',      label: 'Intercept',      shortcut: 'I', color: 'var(--purple)' },
  { key: 'ruck_win',       label: 'Ruck Win',       shortcut: 'R', color: 'var(--teal)' },
  { key: 'ruck_loss',      label: 'Ruck Loss',      shortcut: 'U', color: 'var(--orange)' },
  { key: 'ptb_fast',       label: 'PTB Fast',       shortcut: 'F', color: 'var(--amber)' },
  { key: 'ptb_slow',       label: 'PTB Slow',       shortcut: 'W', color: 'var(--dark-red)' },
  { key: 'involvement_pos',label: 'Involvement +',  shortcut: 'G', color: 'var(--green)' },
  { key: 'involvement_neg',label: 'Involvement −',  shortcut: 'B', color: 'var(--red)' },
  { key: 'marker_tackle',  label: 'Marker Tackle',  shortcut: 'J', color: 'var(--blue)' },
]
