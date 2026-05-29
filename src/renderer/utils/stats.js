export const STAT_CLASSIFICATION = {
  try:           'positive',
  tackle:        'positive',
  carry:         'positive',
  line_break:    'positive',
  support:       'positive',
  offload:       'positive',
  penalty_won:   'positive',
  intercept:     'positive',
  missed_tackle: 'negative',
  penalty_con:   'negative',
  error:         'negative',
  kick:          'neutral',
}

export const STAT_COLORS = {
  try: 'var(--green)', tackle: 'var(--blue)', missed_tackle: 'var(--red)',
  carry: 'var(--amber)', line_break: 'var(--purple)', support: 'var(--teal)',
  offload: 'var(--teal)', kick: 'var(--dark-red)', penalty_won: 'var(--green)',
  penalty_con: 'var(--orange)', error: 'var(--red)', intercept: 'var(--purple)',
}

export const STAT_COLORS_HEX = {
  try: '#3B6D11', tackle: '#185FA5', missed_tackle: '#A32D2D', carry: '#f59e0b',
  line_break: '#534AB7', support: '#0e7490', offload: '#0e7490', kick: '#7f1d1d',
  penalty_won: '#3B6D11', penalty_con: '#c2410c', error: '#A32D2D', intercept: '#534AB7',
}
