import { parseDevotionalContent } from '@/lib/devotional';
import type { Devotional } from '@/lib/types';

export interface PlanReadingItem {
  bookId: number;
  bookName: string;
  chapters: number[];
}

export interface PlanDay {
  day: number;
  readings: PlanReadingItem[];
}

/** Progreso guardado como JSON de días completados, p. ej. "[1,2]". */
export function parsePlanProgress(raw: string | null | undefined): number[] {
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed.filter((d) => typeof d === 'number') : [];
  } catch {
    return [];
  }
}

/** `chaptersData` es un JSON con la lista de días y lecturas del plan. */
export function parsePlanDays(raw: string | null | undefined): PlanDay[] {
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** "Génesis 1-3, Salmos 1" (mismo formato que la web). */
export function formatPlanReadings(readings: PlanReadingItem[]): string {
  return readings
    .map((r) => {
      const chs = r.chapters;
      if (chs.length === 1) return `${r.bookName} ${chs[0]}`;
      return `${r.bookName} ${chs[0]}-${chs[chs.length - 1]}`;
    })
    .join(', ');
}

/** Primer día sin completar; es la "lectura para hoy". */
export function nextPendingDay(days: PlanDay[], done: number[]): PlanDay | null {
  return days.find((d) => !done.includes(d.day)) ?? null;
}

/** Devocional escrito para un día concreto de un plan, si existe. */
export function findPlanDevotional(
  devotionals: Devotional[],
  planId: number,
  day: number,
): Devotional | null {
  return (
    devotionals.find((dev) => {
      const content = parseDevotionalContent(dev);
      return content.planId === planId && content.planDay === day;
    }) ?? null
  );
}
