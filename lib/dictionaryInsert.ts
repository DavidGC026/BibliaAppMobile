import type { StrongEntry } from './types';

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function parseDictionaryDefinition(definition: string): { label: string; text: string }[] {
  if (!definition) return [];
  const labelMap: Record<string, string> = {
    Strong: 'Definición',
    KJV: 'Traducciones (KJV)',
    Derivation: 'Derivación',
  };
  const sections: { label: string; text: string }[] = [];
  for (const block of definition.split(/\n\n+/)) {
    const match = block.match(/^(Strong|KJV|Derivation):\s*([\s\S]*)$/);
    if (match) {
      sections.push({ label: labelMap[match[1]] ?? match[1], text: match[2].trim() });
    } else if (block.trim()) {
      sections.push({ label: '', text: block.trim() });
    }
  }
  return sections;
}

/** HTML para insertar en el editor de notas (clase distinta a blockquote de versículos). */
export function formatDictionaryInsertion(entry: StrongEntry): string {
  const sections = parseDictionaryDefinition(entry.definition);
  const defHtml =
    sections.length > 0
      ? sections
          .map((s) => {
            const label = s.label
              ? `<div class="biblia-dict-section-label">${escapeHtml(s.label)}</div>`
              : '';
            return `${label}<div class="biblia-dict-section-text">${escapeHtml(s.text)}</div>`;
          })
          .join('')
      : `<div class="biblia-dict-section-text">${escapeHtml(entry.definition)}</div>`;

  const langLabel = entry.strongCode.startsWith('H') ? 'Hebreo' : 'Griego';

  return (
    `<aside class="biblia-dict-entry" data-strong="${escapeHtml(entry.strongCode)}" contenteditable="false">` +
    `<div class="biblia-dict-label">📚 Diccionario Strong · ${langLabel}</div>` +
    `<div class="biblia-dict-head">` +
    `<span class="biblia-dict-code">${escapeHtml(entry.strongCode)}</span>` +
    `<span class="biblia-dict-lemma">${escapeHtml(entry.lemma)}</span>` +
    (entry.transliteration
      ? `<span class="biblia-dict-trans">${escapeHtml(entry.transliteration)}</span>`
      : '') +
    `</div>` +
    `<div class="biblia-dict-body">${defHtml}</div>` +
    `</aside>`
  );
}
