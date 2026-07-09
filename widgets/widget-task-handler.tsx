import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { API_BASE_URL } from '../lib/config';
import { todayLocalStr } from '../lib/readingToday';
import {
  cacheVerseForWidget,
  getCachedVerseForWidget,
  resolveWidgetImageUri,
} from '../lib/verseWidgetCache';
import type { VerseOfDay } from '../lib/types';
import { VerseOfDayWidget } from './VerseOfDayWidget';

type WidgetVerse = {
  reference: string;
  text: string;
  theme: string;
  backgroundImage: string | null;
};

async function toWidgetVerse(verse: VerseOfDay): Promise<WidgetVerse> {
  const backgroundImage = await resolveWidgetImageUri(verse);
  return {
    reference: verse.reference,
    text: verse.text,
    theme: verse.theme ?? '',
    backgroundImage,
  };
}

export async function loadVerseForWidget(): Promise<WidgetVerse> {
  const cached = await getCachedVerseForWidget();
  if (cached && cached.cachedDate === todayLocalStr()) {
    return toWidgetVerse(cached);
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/verse-of-the-day`);
    if (!res.ok) throw new Error('fetch failed');
    const data = (await res.json()) as VerseOfDay;
    await cacheVerseForWidget(data);
    return toWidgetVerse(data);
  } catch {
    if (cached) return toWidgetVerse(cached);
    return {
      reference: 'Versículo del día',
      text: 'Abre BibliaAPP para cargar el versículo de hoy.',
      theme: '',
      backgroundImage: null,
    };
  }
}

/** Determine max text chars based on widget width */
export function maxCharsForWidth(widgetWidth: number): number {
  if (widgetWidth >= 400) return 200;
  if (widgetWidth >= 300) return 160;
  return 120;
}

function renderVerse(props: WidgetTaskHandlerProps, verse: WidgetVerse) {
  const { width, height } = props.widgetInfo;
  const maxChars = maxCharsForWidth(width);

  props.renderWidget(
    <VerseOfDayWidget
      reference={verse.reference}
      text={verse.text}
      theme={verse.theme}
      backgroundImage={verse.backgroundImage}
      maxChars={maxChars}
      widgetWidth={width}
      widgetHeight={height}
    />,
  );
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const verse = await loadVerseForWidget();
      renderVerse(props, verse);
      break;
    }
    case 'WIDGET_DELETED':
      break;
    default:
      break;
  }
}
