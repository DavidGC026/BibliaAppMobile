import type { CrossReference } from '@/lib/types';

export function formatReferenceInsertion(
  source: string,
  references: CrossReference[],
  bibleAbbr: string,
): string {
  if (references.length === 0) return '';
  const body = references
    .map((ref) => `**${ref.book_name} ${ref.chapter}:${ref.verse}** ${ref.text}`)
    .join('<br/>');

  return `
<blockquote>
  <strong>Referencias relacionadas con ${source} (${bibleAbbr})</strong><br/>
  ${body}
</blockquote>
<p><br/></p>`;
}
