import {
  downloadBible,
  downloadCrossReferences,
  downloadDictionary,
  type DownloadProgress,
  type StudyDownloadProgress,
} from '@/lib/repo';
import { getMeta, setMeta } from '@/lib/db';
import type { BibleVersion } from '@/lib/types';

export type OfflineDownloadKind = 'bible' | 'dictionary' | 'references';
export type OfflineDownloadStatus = 'queued' | 'running' | 'done' | 'error';

export type OfflineDownloadTask = {
  id: string;
  kind: OfflineDownloadKind;
  targetId: string;
  label: string;
  status: OfflineDownloadStatus;
  progress?: DownloadProgress | StudyDownloadProgress;
  error?: string;
  updatedAt: string;
};

type Listener = (tasks: OfflineDownloadTask[]) => void;

const QUEUE_META_KEY = 'offline_download_queue_v1';

let tasks: OfflineDownloadTask[] = [];
let listeners = new Set<Listener>();
let hydrated = false;
let hydrating: Promise<void> | null = null;
let running = false;

function now() {
  return new Date().toISOString();
}

function notify() {
  const snapshot = getOfflineDownloadSnapshot();
  listeners.forEach((listener) => listener(snapshot));
}

async function persistQueue() {
  const persistent = tasks.filter((task) => task.status === 'queued' || task.status === 'running' || task.status === 'error');
  await setMeta(
    QUEUE_META_KEY,
    JSON.stringify(
      persistent.map((task) => ({
        ...task,
        status: task.status === 'running' ? 'queued' : task.status,
      })),
    ),
  );
}

function upsertTask(next: OfflineDownloadTask) {
  const idx = tasks.findIndex((task) => task.id === next.id);
  if (idx >= 0) tasks[idx] = next;
  else tasks.push(next);
  notify();
  persistQueue().catch(() => {});
}

function taskId(kind: OfflineDownloadKind, targetId: string) {
  return `${kind}:${targetId}`;
}

export function getOfflineDownloadSnapshot() {
  return tasks.map((task) => ({ ...task, progress: task.progress ? { ...task.progress } : undefined }));
}

export function subscribeOfflineDownloads(listener: Listener) {
  listeners.add(listener);
  listener(getOfflineDownloadSnapshot());
  return () => {
    listeners.delete(listener);
  };
}

export async function hydrateOfflineDownloads() {
  if (hydrated) return;
  if (hydrating) return hydrating;
  hydrating = (async () => {
    try {
      const raw = await getMeta(QUEUE_META_KEY);
      const saved = raw ? JSON.parse(raw) : [];
      if (Array.isArray(saved)) {
        tasks = saved
          .filter((task) => task && typeof task.id === 'string')
          .map((task) => ({
            ...task,
            status: task.status === 'done' ? 'done' : task.status === 'error' ? 'error' : 'queued',
            updatedAt: task.updatedAt ?? now(),
          }));
      }
      hydrated = true;
      notify();
      runQueue().catch(() => {});
    } finally {
      hydrating = null;
    }
  })();
  return hydrating;
}

export async function enqueueBibleDownload(bible: BibleVersion) {
  await hydrateOfflineDownloads();
  const id = taskId('bible', String(bible.bibleId));
  const existing = tasks.find((task) => task.id === id && (task.status === 'queued' || task.status === 'running'));
  if (existing) return existing;
  const task: OfflineDownloadTask = {
    id,
    kind: 'bible',
    targetId: String(bible.bibleId),
    label: `${bible.abbr} - ${bible.name}`,
    status: 'queued',
    updatedAt: now(),
  };
  upsertTask(task);
  runQueue().catch(() => {});
  return task;
}

export async function enqueueStudyDownload(kind: Exclude<OfflineDownloadKind, 'bible'>) {
  await hydrateOfflineDownloads();
  const id = taskId(kind, 'default');
  const existing = tasks.find((task) => task.id === id && (task.status === 'queued' || task.status === 'running'));
  if (existing) return existing;
  const task: OfflineDownloadTask = {
    id,
    kind,
    targetId: 'default',
    label: kind === 'dictionary' ? 'Diccionario Strong' : 'Referencias cruzadas',
    status: 'queued',
    updatedAt: now(),
  };
  upsertTask(task);
  runQueue().catch(() => {});
  return task;
}

async function runQueue() {
  if (running) return;
  running = true;
  try {
    let next = tasks.find((task) => task.status === 'queued');
    while (next) {
      await runTask(next);
      next = tasks.find((task) => task.status === 'queued');
    }
  } finally {
    running = false;
  }
}

async function runTask(task: OfflineDownloadTask) {
  upsertTask({ ...task, status: 'running', error: undefined, updatedAt: now() });
  const onProgress = (progress: DownloadProgress | StudyDownloadProgress) => {
    const current = tasks.find((item) => item.id === task.id);
    if (!current) return;
    upsertTask({ ...current, progress, updatedAt: now() });
  };

  try {
    if (task.kind === 'bible') {
      await downloadBible(Number(task.targetId), onProgress);
    } else if (task.kind === 'dictionary') {
      await downloadDictionary('strong', onProgress);
    } else {
      await downloadCrossReferences(onProgress);
    }
    upsertTask({ ...task, status: 'done', progress: undefined, error: undefined, updatedAt: now() });
  } catch (err) {
    upsertTask({
      ...task,
      status: 'error',
      error: err instanceof Error ? err.message : 'No se pudo descargar',
      updatedAt: now(),
    });
  }
}
