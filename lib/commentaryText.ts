export interface CommentaryBlock {
  kind: 'paragraph' | 'heading' | 'quote';
  text: string;
}

export function parseCommentaryBlocks(markdown: string): CommentaryBlock[] {
  return markdown.replace(/\r\n/g, '\n').split(/\n\s*\n/).map((part): CommentaryBlock => {
    const text = part.trim();
    if (/^#{1,6}\s/.test(text)) return { kind: 'heading', text: text.replace(/^#{1,6}\s+/, '') };
    if (/^>\s?/.test(text)) return { kind: 'quote', text: text.replace(/^>\s?/gm, '') };
    return { kind: 'paragraph', text };
  }).filter((block) => block.text.length > 0);
}

export interface CommentarySpan {
  text: string;
  style?: 'bold' | 'italic';
}

/** Solo presentación nativa; el contenido nunca se interpreta como HTML. */
export function parseCommentaryInline(text: string): CommentarySpan[] {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean).map((part) => {
    if (part.startsWith('**') && part.endsWith('**')) return { text: part.slice(2, -2), style: 'bold' };
    if (part.startsWith('*') && part.endsWith('*')) return { text: part.slice(1, -1), style: 'italic' };
    return { text: part };
  });
}
