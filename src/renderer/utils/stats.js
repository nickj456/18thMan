export const STAT_CLASSIFICATION = {
  try:             'positive',
  tackle:          'positive',
  carry:           'positive',
  line_break:      'positive',
  support:         'positive',
  offload:         'positive',
  penalty_won:     'positive',
  intercept:       'positive',
  ruck_win:        'positive',
  ptb_fast:        'positive',
  involvement_pos: 'positive',
  marker_tackle:   'positive',
  missed_tackle:   'negative',
  penalty_con:     'negative',
  error:           'negative',
  ruck_loss:       'negative',
  ptb_slow:        'negative',
  involvement_neg: 'negative',
  kick:            'neutral',
}

export const STAT_COLORS = {
  try: 'var(--green)', tackle: 'var(--blue)', missed_tackle: 'var(--red)',
  carry: 'var(--amber)', line_break: 'var(--purple)', support: 'var(--teal)',
  offload: 'var(--teal)', kick: 'var(--dark-red)', penalty_won: 'var(--green)',
  penalty_con: 'var(--orange)', error: 'var(--red)', intercept: 'var(--purple)',
  ruck_win: 'var(--teal)', ruck_loss: 'var(--orange)',
  ptb_fast: 'var(--amber)', ptb_slow: 'var(--dark-red)',
  involvement_pos: 'var(--green)', involvement_neg: 'var(--red)',
  marker_tackle: 'var(--blue)',
}

export const STAT_COLORS_HEX = {
  try: '#3B6D11', tackle: '#185FA5', missed_tackle: '#A32D2D', carry: '#f59e0b',
  line_break: '#534AB7', support: '#0e7490', offload: '#0e7490', kick: '#7f1d1d',
  penalty_won: '#3B6D11', penalty_con: '#c2410c', error: '#A32D2D', intercept: '#534AB7',
  ruck_win: '#0e7490', ruck_loss: '#c2410c',
  ptb_fast: '#f59e0b', ptb_slow: '#7f1d1d',
  involvement_pos: '#3B6D11', involvement_neg: '#A32D2D',
  marker_tackle: '#185FA5',
}

// Human-readable labels for all stat keys
export const STAT_LABELS = {
  try: 'Try', tackle: 'Tackle', missed_tackle: 'Missed Tackle',
  carry: 'Carry', line_break: 'Line Break', support: 'Support',
  offload: 'Offload', kick: 'Kick', penalty_won: 'Penalty Won',
  penalty_con: 'Penalty Con', error: 'Error', intercept: 'Intercept',
  ruck_win: 'Ruck Win', ruck_loss: 'Ruck Loss',
  ptb_fast: 'PTB Fast', ptb_slow: 'PTB Slow',
  involvement_pos: 'Involvement +', involvement_neg: 'Involvement −',
  marker_tackle: 'Marker Tackle',
}
