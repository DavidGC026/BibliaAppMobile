import { Share } from 'react-native';

import { API_BASE_URL } from '@/lib/config';

const APP_CREDIT = `Compartido desde BibliaAPP · ${API_BASE_URL}`;

/** Envuelve Share.share ignorando la cancelación del usuario. */
export async function safeShare(content: { title?: string; message: string; url?: string }) {
  try {
    await Share.share(content);
  } catch {
    // usuario canceló
  }
}

export function buildVerseShareMessage(options: {
  text: string;
  reference: string;
  abbr?: string;
  url?: string;
}): string {
  return [
    `"${options.text.trim()}"`,
    '',
    `— ${options.reference}${options.abbr ? ` (${options.abbr})` : ''}`,
    '',
    options.url ?? APP_CREDIT,
  ].join('\n');
}

/** Formato unico para compartir un versiculo desde cualquier seccion. */
export async function shareVerse(options: { text: string; reference: string; abbr?: string; url?: string }) {
  await safeShare({
    title: options.reference,
    message: buildVerseShareMessage(options),
    url: options.url,
  });
}

/** Comparte una nota como texto plano con credito de la app. */
export async function shareNote(options: { title: string; body: string }) {
  const title = options.title.trim() || 'Nota';
  const body = options.body.trim();
  await safeShare({
    title,
    message: [title, ...(body ? ['', body] : []), '', APP_CREDIT].join('\n'),
  });
}

/** Comparte una entrada del diario espiritual. */
export async function shareDevotional(options: {
  title: string;
  verseRef?: string | null;
  reflection?: string;
  application?: string;
}) {
  const lines: string[] = [options.title.trim() || 'Devocional'];
  if (options.verseRef) lines.push('', `Pasaje: ${options.verseRef}`);
  if (options.reflection?.trim()) lines.push('', options.reflection.trim());
  if (options.application?.trim()) lines.push('', `Aplicación: ${options.application.trim()}`);
  lines.push('', APP_CREDIT);
  await safeShare({ title: options.title, message: lines.join('\n') });
}
