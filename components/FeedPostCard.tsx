import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Card } from '@/components/ui/Card';
import { FeedContent } from '@/components/FeedContent';
import { useAppTheme } from '@/hooks/useAppTheme';
import * as api from '@/lib/api';
import type { FeedComment, FeedPost } from '@/lib/types';

interface FeedPostCardProps {
  post: FeedPost;
  onUpdate: (post: FeedPost) => void;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  } catch {
    return iso;
  }
}

export function FeedPostCard({ post, onUpdate }: FeedPostCardProps) {
  const { colors, radius } = useAppTheme();
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [busy, setBusy] = useState(false);

  const liked = !!post.is_liked;

  const toggleLike = async () => {
    setBusy(true);
    try {
      if (liked) {
        await api.unlikeFeedPost(post.id);
        onUpdate({
          ...post,
          is_liked: false,
          like_count: Math.max(0, post.like_count - 1),
        });
      } else {
        await api.likeFeedPost(post.id);
        onUpdate({
          ...post,
          is_liked: true,
          like_count: post.like_count + 1,
        });
      }
    } finally {
      setBusy(false);
    }
  };

  const loadComments = async () => {
    setLoadingComments(true);
    try {
      const { comments: list } = await api.getFeedComments(post.id);
      setComments(list.filter((c) => !c.is_deleted));
    } finally {
      setLoadingComments(false);
    }
  };

  const toggleComments = async () => {
    const next = !showComments;
    setShowComments(next);
    if (next && comments.length === 0) await loadComments();
  };

  const submitComment = async () => {
    const text = commentText.trim();
    if (!text) return;
    setBusy(true);
    try {
      await api.addFeedComment(post.id, text);
      setCommentText('');
      await loadComments();
      onUpdate({ ...post, comment_count: post.comment_count + 1 });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={styles.card}>
      <Text style={[styles.author, { color: colors.text }]}>
        {post.user_name}
        {post.user_username ? (
          <Text style={{ color: colors.textMuted }}> @{post.user_username}</Text>
        ) : null}
      </Text>

      {post.verse_ref ? (
        <View style={[styles.verseBox, { borderColor: colors.primary, backgroundColor: colors.primarySoft }]}>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>{post.verse_ref}</Text>
          {post.verse_text ? (
            <Text style={{ color: colors.text, fontStyle: 'italic', lineHeight: 22 }}>{post.verse_text}</Text>
          ) : null}
        </View>
      ) : null}

      <FeedContent content={post.content} />

      <View style={styles.actions}>
        <Pressable style={styles.actionBtn} disabled={busy} onPress={toggleLike}>
          <Text style={{ color: liked ? '#E11D48' : colors.textMuted, fontWeight: '600' }}>
            {liked ? '♥' : '♡'} {post.like_count || 'Me gusta'}
          </Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={toggleComments}>
          <Text style={{ color: showComments ? colors.primary : colors.textMuted, fontWeight: '600' }}>
            💬 {post.comment_count || 'Comentar'}
          </Text>
        </Pressable>
        <Text style={[styles.date, { color: colors.textMuted }]}>{formatDate(post.created_at)}</Text>
      </View>

      {showComments ? (
        <View style={[styles.comments, { borderTopColor: colors.border }]}>
          {loadingComments ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            comments.map((c) => (
              <View key={c.id} style={styles.comment}>
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>{c.user_name}</Text>
                <Text style={{ color: colors.text, lineHeight: 20 }}>{c.content}</Text>
              </View>
            ))
          )}
          <View style={styles.commentRow}>
            <TextInput
              style={[styles.commentInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              placeholder="Escribe un comentario…"
              placeholderTextColor={colors.textMuted}
              value={commentText}
              onChangeText={setCommentText}
            />
            <Pressable
              style={[styles.sendBtn, { backgroundColor: colors.primary, borderRadius: radius.lg, opacity: busy ? 0.6 : 1 }]}
              disabled={busy || !commentText.trim()}
              onPress={submitComment}
            >
              <Text style={{ color: '#FFF', fontWeight: '700' }}>→</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12, gap: 8, padding: 16 },
  author: { fontSize: 15, fontWeight: '700' },
  verseBox: { borderLeftWidth: 3, borderRadius: 8, padding: 10, gap: 4 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
  actionBtn: { paddingVertical: 4 },
  date: { fontSize: 12, marginLeft: 'auto' },
  comments: { borderTopWidth: 1, paddingTop: 12, gap: 10 },
  comment: { gap: 2 },
  commentRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  commentInput: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 15 },
  sendBtn: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
