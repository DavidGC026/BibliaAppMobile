import { getIsOnline } from '@/lib/network';
import { readStudyChapter, saveStudyChapter } from '@/lib/offline/chapterStudyStore';
import { fetchStudyChapter } from '@/lib/studyRepository';
import { STUDY_LABELS, studyBibleId, type ChapterStudyKind } from '@/lib/study';
import type { Book } from '@/lib/types';

export interface StudyBookDownload extends Book {
  bibleId: number;
  refresh?: boolean;
}

export function studyBookTargetId(kind: ChapterStudyKind, bibleId: number, bookId: number): string {
  return `${studyBibleId(kind, bibleId)}:${bookId}`;
}

export async function downloadStudyBook(
  kind: ChapterStudyKind, book: StudyBookDownload,
  onProgress?: (progress: { phase: string; current: number; total: number }) => void,
): Promise<void> {
  if (!Number.isInteger(book.bookId) || book.bookId < 1 || book.bookId > 66 ||
      !Number.isInteger(book.chapters) || book.chapters < 1 || book.chapters > 150 ||
      !Number.isInteger(book.bibleId) || book.bibleId < 0) {
    throw new Error('El libro de la descarga no es válido.');
  }
  const phase = `${STUDY_LABELS[kind]} · ${book.bookName}`;
  onProgress?.({ phase, current: 0, total: book.chapters });
  for (let chapter = 1; chapter <= book.chapters; chapter += 1) {
    const passage = { bibleId: book.bibleId, bookId: book.bookId, chapter };
    const cached = await readStudyChapter(kind, passage);
    // Al reanudar se conservan los capítulos terminados. Actualizar vuelve a
    // pedirlos, incluyendo los que aún no tenían contenido publicado.
    if (!cached || book.refresh) {
      if (!getIsOnline()) throw new Error('Sin conexión. Puedes reanudar la descarga cuando vuelva la red.');
      const content = await fetchStudyChapter(kind, passage);
      await saveStudyChapter(kind, passage, content);
    }
    onProgress?.({ phase, current: chapter, total: book.chapters });
  }
}
