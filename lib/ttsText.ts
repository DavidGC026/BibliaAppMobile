/**
 * Limpia el texto bíblico antes de mandarlo a Kokoro o a Speech.
 * Replica el filtro de `app/api/tts/route.ts` y además quita códigos Strong.
 */
export function cleanTtsText(text: string): string {
  return text
    .replace(/\[\d+\]/g, '')
    .replace(/\{[HG]\d+\}/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildTtsAudioUrl(
  apiBase: string,
  opts: { text: string; voice?: string; speed?: number },
): string {
  const params = new URLSearchParams({
    text: cleanTtsText(opts.text),
    voice: opts.voice ?? 'em_alex',
    speed: String(opts.speed ?? 1),
  });
  return `${apiBase.replace(/\/$/, '')}/api/tts?${params.toString()}`;
}
