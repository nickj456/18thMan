// stub — will be replaced in Task 15
export async function generateProgressionPdf(
  _input: {
    sessionIds: string[]
    playerKeys: string[]
    sections: string[]
    statTypes: string[]
  },
): Promise<{ pdf?: string; error?: string }> {
  return { error: 'PDF export not yet implemented.' }
}
