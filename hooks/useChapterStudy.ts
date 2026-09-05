import { useCallback, useEffect, useState } from 'react';
import { useNetwork } from '@/context/NetworkContext';
import { repoGetStudyChapter, type StudyChapterResult } from '@/lib/studyRepository';
import type { ChapterStudyKind, StudyPassage } from '@/lib/study';

export function useChapterStudy<K extends ChapterStudyKind>(kind: K, passage: StudyPassage, enabled = true) {
  const { isOnline } = useNetwork();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ key: string; result?: StudyChapterResult<K>; error?: string } | null>(null);
  const { bibleId, bookId, chapter } = passage;
  const key = `${kind}:${bibleId}:${bookId}:${chapter}:${attempt}:${isOnline}`;
  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    setState(null);
    repoGetStudyChapter(kind, { bibleId, bookId, chapter }, attempt > 0)
      .then((result) => { if (active) setState({ key, result }); })
      .catch((error) => {
        if (active) setState({ key, error: error instanceof Error ? error.message : 'No se pudo cargar el estudio.' });
      });
    return () => { active = false; };
  }, [kind, bibleId, bookId, chapter, attempt, key, enabled]);

  const current = state?.key === key ? state : null;
  return { result: current?.result, error: current?.error, loading: enabled && !current, retry };
}
