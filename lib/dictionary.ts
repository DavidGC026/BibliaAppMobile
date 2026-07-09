export { parseDictionaryDefinition } from '@/lib/dictionaryInsert';

/** Códigos Strong referenciados en texto de definición (G123 / H456). */
export const STRONG_CODE_PATTERN = /\b([GH]\d+)\b/g;

export function splitStrongCodes(text: string): Array<{ type: 'text' | 'code'; value: string }> {
  const parts: Array<{ type: 'text' | 'code'; value: string }> = [];
  let last = 0;
  const re = new RegExp(STRONG_CODE_PATTERN.source, 'g');
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push({ type: 'text', value: text.slice(last, match.index) });
    }
    parts.push({ type: 'code', value: match[1].toUpperCase() });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ type: 'text', value: text.slice(last) });
  return parts.length ? parts : [{ type: 'text', value: text }];
}
