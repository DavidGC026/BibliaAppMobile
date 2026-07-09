export interface User {
  id: number;
  name: string;
  email: string;
  username: string | null;
  role: string;
  allowedSections: string | string[] | null;
  streakCount: number;
}

export interface BibleVersion {
  bibleId: number;
  abbr: string;
  name: string;
}

export interface Book {
  bookId: number;
  bookName: string;
  chapters: number;
}

export interface Verse {
  id: number;
  bookId: number;
  bookName: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface VerseHighlight {
  verse: number;
  color: string;
}

export interface VerseNoteLink {
  id: number;
  bookId: number;
  chapter: number;
  verse: number;
  noteContent?: string;
  createdAt?: string;
}

export interface ReadingPlan {
  id: number;
  name: string;
  description: string;
  chaptersData: string;
  durationDays: number;
}

export interface UserReadingPlan extends ReadingPlan {
  planId: number;
  progress: string;
  startedAt: string;
}

export interface VerseOfDay {
  theme: string;
  reference: string;
  text: string;
  idBook: number;
  chapter: number;
  verse_start: number;
  verse_end: number;
  idBible: number;
  backgroundImage?: string | null;
}

export interface FeedPost {
  id: number;
  content: string;
  created_at: string;
  user_name: string;
  user_username: string | null;
  like_count: number;
  comment_count: number;
  is_liked?: boolean | number;
  verse_ref?: string | null;
  verse_text?: string | null;
}

export interface FeedComment {
  id: number;
  post_id: number;
  parent_id: number | null;
  user_id: number | null;
  user_name: string;
  user_username: string | null;
  content: string;
  created_at: string;
  is_deleted: number;
}

export interface SearchResult {
  verses: Verse[];
  total: number;
  isReference?: boolean;
}

export interface ChurchEvent {
  id: number;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  location: string | null;
  category?: string;
  creator_name: string;
  going_count?: number;
  my_rsvp?: string | null;
  source: 'church' | 'group';
  group_name?: string;
  group_id?: number;
}

export interface CrossReference {
  book_name: string;
  book_id: number;
  chapter: number;
  verse: number;
  text: string;
  votos: number;
}

export interface UnsplashImage {
  id: string;
  url: string;
  thumb: string;
  author: string;
  authorUrl: string;
}

export interface StrongEntry {
  strongCode: string;
  lemma: string;
  transliteration: string;
  definition: string;
}

export interface DictionaryInfo {
  slug: string;
  name: string;
  language: string | null;
  entryCount: number;
}

export interface GroupSummary {
  id: number;
  name: string;
  description: string;
  role: string;
  member_count: number;
  cover_image: string | null;
  avatar_image: string | null;
  invite_code?: string;
}

export interface GroupPrayer {
  id: number;
  title: string;
  description: string;
  status: string;
  user_name: string;
  user_username: string | null;
  intercessor_count: number;
  is_interceding: number;
  created_at: string;
}

export interface GroupEvent {
  id: number;
  group_id: number;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  location: string | null;
  creator_name: string;
}

export interface GroupPost {
  id: number;
  content: string;
  created_at: string;
  user_name: string;
  user_username: string | null;
}

export interface AppNotification {
  id: number;
  type: string;
  post_id: number | null;
  comment_id: number | null;
  read_at: string | null;
  created_at: string;
  actor_name: string;
  actor_username: string | null;
  post_preview: string | null;
  event_title: string | null;
}

export interface Notebook {
  id: number;
  name: string;
  coverImage?: string | null;
  createdAt: string;
}

export interface NotebookNote {
  id: number;
  notebookId: number;
  title: string;
  content: string;
  tags?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiError {
  error: string;
  code?: string;
  email?: string;
}

export interface BookStat {
  book_id: number;
  book_name: string;
  total_chapters: number;
}

export interface HeatmapDay {
  date: string;
  total_chapters: number;
}

export interface ProgressBook {
  book_id: number;
  book_name: string;
  total_chapters: number;
}

export interface FeedAnnouncement {
  id: number;
  content: string;
  user_name: string;
  created_at: string;
}

export interface DevotionalContent {
  reflection: string;
  application: string;
  planId?: number;
  planDay?: number;
}

export interface Devotional {
  id: number;
  title: string;
  emotion?: string | null;
  verseRef?: string | null;
  content?: DevotionalContent | string;
  createdAt: string;
}

export interface ExternalBook {
  id: number;
  title: string;
  author: string;
  coverImage?: string | null;
  status?: string;
  createdAt: string;
}

export interface BookLog {
  id: number;
  title?: string | null;
  pagesRead?: string | null;
  chapter?: string | null;
  reflection?: string | null;
  createdAt: string;
}

export interface Favorite {
  id: number;
  bible_id: number;
  book_id: number;
  book_name: string;
  chapter: number;
  verse: number;
  verse_text: string;
  created_at: string;
}

export interface HighlightItem {
  id: number;
  book_id: number;
  chapter: number;
  verse: number;
  color: string;
  created_at: string;
  book_name: string;
  text: string;
  bible_id: number;
  bible_abbr?: string;
}

export const HIGHLIGHT_COLORS = ['yellow', 'green', 'blue', 'orange', 'pink'] as const;
export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number];

/** @deprecated Usar highlightColors.ts (tint + borde como la web) */
export const HIGHLIGHT_BG: Record<string, string> = {
  yellow: 'rgba(234, 179, 8, 0.22)',
  green: 'rgba(16, 185, 129, 0.22)',
  blue: 'rgba(14, 165, 233, 0.22)',
  orange: 'rgba(249, 115, 22, 0.22)',
  pink: 'rgba(236, 72, 153, 0.22)',
};
