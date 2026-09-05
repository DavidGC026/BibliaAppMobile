import * as api from '@/lib/api';
import { getIsOnline } from '@/lib/network';
import { readStudyChapter, saveStudyChapter } from '@/lib/offline/chapterStudyStore';
import { STUDY_LABELS, validateStudyContent, type ChapterStudyKind, type StudyContent, type StudyPassage } from '@/lib/study';

const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface StudyChapterResult<K extends ChapterStudyKind> {
  content: StudyContent[K];
  source: 'local' | 'remote';
  offlineAvailable: boolean;
}

export async function fetchStudyChapter<K extends ChapterStudyKind>(kind: K, passage: StudyPassage): Promise<StudyContent[K]> {
  const content = kind === 'interlinear'
    ? (await api.getInterlinear(passage)).words
    : (await api.getCommentaries(passage)).commentaries;
  return validateStudyContent(kind, content, passage);
}

export async function repoGetStudyChapter<K extends ChapterStudyKind>(
  kind: K, passage: StudyPassage, refresh = false,
): Promise<StudyChapterResult<K>> {
  const cached = await readStudyChapter(kind, passage).catch(() => null);
  const fresh = cached && Date.now() - Date.parse(cached.savedAt) < CACHE_MAX_AGE_MS;
  if (cached && (!getIsOnline() || (!refresh && fresh && cached.content.length > 0))) {
    return { content: cached.content, source: 'local', offlineAvailable: true };
  }
  if (getIsOnline()) {
    try {
      const content = await fetchStudyChapter(kind, passage);
      // Un dispositivo sin espacio aún puede consultar los datos en línea.
      const offlineAvailable = await saveStudyChapter(kind, passage, content).then(() => true, () => false);
      return { content, source: 'remote', offlineAvailable };
    } catch (error) {
      const status = (error as { status?: number }).status;
      if (status === 401 || status === 403) throw error;
      if (!cached) throw error;
    }
  }
  if (cached) return { content: cached.content, source: 'local', offlineAvailable: true };
  throw new Error(`${STUDY_LABELS[kind]} sin descargar. Conéctate para consultar este capítulo o descarga el libro en Perfil → Descargas.`);
}
