'use no memo';

import { FlexWidget, ImageWidget, OverlapWidget, SvgWidget, TextWidget } from 'react-native-android-widget';

import { widgetBackgroundImageSize } from '@/lib/verseImageFormats';

function truncate(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

/** Small cross icon rendered via SVG */
const CROSS_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg>`;

/** App logo-like icon for branding */
const BOOK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`;

export function VerseOfDayWidget({
  reference,
  text,
  theme,
  backgroundImage,
  maxChars = 140,
  widgetWidth = 360,
  widgetHeight = 180,
}: {
  reference: string;
  text: string;
  theme?: string;
  backgroundImage?: string | null;
  maxChars?: number;
  widgetWidth?: number;
  widgetHeight?: number;
}) {
  const hasBg = Boolean(backgroundImage);
  const bgSize = widgetBackgroundImageSize(widgetWidth, widgetHeight);

  /* ── Header row: cross icon + theme label ── */
  const headerRow = theme ? (
    <FlexWidget
      style={{
        width: 'match_parent',
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
      }}
    >
      <SvgWidget
        svg={CROSS_SVG}
        style={{ width: 12, height: 12, marginRight: 6 }}
      />
      <TextWidget
        text={theme.toUpperCase()}
        style={{
          fontSize: 9,
          color: '#FBBF24',
          fontWeight: '700',
          letterSpacing: 1.2,
        }}
      />
    </FlexWidget>
  ) : null;

  /* ── Verse text ── */
  const verseText = (
    <TextWidget
      text={`"${truncate(text, maxChars)}"`}
      style={{
        fontSize: 14,
        color: '#FAFAF9',
        fontStyle: 'italic',
        fontWeight: '500',
      }}
      maxLines={4}
      truncate="END"
    />
  );

  /* ── Footer row: reference + branding icon ── */
  const footerRow = (
    <FlexWidget
      style={{
        width: 'match_parent',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 8,
      }}
    >
      <TextWidget
        text={`— ${reference}`}
        style={{
          fontSize: 11,
          color: '#D6D3D1',
          fontWeight: '700',
          letterSpacing: 0.3,
        }}
      />
      <SvgWidget
        svg={BOOK_SVG}
        style={{ width: 16, height: 16 }}
      />
    </FlexWidget>
  );

  /* ── Text content layer ── */
  const textLayer = (
    <FlexWidget
      style={{
        width: 'match_parent',
        height: 'match_parent',
        paddingHorizontal: 18,
        paddingVertical: 14,
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      {headerRow}
      {verseText}
      {footerRow}
    </FlexWidget>
  );

  /* ── Gradient overlay for readability ── */
  const gradientOverlay = hasBg ? (
    <FlexWidget
      style={{
        width: 'match_parent',
        height: 'match_parent',
        backgroundGradient: {
          from: 'rgba(0, 0, 0, 0.65)',
          to: 'rgba(0, 0, 0, 0.30)',
          orientation: 'LEFT_RIGHT',
        },
      }}
    />
  ) : null;

  /* ── Background layer ── */
  const backgroundLayer = hasBg ? (
    <ImageWidget
      image={backgroundImage as `data:image${string}` | `https:${string}` | `http:${string}`}
      imageWidth={bgSize.imageWidth}
      imageHeight={bgSize.imageHeight}
      style={{
        width: 'match_parent',
        height: 'match_parent',
        backgroundColor: '#1c1917',
      }}
      radius={16}
    />
  ) : (
    <FlexWidget
      style={{
        width: 'match_parent',
        height: 'match_parent',
        backgroundGradient: {
          from: '#1c1917',
          to: '#292524',
          orientation: 'TL_BR',
        },
      }}
    />
  );

  /* ── Decorative left accent bar ── */
  const accentBar = (
    <FlexWidget
      style={{
        width: 3,
        height: 'match_parent',
        backgroundGradient: {
          from: '#FBBF24',
          to: '#F59E0B',
          orientation: 'TOP_BOTTOM',
        },
        borderTopLeftRadius: 16,
        borderBottomLeftRadius: 16,
      }}
    />
  );

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        borderRadius: 16,
        overflow: 'hidden',
      }}
      accessibilityLabel={`Versículo del día: ${reference}`}
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'bibliaapp://bible' }}
    >
      <OverlapWidget style={{ width: 'match_parent', height: 'match_parent', overflow: 'hidden' }}>
        {backgroundLayer}
        {gradientOverlay}
        {!hasBg ? (
          <FlexWidget
            style={{
              width: 'match_parent',
              height: 'match_parent',
              flexDirection: 'row',
            }}
          >
            {accentBar}
            {textLayer}
          </FlexWidget>
        ) : (
          textLayer
        )}
      </OverlapWidget>
    </FlexWidget>
  );
}
