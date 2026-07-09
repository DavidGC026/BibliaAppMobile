import { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { WidgetConfigurationScreenProps } from 'react-native-android-widget';

import { loadVerseForWidget, maxCharsForWidth } from './widget-task-handler';
import { VerseOfDayWidget } from './VerseOfDayWidget';

/** Sin opciones de usuario: carga el versículo y confirma al instante. */
export function WidgetConfigurationScreen({
  widgetInfo,
  setResult,
  renderWidget,
}: WidgetConfigurationScreenProps) {
  const doneRef = useRef(false);

  useEffect(() => {
    if (doneRef.current) return;
    doneRef.current = true;

    void (async () => {
      try {
        const verse = await loadVerseForWidget();
        renderWidget(
          <VerseOfDayWidget
            reference={verse.reference}
            text={verse.text}
            theme={verse.theme}
            backgroundImage={verse.backgroundImage}
            maxChars={maxCharsForWidth(widgetInfo.width)}
            widgetWidth={widgetInfo.width}
            widgetHeight={widgetInfo.height}
          />,
        );
        setResult('ok');
      } catch {
        setResult('cancel');
      }
    })();
  }, [widgetInfo.width, renderWidget, setResult]);

  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#9A6700" />
      <Text style={styles.text}>Preparando widget…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#FAF8F5' },
  text: { fontSize: 16, color: '#3D3835' },
});
