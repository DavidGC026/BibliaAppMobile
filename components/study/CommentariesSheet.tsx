import { useMemo, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useChapterStudy } from '@/hooks/useChapterStudy';
import { parseCommentaryBlocks, parseCommentaryInline, type CommentaryBlock } from '@/lib/commentaryText';
import { commentariesForVerse, type Commentary, type StudyPassage } from '@/lib/study';
import { StudyButton, StudyFeedback, StudySheet, studyStyles, type StudyPalette } from './StudySheet';

type CommentaryRow =
  | { key: string; kind: 'author'; commentary: Commentary }
  | { key: string; kind: 'text'; block: CommentaryBlock };

export function CommentariesSheet({ passage, bookName, initialVerse, palette, onClose }: {
  passage: StudyPassage; bookName: string; initialVerse: number | null; palette: StudyPalette; onClose: () => void;
}) {
  const [verseFilter, setVerseFilter] = useState(initialVerse);
  const [author, setAuthor] = useState<string | null>(null);
  const { result, error, loading, retry } = useChapterStudy('commentaries', passage);
  const authors = useMemo(() => [...new Set(result?.content.map((item) => item.author) ?? [])], [result?.content]);
  const rows = useMemo(() => {
    const visible = commentariesForVerse(result?.content ?? [], verseFilter)
      .filter((item) => author === null || item.author === author);
    return visible.flatMap((commentary): CommentaryRow[] => [
      { key: `${commentary.id}:author`, kind: 'author', commentary },
      ...parseCommentaryBlocks(commentary.contentMd).map((block, index): CommentaryRow => (
        { key: `${commentary.id}:${index}`, kind: 'text', block }
      )),
    ]);
  }, [result?.content, verseFilter, author]);

  return (
    <StudySheet title="Comentarios" reference={`${bookName} ${passage.chapter}`} palette={palette} onClose={onClose}>
      <FlatList data={rows} keyExtractor={(row) => row.key} initialNumToRender={8} windowSize={5}
        contentContainerStyle={studyStyles.content}
        ListHeaderComponent={
          <View style={{ gap: 12 }}>
            <Text style={{ color: palette.muted, fontSize: 14, lineHeight: 21 }}>
              Cada comentario indica el rango que abarca. Algunos autores comentan el capítulo completo.
            </Text>
            {initialVerse !== null ? (
              <View style={studyStyles.row}>
                <StudyButton label={`Versículo ${initialVerse}`} selected={verseFilter !== null} onPress={() => setVerseFilter(initialVerse)} palette={palette} />
                <StudyButton label="Todo el capítulo" selected={verseFilter === null} onPress={() => setVerseFilter(null)} palette={palette} />
              </View>
            ) : null}
            {authors.length > 1 ? (
              <View style={studyStyles.row}>
                <StudyButton label="Todos los autores" selected={author === null} onPress={() => setAuthor(null)} palette={palette} />
                {authors.map((name) => <StudyButton key={name} label={name} selected={author === name} onPress={() => setAuthor(name)} palette={palette} />)}
              </View>
            ) : null}
            <StudyFeedback loading={loading} error={error} offlineAvailable={result?.offlineAvailable} hasContent={Boolean(result?.content.length)} palette={palette} onRetry={retry} />
          </View>
        }
        ListEmptyComponent={!loading && !error ? (
          <View style={{ gap: 12 }}>
            <Text style={{ color: palette.text, fontSize: 16, lineHeight: 24 }}>
              {verseFilter !== null ? 'No hay comentarios publicados que abarquen este versículo.' : 'No hay comentarios publicados para este capítulo.'}
            </Text>
            {verseFilter !== null ? <StudyButton label="Consultar todo el capítulo" onPress={() => setVerseFilter(null)} palette={palette} /> : null}
          </View>
        ) : null}
        renderItem={({ item }) => item.kind === 'author' ? (
          <View style={[studyStyles.card, { backgroundColor: palette.card, borderColor: palette.border, marginTop: 12 }]}>
            <Text accessibilityRole="header" style={{ color: palette.text, fontSize: 18, fontWeight: '800' }}>{item.commentary.author}</Text>
            <Text style={{ color: palette.muted, fontSize: 14 }}>
              {bookName} {passage.chapter}:{item.commentary.verseStart}{item.commentary.verseEnd !== item.commentary.verseStart ? `–${item.commentary.verseEnd}` : ''}
            </Text>
          </View>
        ) : (
          <Text selectable accessibilityRole={item.block.kind === 'heading' ? 'header' : undefined}
            style={{ color: palette.text, fontSize: item.block.kind === 'heading' ? 20 : 17, lineHeight: 28,
              fontWeight: item.block.kind === 'heading' ? '700' : '400',
              paddingLeft: item.block.kind === 'quote' ? 16 : 0,
              borderLeftWidth: item.block.kind === 'quote' ? 3 : 0, borderColor: palette.accent }}>
            {parseCommentaryInline(item.block.text).map((span, index) => (
              <Text key={index} style={{ fontWeight: span.style === 'bold' ? '700' : undefined, fontStyle: span.style === 'italic' ? 'italic' : undefined }}>{span.text}</Text>
            ))}
          </Text>
        )}
        ListFooterComponent={
          <View style={{ marginTop: 16, gap: 12 }}>
            <StudyButton label="Gestionar descargas" onPress={() => { onClose(); router.push('/downloads'); }} palette={palette} />
            <StudyButton label="Fuentes y atribuciones" onPress={() => { onClose(); router.push('/legal'); }} palette={palette} />
          </View>
        }
      />
    </StudySheet>
  );
}
