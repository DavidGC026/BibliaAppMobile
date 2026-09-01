import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/hooks/useAppTheme';
import * as api from '@/lib/api';
import { API_BASE_URL } from '@/lib/config';
import { buildTtsAudioUrl, cleanTtsText } from '@/lib/ttsText';
import type { TtsVoice } from '@/lib/types';

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

export function BibleAudioPlayer({
  verses,
  chapterLabel,
  startVerse,
  onActiveVerseChange,
  onClose,
}: {
  verses: Array<{ verse: number; text: string }>;
  chapterLabel: string;
  startVerse?: number;
  onActiveVerseChange?: (verse: number | null) => void;
  onClose?: () => void;
}) {
  const { colors, radius } = useAppTheme();
  const [engine, setEngine] = useState<'kokoro' | 'device'>('device');
  const [voices, setVoices] = useState<TtsVoice[]>([]);
  const [voiceId, setVoiceId] = useState('em_alex');
  const [rate, setRate] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [index, setIndex] = useState(0);
  const [loadingVoices, setLoadingVoices] = useState(true);
  const [busy, setBusy] = useState(false);

  const playerRef = useRef<AudioPlayer | null>(null);
  const indexRef = useRef(0);
  const playingRef = useRef(false);
  const engineRef = useRef(engine);
  const rateRef = useRef(rate);
  const voiceRef = useRef(voiceId);
  const versesRef = useRef(verses);

  indexRef.current = index;
  playingRef.current = playing;
  engineRef.current = engine;
  rateRef.current = rate;
  voiceRef.current = voiceId;
  versesRef.current = verses;

  useEffect(() => {
    const start = startVerse
      ? Math.max(0, verses.findIndex((v) => v.verse === startVerse))
      : 0;
    setIndex(start < 0 ? 0 : start);
  }, [startVerse, verses]);

  useEffect(() => {
    let cancelled = false;
    api
      .getTtsVoices()
      .then((data) => {
        if (cancelled) return;
        if (data.available && data.voices?.length) {
          setVoices(data.voices);
          setVoiceId(data.voices[0].id);
          setEngine('kokoro');
        } else {
          setEngine('device');
        }
      })
      .catch(() => {
        if (!cancelled) setEngine('device');
      })
      .finally(() => {
        if (!cancelled) setLoadingVoices(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true }).catch(() => {});
    const player = createAudioPlayer(null);
    playerRef.current = player;
    const sub = player.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish && playingRef.current && engineRef.current === 'kokoro') {
        playAt(indexRef.current + 1);
      }
    });
    return () => {
      sub.remove();
      player.remove();
      playerRef.current = null;
      Speech.stop().catch(() => {});
      onActiveVerseChange?.(null);
    };
    // El reproductor vive con el montaje del panel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopAll = async () => {
    playingRef.current = false;
    setPlaying(false);
    onActiveVerseChange?.(null);
    try {
      playerRef.current?.pause();
    } catch {}
    await Speech.stop().catch(() => {});
  };

  const playAt = (nextIndex: number) => {
    const list = versesRef.current;
    if (nextIndex < 0 || nextIndex >= list.length) {
      void stopAll();
      return;
    }
    setIndex(nextIndex);
    indexRef.current = nextIndex;
    const verse = list[nextIndex];
    onActiveVerseChange?.(verse.verse);
    playingRef.current = true;
    setPlaying(true);

    const text = cleanTtsText(verse.text);
    if (!text) {
      playAt(nextIndex + 1);
      return;
    }

    if (engineRef.current === 'kokoro') {
      const url = buildTtsAudioUrl(API_BASE_URL, {
        text,
        voice: voiceRef.current,
        speed: rateRef.current,
      });
      const player = playerRef.current;
      if (!player) return;
      setBusy(true);
      try {
        player.replace({ uri: url });
        player.setPlaybackRate(1);
        player.play();
      } finally {
        setBusy(false);
      }
      return;
    }

    Speech.speak(text, {
      language: 'es-ES',
      rate: Math.min(1.5, Math.max(0.5, rateRef.current * 0.9)),
      onDone: () => {
        if (playingRef.current) playAt(indexRef.current + 1);
      },
      onStopped: () => {},
      onError: () => {
        if (playingRef.current) playAt(indexRef.current + 1);
      },
    });
  };

  const toggle = async () => {
    if (playing) {
      await stopAll();
      return;
    }
    playAt(indexRef.current);
  };

  const verse = verses[index];

  return (
    <View style={[styles.wrap, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.xl }]}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.kicker, { color: colors.primary }]}>
            {engine === 'kokoro' ? 'Voz neuronal' : 'Voz del dispositivo'}
          </Text>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {chapterLabel}
            {verse ? ` · v. ${verse.verse}` : ''}
          </Text>
        </View>
        <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Cerrar audio">
          <Text style={{ color: colors.textMuted, fontSize: 20 }}>×</Text>
        </Pressable>
      </View>

      <View style={styles.controls}>
        <Pressable
          onPress={() => playAt(Math.max(0, index - 1))}
          style={[styles.iconBtn, { borderColor: colors.border }]}
          accessibilityLabel="Versículo anterior"
        >
          <Text style={{ color: colors.text, fontWeight: '700' }}>‹</Text>
        </Pressable>
        <Pressable
          onPress={() => void toggle()}
          style={[styles.playBtn, { backgroundColor: colors.primary }]}
          accessibilityLabel={playing ? 'Pausar' : 'Reproducir'}
        >
          {busy || loadingVoices ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={{ color: colors.primaryForeground, fontWeight: '800' }}>{playing ? 'Pausa' : 'Oír'}</Text>
          )}
        </Pressable>
        <Pressable
          onPress={() => playAt(index + 1)}
          style={[styles.iconBtn, { borderColor: colors.border }]}
          accessibilityLabel="Versículo siguiente"
        >
          <Text style={{ color: colors.text, fontWeight: '700' }}>›</Text>
        </Pressable>
      </View>

      <View style={styles.speeds}>
        {SPEEDS.map((s) => (
          <Pressable
            key={s}
            onPress={() => setRate(s)}
            style={[
              styles.speed,
              { borderColor: colors.border, backgroundColor: rate === s ? colors.primarySoft : 'transparent' },
            ]}
          >
            <Text style={{ color: rate === s ? colors.primary : colors.textMuted, fontWeight: '700', fontSize: 12 }}>
              {s}×
            </Text>
          </Pressable>
        ))}
      </View>

      {voices.length > 1 ? (
        <View style={styles.speeds}>
          {voices.map((v) => (
            <Pressable
              key={v.id}
              onPress={() => setVoiceId(v.id)}
              style={[
                styles.speed,
                { borderColor: colors.border, backgroundColor: voiceId === v.id ? colors.primarySoft : 'transparent' },
              ]}
            >
              <Text style={{ color: voiceId === v.id ? colors.primary : colors.textMuted, fontWeight: '700', fontSize: 12 }}>
                {v.name.split(' ')[0]}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: 12, marginBottom: 8, padding: 12, borderWidth: 1, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kicker: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  title: { fontSize: 15, fontWeight: '700' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  playBtn: { minWidth: 88, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  speeds: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  speed: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
});
