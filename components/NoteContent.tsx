import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';

import { useThemeColors } from '@/hooks/useThemeColors';
import { getEditorHtml } from '@/lib/editorHtml';
import { getDownloadedFonts } from '@/lib/fontManager';

interface NoteContentProps {
  content: string;
}

// Convert older Markdown formatting into HTML for backward compatibility
function convertMarkdownToHtml(text: string): string {
  if (!text) return '';
  
  // If it already contains common HTML tags, assume it is rich text
  if (
    text.includes('<p>') ||
    text.includes('<div>') ||
    text.includes('<blockquote>') ||
    text.includes('<table>') ||
    text.includes('<span>') ||
    text.includes('<b>') ||
    text.includes('<strong>')
  ) {
    return text;
  }

  const lines = text.split('\n');
  let inQuote = false;
  let html = '';

  lines.forEach((line) => {
    const cleanLine = line.trim();

    if (cleanLine.startsWith('>')) {
      if (!inQuote) {
        html += '<blockquote>';
        inQuote = true;
      }
      const quoteText = cleanLine.substring(1).trim()
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      html += quoteText + '<br/>';
    } else {
      if (inQuote) {
        html += '</blockquote>';
        inQuote = false;
      }

      if (cleanLine === '') {
        html += '<br/>';
      } else {
        const paragraphText = cleanLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html += `<p>${paragraphText}</p>`;
      }
    }
  });

  if (inQuote) {
    html += '</blockquote>';
  }

  return html;
}

export function NoteContent({ content }: NoteContentProps) {
  const colors = useThemeColors();
  const [webViewHeight, setWebViewHeight] = useState(150);
  const [base64Fonts, setBase64Fonts] = useState<Record<string, string>>({});
  const [fontsLoaded, setFontsLoaded] = useState(false);

  // Load custom fonts to render them offline inside WebView
  useEffect(() => {
    let active = true;
    const loadFontsBase64 = async () => {
      try {
        const downloaded = await getDownloadedFonts();
        const mappings: Record<string, string> = {};
        for (const font of downloaded) {
          const fileUri = `${FileSystem.documentDirectory}fonts/${font.id}.ttf`;
          const fileInfo = await FileSystem.getInfoAsync(fileUri);
          if (fileInfo.exists) {
            const b64 = await FileSystem.readAsStringAsync(fileUri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            mappings[font.id] = b64;
          }
        }
        if (active) {
          setBase64Fonts(mappings);
          setFontsLoaded(true);
        }
      } catch (e) {
        console.error('Error encoding fonts:', e);
        if (active) setFontsLoaded(true);
      }
    };
    loadFontsBase64();
    return () => {
      active = false;
    };
  }, []);

  if (!content || !content.trim()) {
    return <Text style={{ color: colors.textMuted }}>Sin contenido</Text>;
  }

  if (!fontsLoaded) {
    return <ActivityIndicator size="small" color={colors.primary} style={{ margin: 12 }} />;
  }

  const htmlContent = convertMarkdownToHtml(content);

  // Load read-only HTML format of the editor with base64 fonts injected
  const editorHtml = getEditorHtml(
    colors,
    htmlContent,
    'Default',
    base64Fonts,
    true // isReadOnly = true
  );

  const injectedJavaScript = `
    const updateHeight = () => {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'onHeightChange',
        height: document.documentElement.scrollHeight || document.body.scrollHeight
      }));
    };
    window.addEventListener('load', updateHeight);
    window.addEventListener('resize', updateHeight);
    setTimeout(updateHeight, 150);
    setTimeout(updateHeight, 500);
    setTimeout(updateHeight, 1500);
    true;
  `;

  const onMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'onHeightChange') {
        const height = Number(data.height);
        if (!Number.isNaN(height) && height > 0) {
          setWebViewHeight(height + 16); // Add small padding to prevent clipping
        }
      }
    } catch (e) {
      console.error('Error getting WebView height:', e);
    }
  };

  return (
    <View style={[styles.container, { height: webViewHeight }]}>
      <WebView
        originWhitelist={['*']}
        source={{ html: editorHtml }}
        injectedJavaScript={injectedJavaScript}
        onMessage={onMessage}
        scrollEnabled={false}
        style={styles.webview}
        containerStyle={styles.webviewContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
  },
  webview: {
    backgroundColor: 'transparent',
    opacity: 0.99, // workaround for WebView white flash bugs on older androids
  },
  webviewContainer: {
    backgroundColor: 'transparent',
  },
});
