import { Platform } from 'react-native';

import { cacheVerseForWidget, resolveWidgetImageUri } from '@/lib/verseWidgetCache';
import type { VerseOfDay } from '@/lib/types';

/** Actualiza el widget Android con el versículo del día (no-op en iOS). */
export async function updateVerseWidget(verse: VerseOfDay): Promise<void> {
  if (Platform.OS !== 'android') return;
  await cacheVerseForWidget(verse);
  // ImageWidget solo soporta http/https/data:image – no file://
  const backgroundImage = await resolveWidgetImageUri(verse);
  try {
    const { requestWidgetUpdate } = await import('react-native-android-widget');
    const { VerseOfDayWidget } = await import('@/widgets/VerseOfDayWidget');
    const { maxCharsForWidth } = await import('@/widgets/widget-task-handler');
    await requestWidgetUpdate({
      widgetName: 'VerseOfDay',
      renderWidget: (info) =>
        VerseOfDayWidget({
          reference: verse.reference,
          text: verse.text,
          theme: verse.theme ?? '',
          backgroundImage,
          maxChars: maxCharsForWidth(info.width),
          widgetWidth: info.width,
          widgetHeight: info.height,
        }),
      widgetNotFound: () => {},
    });
  } catch {
    // Widget no instalado o dev client sin rebuild
  }
}
