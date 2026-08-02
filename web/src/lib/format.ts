const GBP_FORMATTER = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })

export function formatCents(cents: number): string {
  return GBP_FORMATTER.format(cents / 100)
}
