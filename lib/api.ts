import { API_BASE_URL } from './config';
import type { GameVerse } from './games/engine';
import type { ContentEnvelope, EditorCatalog, GameContent } from './games/catalog';
import { verseQuery, type RoundSettings } from './games/round';
import type { InterlinearWord, Commentary, StudyPassage } from './study';
import type {
  AdminSectionGroup,
  ApiError,
  AppNotification,
  ManagedUser,
  BibleVersion,
  Book,
  FeedPost,
  GroupEvent,
  GroupPost,
  GroupPrayer,
  GroupSummary,
  ChurchEvent,
  FeedComment,
  Notebook,
  NotebookNote,
  ReadingPlan,
  User,
  UserReadingPlan,
  Verse,
  VerseHighlight,
  VerseNoteEntry,
  VerseNoteLink,
  VerseOfDay,
} from './types';

type TokenGetter = () => string | null;

let getToken: TokenGetter = () => null;

export function setApiTokenGetter(getter: TokenGetter) {
  getToken = getter;
}

export function getApiToken(): string | null {
  return getToken();
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err = data as ApiError;
    const error = new Error(err.error ?? `Error ${response.status}`) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return data as T;
}

// — Estudio por capítulo —
async function requestStudy<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    return await request<T>(path, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function getInterlinear(passage: StudyPassage) {
  return requestStudy<{ words: InterlinearWord[] }>(
    `/api/interlinear?book=${passage.bookId}&chapter=${passage.chapter}&rev=2`,
  );
}

export async function getCommentaries(passage: StudyPassage) {
  return requestStudy<{ commentaries: Commentary[] }>(
    `/api/commentaries?book=${passage.bookId}&chapter=${passage.chapter}&bible=${passage.bibleId}&lang=es`,
  );
}

// — Auth —
export async function login(email: string, password: string) {
  return request<{ success: boolean; user: User; token: string }>(
    '/api/auth/login',
    { method: 'POST', body: JSON.stringify({ email, password }) },
  );
}

export async function logout() {
  return request<{ success: boolean }>('/api/auth/logout', { method: 'POST' });
}

export async function getMe() {
  return request<{ user: User | null }>('/api/auth/me');
}

export async function acceptLegalTerms() {
  return request<{ success: boolean; legalAcceptedAt: string | null }>('/api/legal/accept', {
    method: 'POST',
    body: JSON.stringify({ accept: true }),
  });
}

// — Administración (solo usuarios con rol admin) —
export async function adminListUsers() {
  return request<{ users: ManagedUser[] }>('/api/admin/users');
}

export async function adminListSections() {
  return request<{ groups: AdminSectionGroup[]; defaults: string[] }>('/api/admin/sections');
}

export interface AdminUserPayload {
  name: string;
  email: string;
  password?: string;
  role: string;
  allowedSections: string[] | null;
}

export async function adminCreateUser(payload: AdminUserPayload) {
  return request<{ success: boolean; user: ManagedUser }>('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function adminUpdateUser(id: number, payload: AdminUserPayload) {
  return request<{ success: boolean }>(`/api/admin/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function adminDeleteUser(id: number) {
  return request<{ success: boolean }>(`/api/admin/users/${id}`, {
    method: 'DELETE',
  });
}

export async function forgotPassword(email: string) {
  return request<{ success: boolean; message: string }>('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

// — Biblia pública —
export async function getVerseOfDay(idBible?: number) {
  const query = idBible ? `?idBible=${idBible}` : '';
  return request<VerseOfDay>(`/api/verse-of-the-day${query}`);
}

export async function listBibles() {
  return request<{ bibles: BibleVersion[]; defaultBibleId: number | null }>('/api/bibles');
}

export const loadGameContent = () => requestStudy<ContentEnvelope>('/api/games/content');
export const loadEditorCatalog = () => requestStudy<EditorCatalog>('/api/admin/games/content');
export const saveEditorCatalog = (catalog: GameContent, revision: number) => requestStudy<{ catalog: GameContent; revision: number }>('/api/admin/games/content', { method: 'PUT', body: JSON.stringify({ catalog, revision }) });

export async function listGameVerses(bibleId?: number, settings?: RoundSettings) {
  return requestStudy<{ bible: BibleVersion; verses: GameVerse[] }>(
    verseQuery(settings, bibleId),
  );
}

export async function listBooks(bibleId: number) {
  return request<{ books: Book[] }>(`/api/books?bible=${bibleId}`);
}

export async function getVerses(bibleId: number, bookId: number, chapter: number) {
  return request<{ verses: Verse[] }>(
    `/api/verses?bible=${bibleId}&book=${bookId}&chapter=${chapter}`,
  );
}

export async function getVersesBulk(bibleId: number, bookId: number) {
  return request<{ verses: Verse[] }>(
    `/api/verses/bulk?bible=${bibleId}&book=${bookId}`,
  );
}

// — Resaltados y notas —
export async function getHighlights(bookId: number, chapter: number, bibleId: number) {
  return request<{ highlights: VerseHighlight[] }>(
    `/api/highlights?book=${bookId}&chapter=${chapter}&bibleId=${bibleId}`,
  );
}

export async function setHighlights(
  bookId: number,
  chapter: number,
  verses: number[],
  color: string | null,
  bibleId: number,
) {
  return request<{ ok: boolean }>('/api/highlights', {
    method: 'POST',
    body: JSON.stringify({ bookId, chapter, verses, color, bibleId }),
  });
}

export async function getAllHighlights() {
  return request<{ highlights: import('./types').HighlightItem[] }>('/api/highlights/all');
}

export async function getHighlightCategories() {
  return request<{ categories: Record<string, string> }>('/api/highlights/categories');
}

export async function saveHighlightCategory(color: string, name: string) {
  return request<{ ok: boolean }>('/api/highlights/categories', {
    method: 'POST',
    body: JSON.stringify({ color, name }),
  });
}

export async function listFavorites() {
  return request<{ favorites: import('./types').Favorite[] }>('/api/favorites');
}

export async function addFavorite(bibleId: number, bookId: number, chapter: number, verse: number) {
  return request<{ id: number; success: boolean }>('/api/favorites', {
    method: 'POST',
    body: JSON.stringify({ bibleId, bookId, chapter, verse }),
  });
}

export async function deleteFavorite(id: number) {
  return request<{ success: boolean }>(`/api/favorites?id=${id}`, { method: 'DELETE' });
}

export async function getChapterNotes(bookId: number, chapter: number) {
  return request<{ links: VerseNoteLink[] }>(
    `/api/links?book=${bookId}&chapter=${chapter}`,
  );
}

/**
 * Todas las notas de versículo del usuario, para la sección «Versículos».
 *
 * `bibleId` solo decide con qué traducción viene el texto del versículo: la
 * nota es del versículo, no de la versión.
 */
export async function getAllVerseNotes(bibleId?: number) {
  const query = bibleId ? `?bible=${bibleId}` : '';
  return request<{ links: VerseNoteEntry[] }>(`/api/links/all${query}`);
}

export async function saveVerseNote(
  bookId: number,
  chapter: number,
  verse: number,
  noteContent: string,
) {
  return request<{ id: number; success: boolean }>('/api/links', {
    method: 'POST',
    body: JSON.stringify({ bookId, chapter, verse, noteContent }),
  });
}

export async function deleteVerseNote(id: number) {
  return request<{ ok: boolean }>(`/api/links?id=${id}`, { method: 'DELETE' });
}

// — Planes de lectura —
export async function getReadingPlans() {
  return request<{ plans: ReadingPlan[]; userPlans: UserReadingPlan[] }>(
    '/api/plans',
  );
}

export async function joinReadingPlan(planId: number) {
  return request<{ success: boolean; message: string }>('/api/plans', {
    method: 'POST',
    body: JSON.stringify({ action: 'join', planId }),
  });
}

export async function updatePlanProgress(planId: number, progress: number[]) {
  return request<{ success: boolean; message: string }>('/api/plans', {
    method: 'POST',
    body: JSON.stringify({ action: 'progress', planId, progress }),
  });
}

// — Comunidad e iglesia —
export async function getFeed(type: 'following' | 'explore' = 'following') {
  return request<{ feed: FeedPost[] }>(`/api/feed?type=${type}`);
}

export async function listGroups() {
  return request<{ groups: GroupSummary[] }>('/api/groups');
}

export async function getGroup(id: number) {
  return request<{ group: GroupSummary }>(`/api/groups/${id}`);
}

export async function getGroupPrayers(groupId: number) {
  return request<{ prayers: GroupPrayer[] }>(`/api/groups/${groupId}/prayers`);
}

export async function joinPrayerIntercession(groupId: number, prayerId: number) {
  return request<{ success: boolean; intercessorCount?: number }>(
    `/api/groups/${groupId}/prayers`,
    { method: 'POST', body: JSON.stringify({ prayerId }) },
  );
}

export async function getGroupEvents(groupId: number) {
  return request<{ events: GroupEvent[] }>(`/api/groups/${groupId}/events`);
}

export async function getGroupPosts(groupId: number) {
  return request<{ posts: GroupPost[] }>(
    `/api/groups/${groupId}/activity?tab=posts`,
  );
}

export async function getChurchSettings() {
  return request<{
    settings: { church_name: string; church_logo_url: string | null };
  }>('/api/church-settings');
}

// — Notificaciones —
export async function getNotifications(unreadOnly = false) {
  const q = unreadOnly ? '?unread' : '';
  return request<{ notifications: AppNotification[]; unreadCount: number }>(
    `/api/notifications${q}`,
  );
}

export async function markNotificationsRead(ids: number[] | 'all') {
  const body = ids === 'all' ? { all: true } : { ids };
  return request<{ success: boolean }>('/api/notifications/read', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function registerPushToken(token: string, platform: string) {
  return request<{ success: boolean }>('/api/notifications/push-token', {
    method: 'POST',
    body: JSON.stringify({ token, platform }),
  });
}

export async function unregisterPushToken(token: string) {
  return request<{ success: boolean }>('/api/notifications/push-token', {
    method: 'DELETE',
    body: JSON.stringify({ token }),
  });
}

// — Cuadernos / libreta —
export async function listNotebooks() {
  return request<{ notebooks: Notebook[] }>('/api/notebooks');
}

export async function createNotebook(name: string, coverImage?: string | null) {
  return request<{ id: number; name: string; coverImage?: string | null }>(
    '/api/notebooks',
    { method: 'POST', body: JSON.stringify({ name, coverImage: coverImage ?? null }) },
  );
}

export async function updateNotebook(id: number, name: string, coverImage?: string | null) {
  return request<{ ok: boolean }>(`/api/notebooks/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name, coverImage: coverImage ?? null }),
  });
}

export async function deleteNotebook(id: number) {
  return request<{ ok: boolean }>(`/api/notebooks/${id}`, { method: 'DELETE' });
}

export async function listNotebookNotes(notebookId: number) {
  return request<{ notes: NotebookNote[] }>(`/api/notebooks/${notebookId}/notes`);
}

export async function createNotebookNote(notebookId: number, title: string, content: string) {
  return request<{ id: number; title: string; content: string }>(
    `/api/notebooks/${notebookId}/notes`,
    { method: 'POST', body: JSON.stringify({ title, content }) },
  );
}

export async function getNotebookNote(noteId: number) {
  return request<{ note: NotebookNote }>(`/api/notebooks/notes/${noteId}`);
}

export async function updateNotebookNote(
  noteId: number,
  title: string,
  content: string,
  tags?: string[],
  notebookId?: number,
) {
  return request<{ ok: boolean }>(`/api/notebooks/notes/${noteId}`, {
    method: 'PUT',
    body: JSON.stringify({ title, content, tags, notebookId }),
  });
}

export async function deleteNotebookNote(noteId: number) {
  return request<{ ok: boolean }>(`/api/notebooks/notes/${noteId}`, { method: 'DELETE' });
}

// — Búsqueda —
export async function searchVerses(bibleId: number, q: string) {
  return request<{ verses: import('./types').Verse[]; total: number; isReference?: boolean }>(
    `/api/search?bible=${bibleId}&q=${encodeURIComponent(q)}`,
  );
}

// — Referencias cruzadas —
export async function getCrossReferences(bibleId: number, bookId: number, chapter: number, verse: number) {
  return request<{ references: import('./types').CrossReference[] }>(
    `/api/references?bible=${bibleId}&bookId=${bookId}&chapter=${chapter}&verse=${verse}`,
  );
}

// — Diccionario Strong —
export async function listDictionaries() {
  return request<{ dictionaries: import('./types').DictionaryInfo[] }>('/api/dictionary?list');
}

export async function searchDictionary(opts: {
  dict?: string;
  q?: string;
  lang?: 'all' | 'greek' | 'hebrew';
  page?: number;
  browse?: boolean;
}) {
  const params = new URLSearchParams();
  params.set('dict', opts.dict ?? 'strong');
  if (opts.q) params.set('q', opts.q);
  if (opts.lang) params.set('lang', opts.lang);
  if (opts.page) params.set('page', String(opts.page));
  if (opts.browse) params.set('browse', '');
  return request<{
    entries: import('./types').StrongEntry[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>(`/api/dictionary?${params.toString()}`);
}

export async function getDictionaryEntry(code: string, dict = 'strong') {
  const params = new URLSearchParams({ dict, code: code.toUpperCase() });
  return request<{ entry: import('./types').StrongEntry | null }>(`/api/dictionary?${params.toString()}`);
}

// — Export para descarga offline (filas compactas paginadas) —
export async function exportDictionary(dict = 'strong', page = 1) {
  return request<{
    rows: [string, string | null, string | null, string | null][];
    total: number;
    page: number;
    totalPages: number;
  }>(`/api/dictionary?export&dict=${encodeURIComponent(dict)}&page=${page}`);
}

export async function exportCrossReferences(page = 1) {
  return request<{
    rows: [number, number, number][];
    total: number;
    page: number;
    totalPages: number;
  }>(`/api/references?export&page=${page}`);
}

// — Grupos: unirse por código —
export async function joinGroupByCode(inviteCode: string) {
  return request<{ success: boolean; groupId: number; alreadyMember?: boolean }>(
    '/api/groups/join',
    { method: 'POST', body: JSON.stringify({ inviteCode: inviteCode.trim() }) },
  );
}

// — Feed interactivo —
export async function createFeedPost(content: string) {
  return request<{ success: boolean; postId: number }>('/api/feed/posts', {
    method: 'POST',
    body: JSON.stringify({ type: 'custom', content, visibility: 'public' }),
  });
}

export async function likeFeedPost(postId: number) {
  return request<{ success: boolean }>(`/api/feed/posts/${postId}/like`, { method: 'POST' });
}

export async function unlikeFeedPost(postId: number) {
  return request<{ success: boolean }>(`/api/feed/posts/${postId}/like`, { method: 'DELETE' });
}

export async function getFeedComments(postId: number) {
  return request<{ comments: FeedComment[] }>(`/api/feed/posts/${postId}/comments`);
}

export async function addFeedComment(postId: number, content: string, parentId?: number) {
  return request<{ success: boolean; commentId: number }>(
    `/api/feed/posts/${postId}/comments`,
    { method: 'POST', body: JSON.stringify({ content, parentId: parentId ?? null }) },
  );
}

// — Calendario iglesia —
export async function listChurchEvents() {
  return request<{ events: ChurchEvent[] }>('/api/events');
}

export async function setEventRsvp(eventId: number, status: 'going' | 'maybe' | 'declined') {
  return request<{ success: boolean }>('/api/events', {
    method: 'POST',
    body: JSON.stringify({ action: 'rsvp', eventId, status }),
  });
}

export async function createChurchEvent(event: {
  title: string;
  description: string;
  startTime: string;
  endTime?: string | null;
  location: string;
  category: string;
}) {
  return request<{ success: boolean; id: number }>('/api/events', {
    method: 'POST',
    body: JSON.stringify(event),
  });
}

export async function deleteChurchEvent(id: number) {
  return request<{ success: boolean }>(`/api/events?id=${id}`, {
    method: 'DELETE',
  });
}


// — Imágenes (Unsplash vía backend) —
export async function getUnsplashPhotos() {
  return fetchUnsplashImages();
}

export function getImageProxyUrl(imageUrl: string) {
  return `${API_BASE_URL}/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
}

export async function uploadImage(localUri: string, fileName: string, mimeType: string) {
  const formData = new FormData();
  formData.append('file', { uri: localUri, name: fileName, type: mimeType } as unknown as Blob);
  formData.append('purpose', 'other');

  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/api/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((data as ApiError).error ?? `Error ${response.status}`);
  }
  return data as { url: string; mediaId: number; filename?: string };
}

/**
 * URL pública y absoluta de un archivo subido. Las notas insertan esta URL en
 * su HTML: debe ser absoluta (el WebView carga por srcDoc, sin baseUrl) y sin
 * auth (`/api/media/:id` exige sesión y el <img> del WebView no manda token).
 * Next sirve `public/uploads/` estáticamente sin autenticación.
 */
export function getPublicUploadUrl(filename: string) {
  return `${API_BASE_URL}/uploads/${encodeURIComponent(filename)}`;
}

// — Actividad y estadísticas —
export async function getStatistics() {
  return request<{ statistics: import('./types').BookStat[] }>('/api/statistics');
}

export async function getActivity() {
  return request<{ heatmap: import('./types').HeatmapDay[]; recentProgress: import('./types').ProgressBook[] }>(
    '/api/activity',
  );
}

export async function recordReadingActivity(bookId: number, chaptersCount = 1, versesCount = 0) {
  return request<{ success: boolean }>('/api/activity', {
    method: 'POST',
    body: JSON.stringify({ bookId, chaptersCount, versesCount }),
  });
}

export async function getFeedAnnouncements() {
  return request<{ announcements: import('./types').FeedAnnouncement[] }>('/api/feed/announcements');
}

export async function listDevotionals() {
  return request<{ devotionals: import('./types').Devotional[] }>('/api/devotionals');
}

export async function createDevotional(payload: {
  title: string;
  emotion?: string | null;
  verseRef?: string | null;
  content: import('./types').DevotionalContent;
}) {
  return request<{ id: number }>('/api/devotionals', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateDevotional(
  id: number,
  payload: {
    title: string;
    emotion?: string | null;
    verseRef?: string | null;
    content: import('./types').DevotionalContent;
  },
) {
  return request<{ success: boolean }>(`/api/devotionals/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteDevotional(id: number) {
  return request<{ success: boolean }>(`/api/devotionals/${id}`, { method: 'DELETE' });
}

function mapExternalBook(row: Record<string, unknown>): import('./types').ExternalBook {
  return {
    id: row.id as number,
    title: row.title as string,
    author: row.author as string,
    coverImage: (row.cover_image as string | null) ?? null,
    status: (row.status as string) ?? 'leyendo',
    createdAt: (row.created_at as string) ?? '',
  };
}

function mapBookLog(row: Record<string, unknown>): import('./types').BookLog {
  return {
    id: row.id as number,
    title: (row.title as string | null) ?? null,
    pagesRead: (row.pages_read as string | null) ?? null,
    chapter: (row.chapter as string | null) ?? null,
    reflection: (row.reflection as string | null) ?? null,
    createdAt: (row.created_at as string) ?? '',
  };
}

export async function listExternalBooks() {
  const res = await request<{ books: Record<string, unknown>[] }>('/api/external-books');
  return { books: res.books.map(mapExternalBook) };
}

export async function createExternalBook(title: string, author: string, coverImage?: string | null) {
  return request<{ success: boolean; id: number }>('/api/external-books', {
    method: 'POST',
    body: JSON.stringify({ title, author, coverImage: coverImage ?? null }),
  });
}

export async function getExternalBook(id: number) {
  const res = await request<{ book: Record<string, unknown>; logs: Record<string, unknown>[] }>(
    `/api/external-books/${id}`,
  );
  return { book: mapExternalBook(res.book), logs: res.logs.map(mapBookLog) };
}

export async function deleteExternalBook(id: number) {
  return request<{ success: boolean }>(`/api/external-books/${id}`, { method: 'DELETE' });
}

export async function addExternalBookLog(
  bookId: number,
  payload: { title?: string; pages_read?: string; chapter?: string; reflection: string },
) {
  return request<{ success: boolean }>(`/api/external-books/${bookId}/logs`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export type UnsplashImage = {
  id: string;
  url: string;
  thumb: string;
  author: string;
  authorUrl: string;
};

export type UnsplashSearchResult = {
  images: UnsplashImage[];
  page: number;
  totalPages: number | null;
  hasMore: boolean;
};

export async function fetchUnsplashImages(
  query?: string,
  opts?: {
    page?: number;
    orientation?: 'portrait' | 'landscape' | 'squarish';
  },
) {
  const params = new URLSearchParams();
  if (query?.trim()) params.set('query', query.trim());
  params.set('orientation', opts?.orientation ?? 'portrait');
  if (opts?.page && opts.page > 1) params.set('page', String(opts.page));
  return request<UnsplashSearchResult>(`/api/unsplash?${params}`);
}

export async function reportContent(
  targetType: 'post' | 'comment' | 'user',
  targetId: number,
  reason: string,
  details?: string,
) {
  return request<{ success: boolean; message: string }>('/api/moderation/report', {
    method: 'POST',
    body: JSON.stringify({ targetType, targetId, reason, details }),
  });
}

export async function blockUser(userId: number) {
  return request<{ success: boolean; message: string }>('/api/moderation/block', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

export async function unblockUser(userId: number) {
  return request<{ success: boolean; message: string }>(`/api/moderation/block?userId=${userId}`, {
    method: 'DELETE',
  });
}

export async function getBlockedUsers() {
  return request<{
    blockedUsers: Array<{
      id: number;
      name: string;
      username: string;
      avatar_media_id: number | null;
      blocked_at: string;
    }>;
  }>('/api/moderation/blocked');
}

export async function deleteMyAccount() {
  return request<{ success: boolean; message: string }>('/api/profile', {
    method: 'DELETE',
  });
}

export async function getTtsVoices() {
  return request<{ available: boolean; voices: import('./types').TtsVoice[] }>('/api/tts?info=voices');
}

export async function previewGroupByCode(code: string) {
  return request<{ group: import('./types').GroupPreview }>(
    `/api/groups/preview?code=${encodeURIComponent(code.trim())}`,
  );
}

export async function regenerateGroupInvite(groupId: number) {
  return request<{ success: boolean; invite_code: string }>(`/api/groups/${groupId}`, {
    method: 'PUT',
    body: JSON.stringify({ action: 'regenerate_invite' }),
  });
}

export async function listMyPrayers() {
  return request<{ prayers: import('./types').UserPrayer[] }>('/api/prayers');
}

export async function createPrayer(input: {
  title: string;
  description?: string;
  visibility?: 'private' | 'group';
  groupId?: number | null;
}) {
  return request<{ id: number }>('/api/prayers', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updatePrayerStatus(id: number, status: string) {
  return request<{ success: boolean }>('/api/prayers', {
    method: 'PUT',
    body: JSON.stringify({ id, status }),
  });
}

export async function deletePrayer(id: number) {
  return request<{ success: boolean }>(`/api/prayers?id=${id}`, { method: 'DELETE' });
}

export async function listFriends() {
  return request<{ friends: import('./types').FriendUser[] }>('/api/friends');
}

export async function listPendingFriendRequests() {
  return request<{ requests: import('./types').FriendRequest[] }>('/api/friends?tab=pending');
}

export async function sendFriendRequest(userId: number) {
  return request<{ success: boolean }>('/api/friends', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

export async function respondFriendRequest(requesterId: number, action: 'accept' | 'reject') {
  return request<{ success: boolean }>('/api/friends', {
    method: 'PATCH',
    body: JSON.stringify({ requesterId, action }),
  });
}

export async function searchUsers(query: string) {
  return request<{ users: import('./types').FriendUser[] }>(
    `/api/users/search?q=${encodeURIComponent(query)}`,
  );
}

export async function getPublicProfile(username: string) {
  return request<{ profile: import('./types').PublicProfile }>(
    `/api/profile/${encodeURIComponent(username)}`,
  );
}

export async function followUser(username: string) {
  return request<{ success: boolean }>(`/api/profile/${encodeURIComponent(username)}/follow`, {
    method: 'POST',
  });
}

export async function unfollowUser(username: string) {
  return request<{ success: boolean }>(`/api/profile/${encodeURIComponent(username)}/follow`, {
    method: 'DELETE',
  });
}

export async function listDiscipleship() {
  return request<{
    asMentor: import('./types').DiscipleshipRelation[];
    asDisciple: import('./types').DiscipleshipRelation[];
  }>('/api/discipleship');
}

export async function requestDiscipleship(mentorUsername: string) {
  return request<{ success: boolean; id: number }>('/api/discipleship', {
    method: 'POST',
    body: JSON.stringify({ mentorUsername }),
  });
}

export async function respondDiscipleship(id: number, accept: boolean) {
  return request<{ success: boolean }>('/api/discipleship', {
    method: 'POST',
    body: JSON.stringify({ action: 'respond', id, accept }),
  });
}

export async function getDiscipleProgress(discipleId: number) {
  return request<{ progress: import('./types').DiscipleProgress }>(
    `/api/discipleship?discipleId=${discipleId}`,
  );
}
