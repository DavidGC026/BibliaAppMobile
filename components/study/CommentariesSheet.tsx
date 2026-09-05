import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { AppIcon } from '@/components/ui/AppIcon';
import { useChapterStudy } from '@/hooks/useChapterStudy';
import { parseCommentaryBlocks, parseCommentaryInline } from '@/lib/commentaryText';
import { commentariesForVerse, type Commentary, type StudyPassage } from '@/lib/study';
import { commentaryPreview, commentaryRangeLabel, studyVerseReference } from '@/lib/studyPresentation';
import type { Verse } from '@/lib/types';
import { StudyPassageQuote, StudyVersePicker } from './StudyPassage';
import { StudyButton, StudyFeedback, StudyFooter, StudySheet, studyReadingFont, studyStyles, type StudyPalette } from './StudySheet';
import { readableStudyPalette } from './studyPalette';

export function CommentariesSheet({ passage, bookName, initialVerse, palette: readerPalette, onClose, verses = [], bibleAbbr, fontSize = 19 }: {
  passage: StudyPassage; bookName: string; initialVerse: number | null; palette: StudyPalette; onClose: () => void;
  verses?: Verse[]; bibleAbbr?: string; fontSize?: number;
}) {
  const [verseFilter, setVerseFilter] = useState(initialVerse);
  const [author, setAuthor] = useState<string | null>(null);
  const [activeCommentary, setActiveCommentary] = useState<Commentary | null>(null);
  const [choosingVerse, setChoosingVerse] = useState(false);
  const palette = useMemo(() => readableStudyPalette(readerPalette), [readerPalette]);
  const { result, error, loading, retry } = useChapterStudy('commentaries', passage);
  const authors = useMemo(() => [...new Set(result?.content.map((item) => item.author) ?? [])], [result?.content]);
  const visible = useMemo(() => commentariesForVerse(result?.content ?? [], verseFilter)
    .filter((item) => author === null || item.author === author), [result?.content, verseFilter, author]);
  const verseNumbers = useMemo(() => verses.map((verse) => verse.verse).filter((verse) => verse > 0), [verses]);
  const reference = `${bookName} ${passage.chapter}`;
  const showList = !activeCommentary && !choosingVerse;
  const feedback = { loading, error, offlineAvailable: result?.offlineAvailable, hasContent: Boolean(result?.content.length), palette, onRetry: retry };
  const selectedText = verses.find((verse) => verse.verse === verseFilter)?.text;

  return <StudySheet title={choosingVerse ? 'Elegir versículo' : activeCommentary ? 'Leer comentario' : 'Comentarios'}
    reference={reference} palette={palette} onClose={onClose} backLabel="Volver"
    onBack={activeCommentary ? () => setActiveCommentary(null) : choosingVerse ? () => setChoosingVerse(false) : undefined}>
    {activeCommentary ? <CommentaryArticle commentary={activeCommentary} reference={reference} verseNumbers={verseNumbers}
      verseFilter={verseFilter} selectedText={selectedText} bibleAbbr={bibleAbbr} palette={palette} fontSize={fontSize}
      onBack={() => setActiveCommentary(null)} onClose={onClose} /> : null}
    {choosingVerse ? <StudyVersePicker verse={verseFilter ?? 1} numbers={verseNumbers} palette={palette}
      onChange={(verse) => { setVerseFilter(verse); setChoosingVerse(false); }} /> : null}
    <FlatList data={visible} keyExtractor={(item) => String(item.id)} initialNumToRender={6} windowSize={5}
      style={{ flex: 1, display: showList ? 'flex' : 'none' }} accessibilityElementsHidden={!showList}
      importantForAccessibility={showList ? 'auto' : 'no-hide-descendants'} contentContainerStyle={studyStyles.content}
      ListHeaderComponent={<View style={{ gap: 20 }}>
        <View style={{ gap: 8 }}>
          <Text accessibilityRole="header" style={{ color: palette.text, fontSize: 22, fontWeight: '800' }}>Para entender el pasaje</Text>
          <Text style={{ color: palette.muted, fontSize: 15, lineHeight: 24 }}>Elige un comentario para leer la explicación de su autor.</Text>
        </View>
        <View style={{ gap: 8 }}>
          <Text style={{ color: palette.text, fontSize: 14, fontWeight: '600' }}>Consultar</Text>
          <View style={studyStyles.row}>
            <StudyButton label="Capítulo completo" selected={verseFilter === null} onPress={() => setVerseFilter(null)} palette={palette} />
            {verseNumbers.length ? <StudyButton label={verseFilter === null ? 'Elegir versículo' : `Versículo ${verseFilter}`}
              selected={verseFilter !== null} icon="chevron-down" onPress={() => setChoosingVerse(true)} palette={palette} /> : null}
          </View>
        </View>
        {verseFilter !== null ? <StudyPassageQuote reference={studyVerseReference(reference, verseFilter)}
          text={selectedText} bibleAbbr={bibleAbbr} palette={palette} fontSize={fontSize} /> : null}
        {authors.length > 1 ? <View style={{ gap: 8 }}>
          <Text style={{ color: palette.text, fontSize: 14, fontWeight: '600' }}>Autor</Text>
          <View style={studyStyles.row}>
            <StudyButton label="Todos" selected={author === null} onPress={() => setAuthor(null)} palette={palette} />
            {authors.map((name) => <StudyButton key={name} label={name} selected={author === name} onPress={() => setAuthor(name)} palette={palette} />)}
          </View>
        </View> : null}
        {loading || error ? <StudyFeedback {...feedback} /> : <Text style={{ color: palette.muted, fontSize: 13, lineHeight: 20 }}>
          {visible.length === 1 ? '1 comentario disponible' : `${visible.length} comentarios disponibles`}
        </Text>}
      </View>}
      ListEmptyComponent={!loading && !error ? <View style={[studyStyles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <AppIcon name="notes" color={palette.muted} size={28} />
        <Text style={{ color: palette.text, fontSize: 18, fontWeight: '700' }}>Todavía no hay comentarios aquí</Text>
        <Text style={{ color: palette.muted, fontSize: 15, lineHeight: 24 }}>
          {author ? 'Este autor no tiene comentarios para el pasaje elegido.' : verseFilter !== null
            ? 'No se ha publicado una explicación que incluya este versículo.' : 'Este capítulo aún no tiene una explicación publicada.'}
        </Text>
        {verseFilter !== null || author !== null ? <StudyButton label="Ver todos los comentarios del capítulo"
          onPress={() => { setVerseFilter(null); setAuthor(null); }} palette={palette} /> : null}
      </View> : null}
      renderItem={({ item }) => <CommentaryCard commentary={item} range={commentaryRangeLabel(item, verseNumbers)} reference={reference}
        palette={palette} onPress={() => setActiveCommentary(item)} />}
      ListFooterComponent={<StudyFooter palette={palette} onClose={onClose}>
        {!loading && !error ? <StudyFeedback {...feedback} /> : null}
      </StudyFooter>} />
  </StudySheet>;
}

function CommentaryCard({ commentary, range, reference, palette, onPress }: {
  commentary: Commentary; range: string; reference: string; palette: StudyPalette; onPress: () => void;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`Leer comentario de ${commentary.author}. ${reference}. ${range}.`}
    onPress={onPress} style={({ pressed }) => [studyStyles.card, { padding: 20, gap: 16, borderColor: palette.border,
      backgroundColor: palette.card, opacity: pressed ? 0.65 : 1 }]}>
    <View style={{ gap: 8 }}>
      <Text style={{ color: palette.text, fontSize: 22, lineHeight: 30, fontWeight: '800' }}>{commentary.author}</Text>
      <Text style={{ color: palette.muted, fontSize: 14, lineHeight: 22 }}>{reference} · {range}</Text>
    </View>
    <Text numberOfLines={3} style={{ color: palette.text, fontFamily: studyReadingFont, fontSize: 17, lineHeight: 28 }}>{commentaryPreview(commentary.contentMd)}</Text>
    <View style={[studyStyles.row, { justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderColor: palette.border }]}>
      <Text style={{ color: palette.text, fontSize: 15, fontWeight: '700' }}>Leer comentario</Text>
      <AppIcon name="arrow-right" color={palette.text} size={20} />
    </View>
  </Pressable>;
}

function CommentaryArticle({ commentary, reference, verseNumbers, verseFilter, selectedText, bibleAbbr, palette, fontSize, onBack, onClose }: {
  commentary: Commentary; reference: string; verseNumbers: number[]; verseFilter: number | null; selectedText?: string;
  bibleAbbr?: string; palette: StudyPalette; fontSize: number; onBack: () => void; onClose: () => void;
}) {
  const [passageOpen, setPassageOpen] = useState(false);
  const blocks = useMemo(() => parseCommentaryBlocks(commentary.contentMd), [commentary.contentMd]);
  const range = commentaryRangeLabel(commentary, verseNumbers);
  return <FlatList data={blocks} keyExtractor={(_, index) => String(index)} initialNumToRender={5} windowSize={5}
    contentContainerStyle={[studyStyles.content, { gap: 24 }]}
    ListHeaderComponent={<View style={{ gap: 16, paddingBottom: 8 }}>
      <Text style={{ color: palette.muted, fontSize: 13, lineHeight: 20 }}>Comentario bíblico · {range}</Text>
      <Text accessibilityRole="header" style={{ color: palette.text, fontSize: 28, lineHeight: 36, fontWeight: '800' }}>{commentary.author}</Text>
      {verseFilter !== null ? <Text style={{ color: palette.muted, fontSize: 14, lineHeight: 23 }}>
        {range === `Versículo ${verseFilter}` ? `Esta explicación corresponde al versículo ${verseFilter}.`
          : `Esta explicación abarca ${range === 'Todo el capítulo' ? 'todo el capítulo' : `los ${range.toLocaleLowerCase('es')}`} e incluye el versículo ${verseFilter}.`}
      </Text> : null}
      {selectedText && verseFilter !== null ? <View style={{ gap: 12 }}>
        <StudyButton label={passageOpen ? 'Ocultar texto bíblico' : 'Ver texto bíblico'} icon={passageOpen ? 'chevron-up' : 'bible'}
          expanded={passageOpen} quiet palette={palette} onPress={() => setPassageOpen((open) => !open)} />
        {passageOpen ? <StudyPassageQuote reference={studyVerseReference(reference, verseFilter)} text={selectedText}
          bibleAbbr={bibleAbbr} palette={palette} fontSize={fontSize} /> : null}
      </View> : null}
      <View style={{ height: 2, width: 48, backgroundColor: palette.accent }} />
    </View>}
    renderItem={({ item }) => <Text selectable accessibilityRole={item.kind === 'heading' ? 'header' : undefined}
      style={{ color: palette.text, fontFamily: studyReadingFont,
        fontSize: item.kind === 'heading' ? fontSize + 3 : fontSize, lineHeight: Math.round(fontSize * 1.75),
        fontWeight: item.kind === 'heading' ? '700' : '400', paddingLeft: item.kind === 'quote' ? 16 : 0,
        borderLeftWidth: item.kind === 'quote' ? 3 : 0, borderColor: palette.accent }}>
      {parseCommentaryInline(item.text).map((span, index) => <Text key={index}
        style={{ fontWeight: span.style === 'bold' ? '700' : undefined, fontStyle: span.style === 'italic' ? 'italic' : undefined }}>{span.text}</Text>)}
    </Text>}
    ListFooterComponent={<View style={{ gap: 16, marginTop: 16 }}>
      <Text style={{ color: palette.muted, fontSize: 13, textAlign: 'center' }}>Fin del comentario</Text>
      <StudyButton label="Volver a los comentarios" icon="arrow-left" palette={palette} onPress={onBack} />
      <StudyFooter palette={palette} onClose={onClose} />
    </View>} />;
}
