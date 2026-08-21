/** First complete sentence of free text, so a condensed preview never cuts off mid-sentence. Falls back to the full text if no sentence terminator is found. */
export function firstSentence(text: string): string {
  const match = text.match(/^[\s\S]*?[.!?](?=\s|$)/)
  return match ? match[0].trim() : text.trim()
}
