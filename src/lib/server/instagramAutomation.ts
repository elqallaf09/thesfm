import 'server-only';

import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import {
  ADMIN_SESSION_COOKIE,
  createServerSupabaseAdmin,
  getUserFromBearerToken,
  isAdminAccessCodeConfigured,
  isAdminEmail,
  verifyAdminSessionToken,
} from '@/lib/server/adminAccess';

export type InstagramContentType = 'reel' | 'post' | 'story';
export type InstagramAutomationStatus =
  | 'draft'
  | 'approval_pending'
  | 'approved'
  | 'rejected'
  | 'publishing'
  | 'published'
  | 'failed';

export type LocalizedText = {
  ar: string;
  en: string;
  fr: string;
};

export type LocalizedList = {
  ar: string[];
  en: string[];
  fr: string[];
};

export type InstagramAutomationPost = {
  id: string;
  created_by: string;
  content_type: InstagramContentType;
  topic: string;
  titles: LocalizedText;
  asset_prompts: LocalizedText;
  captions: LocalizedText;
  descriptions: LocalizedText;
  hashtags: LocalizedList;
  ctas: LocalizedText;
  asset_url: string | null;
  thumbnail_url: string | null;
  template_provider: string | null;
  telegram_chat_id: string | null;
  telegram_message_id: string | null;
  instagram_container_id: string | null;
  instagram_media_id: string | null;
  status: InstagramAutomationStatus;
  approval_sent_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  published_at: string | null;
  published_by: string | null;
  review_notes: string | null;
  raw_provider_responses: Record<string, unknown>;
  error_logs: unknown[];
  created_at: string;
  updated_at: string;
};

export type InstagramAutomationEvent = {
  id: string;
  post_id: string;
  actor_user_id: string | null;
  event_type: string;
  status_from: InstagramAutomationStatus | null;
  status_to: InstagramAutomationStatus | null;
  message: string | null;
  metadata: Record<string, unknown>;
  raw_provider_response: Record<string, unknown> | null;
  error_log: Record<string, unknown> | null;
  telegram_chat_id: string | null;
  telegram_message_id: string | null;
  instagram_container_id: string | null;
  instagram_media_id: string | null;
  created_at: string;
};

export type AutomationApiResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; code: string; status: number };

type DbClient = SupabaseClient<any, 'public', any>;

type DraftPayload = {
  id?: unknown;
  contentType?: unknown;
  platform?: unknown;
  language?: unknown;
  topic?: unknown;
  titles?: unknown;
  assetPrompts?: unknown;
  captions?: unknown;
  descriptions?: unknown;
  hashtags?: unknown;
  ctas?: unknown;
  assetUrl?: unknown;
  thumbnailUrl?: unknown;
  templateProvider?: unknown;
  status?: unknown;
};

type ActionPayload = {
  id?: unknown;
  notes?: unknown;
  language?: unknown;
  telegramChatId?: unknown;
  telegramMessageId?: unknown;
};

const CONTENT_TYPES: InstagramContentType[] = ['reel', 'post', 'story'];
const STATUS_ORDER: InstagramAutomationStatus[] = ['draft', 'approval_pending', 'approved', 'rejected', 'publishing', 'published', 'failed'];

export function automationJson(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      'Cache-Control': 'private, no-store',
      ...(init?.headers ?? {}),
    },
  });
}

function bearerToken(request: NextRequest) {
  const header = request.headers.get('authorization');
  return header?.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
}

export async function currentAutomationUser(request: NextRequest) {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get('sfm_access_token')?.value ?? '';
  return getUserFromBearerToken(bearerToken(request) || cookieToken);
}

export async function requireInstagramAutomationAdmin(request: NextRequest) {
  const user = await currentAutomationUser(request);
  if (!user || !isAdminEmail(user.email)) return { ok: false as const, code: 'FORBIDDEN', status: 403 };
  if (isAdminAccessCodeConfigured()) {
    const cookieStore = await cookies();
    if (!verifyAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value, user)) {
      return { ok: false as const, code: 'ADMIN_CODE_REQUIRED', status: 428 };
    }
  }
  const admin = createServerSupabaseAdmin();
  if (!admin) return { ok: false as const, code: 'SERVICE_NOT_CONFIGURED', status: 503 };
  return { ok: true as const, user, admin };
}

export async function requireInstagramAutomationAdminPage(nextPath: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get('sfm_access_token')?.value;
  const user = await getUserFromBearerToken(token);
  if (!user) return { ok: false as const, redirectTo: `/login?next=${encodeURIComponent(nextPath)}` };
  if (!isAdminEmail(user.email)) return { ok: false as const, redirectTo: '/dashboard' };
  if (!createServerSupabaseAdmin()) return { ok: false as const, redirectTo: '/dashboard' };
  return { ok: true as const, user };
}

function cleanText(value: unknown, max = 2000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function safeUrl(value: unknown) {
  const raw = cleanText(value, 2000);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function localizedText(value: unknown): LocalizedText {
  const source = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  return {
    ar: cleanText(source.ar, 3000),
    en: cleanText(source.en, 3000),
    fr: cleanText(source.fr, 3000),
  };
}

function localizedList(value: unknown): LocalizedList {
  const source = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const read = (item: unknown) => {
    if (Array.isArray(item)) return item.map(entry => cleanText(entry, 80)).filter(Boolean).slice(0, 40);
    if (typeof item === 'string') {
      return item
        .split(/[,\s]+/)
        .map(entry => cleanText(entry, 80))
        .filter(Boolean)
        .slice(0, 40);
    }
    return [];
  };
  return { ar: read(source.ar), en: read(source.en), fr: read(source.fr) };
}

function contentType(value: unknown): InstagramContentType | null {
  return CONTENT_TYPES.includes(value as InstagramContentType) ? value as InstagramContentType : null;
}

function language(value: unknown): keyof LocalizedText {
  return value === 'en' || value === 'fr' || value === 'ar' ? value : 'ar';
}

function mergeProviderResponse(current: unknown, key: string, value: unknown) {
  const source = current && typeof current === 'object' && !Array.isArray(current) ? current as Record<string, unknown> : {};
  return { ...source, [key]: value };
}

function appendError(current: unknown, error: Record<string, unknown>) {
  return [...(Array.isArray(current) ? current : []), { ...error, at: new Date().toISOString() }].slice(-20);
}

function normalizePost(row: Record<string, unknown>): InstagramAutomationPost {
  const normalizeObject = <T extends Record<string, unknown>>(value: unknown, fallback: T) =>
    value && typeof value === 'object' && !Array.isArray(value) ? { ...fallback, ...(value as Record<string, unknown>) } as T : fallback;

  return {
    id: String(row.id ?? ''),
    created_by: String(row.created_by ?? ''),
    content_type: contentType(row.content_type) ?? 'post',
    topic: String(row.topic ?? ''),
    platform: typeof row.platform === 'string' ? row.platform : null,
    language: language(row.language),
    titles: normalizeObject(row.titles, { ar: '', en: '', fr: '' }) as LocalizedText,
    asset_prompts: normalizeObject(row.asset_prompts, { ar: '', en: '', fr: '' }) as LocalizedText,
    captions: normalizeObject(row.captions, { ar: '', en: '', fr: '' }) as LocalizedText,
    descriptions: normalizeObject(row.descriptions, { ar: '', en: '', fr: '' }) as LocalizedText,
    hashtags: normalizeObject(row.hashtags, { ar: [], en: [], fr: [] }) as LocalizedList,
    ctas: normalizeObject(row.ctas, { ar: '', en: '', fr: '' }) as LocalizedText,
    asset_url: typeof row.asset_url === 'string' ? row.asset_url : null,
    thumbnail_url: typeof row.thumbnail_url === 'string' ? row.thumbnail_url : null,
    template_provider: typeof row.template_provider === 'string' ? row.template_provider : null,
    telegram_chat_id: typeof row.telegram_chat_id === 'string' ? row.telegram_chat_id : null,
    telegram_message_id: typeof row.telegram_message_id === 'string' ? row.telegram_message_id : null,
    instagram_container_id: typeof row.instagram_container_id === 'string' ? row.instagram_container_id : null,
    instagram_media_id: typeof row.instagram_media_id === 'string' ? row.instagram_media_id : null,
    status: STATUS_ORDER.includes(row.status as InstagramAutomationStatus) ? row.status as InstagramAutomationStatus : 'draft',
    approval_sent_at: typeof row.approval_sent_at === 'string' ? row.approval_sent_at : null,
    approved_at: typeof row.approved_at === 'string' ? row.approved_at : null,
    approved_by: typeof row.approved_by === 'string' ? row.approved_by : null,
    rejected_at: typeof row.rejected_at === 'string' ? row.rejected_at : null,
    rejected_by: typeof row.rejected_by === 'string' ? row.rejected_by : null,
    published_at: typeof row.published_at === 'string' ? row.published_at : null,
    published_by: typeof row.published_by === 'string' ? row.published_by : null,
    review_notes: typeof row.review_notes === 'string' ? row.review_notes : null,
    raw_provider_responses: normalizeObject(row.raw_provider_responses, {}),
    error_logs: Array.isArray(row.error_logs) ? row.error_logs : [],
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
  };
}

function normalizeEvent(row: Record<string, unknown>): InstagramAutomationEvent {
  return {
    id: String(row.id ?? ''),
    post_id: String(row.post_id ?? ''),
    actor_user_id: typeof row.actor_user_id === 'string' ? row.actor_user_id : null,
    event_type: String(row.event_type ?? ''),
    status_from: STATUS_ORDER.includes(row.status_from as InstagramAutomationStatus) ? row.status_from as InstagramAutomationStatus : null,
    status_to: STATUS_ORDER.includes(row.status_to as InstagramAutomationStatus) ? row.status_to as InstagramAutomationStatus : null,
    message: typeof row.message === 'string' ? row.message : null,
    metadata: row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata) ? row.metadata as Record<string, unknown> : {},
    raw_provider_response: row.raw_provider_response && typeof row.raw_provider_response === 'object' && !Array.isArray(row.raw_provider_response) ? row.raw_provider_response as Record<string, unknown> : null,
    error_log: row.error_log && typeof row.error_log === 'object' && !Array.isArray(row.error_log) ? row.error_log as Record<string, unknown> : null,
    telegram_chat_id: typeof row.telegram_chat_id === 'string' ? row.telegram_chat_id : null,
    telegram_message_id: typeof row.telegram_message_id === 'string' ? row.telegram_message_id : null,
    instagram_container_id: typeof row.instagram_container_id === 'string' ? row.instagram_container_id : null,
    instagram_media_id: typeof row.instagram_media_id === 'string' ? row.instagram_media_id : null,
    created_at: String(row.created_at ?? ''),
  };
}

async function createEvent(
  admin: DbClient,
  input: {
    postId: string;
    actorUserId: string | null;
    eventType: string;
    statusFrom?: InstagramAutomationStatus | null;
    statusTo?: InstagramAutomationStatus | null;
    message?: string | null;
    metadata?: Record<string, unknown>;
    rawProviderResponse?: Record<string, unknown> | null;
    errorLog?: Record<string, unknown> | null;
    telegramChatId?: string | null;
    telegramMessageId?: string | null;
    instagramContainerId?: string | null;
    instagramMediaId?: string | null;
  },
) {
  const { error } = await admin.from('instagram_automation_events').insert({
    post_id: input.postId,
    actor_user_id: input.actorUserId,
    event_type: input.eventType,
    status_from: input.statusFrom ?? null,
    status_to: input.statusTo ?? null,
    message: input.message ?? null,
    metadata: input.metadata ?? {},
    raw_provider_response: input.rawProviderResponse ?? null,
    error_log: input.errorLog ?? null,
    telegram_chat_id: input.telegramChatId ?? null,
    telegram_message_id: input.telegramMessageId ?? null,
    instagram_container_id: input.instagramContainerId ?? null,
    instagram_media_id: input.instagramMediaId ?? null,
  });
  if (error) {
    console.error('[instagram-automation] event insert failed', { code: error.code, message: error.message });
  }
}

export async function listInstagramAutomation(admin: DbClient) {
  const [postsResult, eventsResult] = await Promise.all([
    admin
      .from('instagram_automation_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100),
    admin
      .from('instagram_automation_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(250),
  ]);

  if (postsResult.error) {
    console.error('[instagram-automation] list posts failed', { code: postsResult.error.code, message: postsResult.error.message });
    return { ok: false as const, code: 'LOAD_FAILED', status: 500 };
  }
  if (eventsResult.error) {
    console.error('[instagram-automation] list events failed', { code: eventsResult.error.code, message: eventsResult.error.message });
  }

  return {
    ok: true as const,
    data: {
      posts: (postsResult.data ?? []).map(row => normalizePost(row as Record<string, unknown>)),
      events: (eventsResult.data ?? []).map(row => normalizeEvent(row as Record<string, unknown>)),
    },
  };
}

async function loadPost(admin: DbClient, id: unknown): Promise<InstagramAutomationPost | null> {
  const postId = cleanText(id, 80);
  if (!postId) return null;
  const { data, error } = await admin
    .from('instagram_automation_posts')
    .select('*')
    .eq('id', postId)
    .maybeSingle();
  if (error) {
    console.error('[instagram-automation] load post failed', { postId, code: error.code, message: error.message });
    return null;
  }
  return data ? normalizePost(data as Record<string, unknown>) : null;
}

export async function createOrUpdateDraft(admin: DbClient, user: User, payload: DraftPayload): Promise<AutomationApiResult<InstagramAutomationPost>> {
  const type = contentType(payload.contentType);
  const topic = cleanText(payload.topic, 280);
  if (!type || !topic) return { ok: false, code: 'VALIDATION_ERROR', status: 400 };

  const assetUrl = safeUrl(payload.assetUrl);
  const thumbnailUrl = safeUrl(payload.thumbnailUrl);
  if ((cleanText(payload.assetUrl) && !assetUrl) || (cleanText(payload.thumbnailUrl) && !thumbnailUrl)) {
    return { ok: false, code: 'INVALID_URL', status: 400 };
  }

  const id = cleanText(payload.id, 80);
  const platform = cleanText(payload.platform, 80) || 'instagram';
  const selectedLanguage = language(payload.language);
  const record = {
    content_type: type,
    platform,
    language: selectedLanguage,
    topic,
    titles: localizedText(payload.titles),
    asset_prompts: localizedText(payload.assetPrompts),
    captions: localizedText(payload.captions),
    descriptions: localizedText(payload.descriptions),
    hashtags: localizedList(payload.hashtags),
    ctas: localizedText(payload.ctas),
    asset_url: assetUrl,
    thumbnail_url: thumbnailUrl,
    template_provider: cleanText(payload.templateProvider, 120) || null,
    status: 'draft' as InstagramAutomationStatus,
    review_notes: null,
  };

  if (id) {
    const existing = await loadPost(admin, id);
    if (!existing) return { ok: false, code: 'NOT_FOUND', status: 404 };
    if (existing.status === 'published') return { ok: false, code: 'PUBLISHED_POST_LOCKED', status: 409 };
    const { data, error } = await admin
      .from('instagram_automation_posts')
      .update(record)
      .eq('id', id)
      .select('*')
      .single();
    if (error) {
      console.error('[instagram-automation] update draft failed', { id, code: error.code, message: error.message });
      return { ok: false, code: 'SAVE_FAILED', status: 500 };
    }
    await createEvent(admin, {
      postId: id,
      actorUserId: user.id,
      eventType: 'draft_updated',
      statusFrom: existing.status,
      statusTo: 'draft',
    });
    return { ok: true, data: normalizePost(data as Record<string, unknown>) };
  }

  const { data, error } = await admin
    .from('instagram_automation_posts')
    .insert({ ...record, created_by: user.id })
    .select('*')
    .single();
  if (error) {
    console.error('[instagram-automation] create draft failed', { code: error.code, message: error.message });
    return { ok: false, code: 'SAVE_FAILED', status: 500 };
  }
  const post = normalizePost(data as Record<string, unknown>);
  await createEvent(admin, {
    postId: post.id,
    actorUserId: user.id,
    eventType: 'draft_created',
    statusFrom: null,
    statusTo: 'draft',
  });
  return { ok: true, data: post };
}

export async function deleteDraft(admin: DbClient, user: User, payload: DraftPayload): Promise<AutomationApiResult<InstagramAutomationPost>> {
  const post = await loadPost(admin, payload.id);
  if (!post) return { ok: false, code: 'NOT_FOUND', status: 404 };
  if (post.status === 'published') return { ok: false, code: 'PUBLISHED_POST_LOCKED', status: 409 };

  const { data, error } = await admin
    .from('instagram_automation_posts')
    .delete()
    .eq('id', post.id)
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('[instagram-automation] delete draft failed', { id: post.id, code: error.code, message: error.message });
    return { ok: false, code: 'DELETE_FAILED', status: 500 };
  }

  await createEvent(admin, {
    postId: post.id,
    actorUserId: user.id,
    eventType: 'deleted',
    statusFrom: post.status,
    statusTo: null,
    message: `Deleted draft ${post.id}`,
  });

  if (!data) {
    return { ok: true, data: post };
  }
  return { ok: true, data: normalizePost(data as Record<string, unknown>) };
}

function appOrigin() {
  const explicit = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, '');
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : '';
}

function telegramConfig(payload: ActionPayload) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim() || '';
  const chatId = cleanText(payload.telegramChatId, 120) || process.env.INSTAGRAM_APPROVAL_TELEGRAM_CHAT_ID?.trim() || '';
  return { botToken, chatId };
}

function postTitle(post: InstagramAutomationPost) {
  return post.titles.ar || post.titles.en || post.titles.fr || post.topic;
}

function approvalMessage(post: InstagramAutomationPost) {
  const origin = appOrigin();
  const url = origin ? `${origin}/sfm-admin-control/instagram-automation?post=${encodeURIComponent(post.id)}` : '';
  const title = postTitle(post).replace(/[<>]/g, '');
  const topic = post.topic.replace(/[<>]/g, '');
  return [
    '<b>THE SFM Instagram Approval</b>',
    '',
    `<b>Topic:</b> ${topic}`,
    `<b>Title:</b> ${title}`,
    `<b>Type:</b> ${post.content_type}`,
    url ? `<a href="${url}">Open draft</a>` : '',
  ].filter(Boolean).join('\n');
}

async function sendTelegramApproval(post: InstagramAutomationPost, payload: ActionPayload) {
  const { botToken, chatId } = telegramConfig(payload);
  if (!botToken || !chatId) {
    return { ok: false as const, code: 'TELEGRAM_NOT_CONFIGURED', status: 503 };
  }
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: approvalMessage(post),
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });
  const data = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok || data?.ok === false) {
    console.error('[instagram-automation] telegram send failed', { status: response.status, description: data?.description });
    return { ok: false as const, code: 'TELEGRAM_SEND_FAILED', status: 502, data };
  }
  const result = data?.result && typeof data.result === 'object' ? data.result as Record<string, unknown> : {};
  return {
    ok: true as const,
    chatId,
    messageId: result.message_id ? String(result.message_id) : '',
    data: data ?? {},
  };
}

export async function sendApproval(admin: DbClient, user: User, payload: ActionPayload): Promise<AutomationApiResult<InstagramAutomationPost>> {
  const post = await loadPost(admin, payload.id);
  if (!post) return { ok: false, code: 'NOT_FOUND', status: 404 };
  if (post.status === 'published') return { ok: false, code: 'ALREADY_PUBLISHED', status: 409 };

  const explicitMessageId = cleanText(payload.telegramMessageId, 120);
  const explicitChatId = cleanText(payload.telegramChatId, 120);
  const sent = explicitMessageId && explicitChatId
    ? { ok: true as const, chatId: explicitChatId, messageId: explicitMessageId, data: { source: 'external' } }
    : await sendTelegramApproval(post, payload);

  if (!sent.ok) {
    await createEvent(admin, {
      postId: post.id,
      actorUserId: user.id,
      eventType: 'approval_send_failed',
      statusFrom: post.status,
      statusTo: post.status,
      errorLog: { code: sent.code },
    });
    return { ok: false, code: sent.code, status: sent.status };
  }

  const now = new Date().toISOString();
  const { data, error } = await admin
    .from('instagram_automation_posts')
    .update({
      status: 'approval_pending',
      approval_sent_at: now,
      telegram_chat_id: sent.chatId,
      telegram_message_id: sent.messageId || null,
      raw_provider_responses: mergeProviderResponse(post.raw_provider_responses, 'telegram_send_approval', sent.data),
    })
    .eq('id', post.id)
    .select('*')
    .single();
  if (error) {
    console.error('[instagram-automation] send approval update failed', { id: post.id, code: error.code, message: error.message });
    return { ok: false, code: 'UPDATE_FAILED', status: 500 };
  }
  await createEvent(admin, {
    postId: post.id,
    actorUserId: user.id,
    eventType: 'approval_sent',
    statusFrom: post.status,
    statusTo: 'approval_pending',
    rawProviderResponse: sent.data as Record<string, unknown>,
    telegramChatId: sent.chatId,
    telegramMessageId: sent.messageId || null,
  });
  return { ok: true, data: normalizePost(data as Record<string, unknown>) };
}

export async function approvePost(admin: DbClient, user: User, payload: ActionPayload): Promise<AutomationApiResult<InstagramAutomationPost>> {
  const post = await loadPost(admin, payload.id);
  if (!post) return { ok: false, code: 'NOT_FOUND', status: 404 };
  if (post.status === 'published') return { ok: false, code: 'ALREADY_PUBLISHED', status: 409 };

  const now = new Date().toISOString();
  const { data, error } = await admin
    .from('instagram_automation_posts')
    .update({
      status: 'approved',
      approved_at: now,
      approved_by: user.id,
      rejected_at: null,
      rejected_by: null,
      review_notes: cleanText(payload.notes, 1000) || post.review_notes,
    })
    .eq('id', post.id)
    .select('*')
    .single();
  if (error) {
    console.error('[instagram-automation] approve failed', { id: post.id, code: error.code, message: error.message });
    return { ok: false, code: 'UPDATE_FAILED', status: 500 };
  }
  await createEvent(admin, {
    postId: post.id,
    actorUserId: user.id,
    eventType: 'approved',
    statusFrom: post.status,
    statusTo: 'approved',
    message: cleanText(payload.notes, 1000) || null,
  });
  return { ok: true, data: normalizePost(data as Record<string, unknown>) };
}

export async function rejectPost(admin: DbClient, user: User, payload: ActionPayload): Promise<AutomationApiResult<InstagramAutomationPost>> {
  const post = await loadPost(admin, payload.id);
  if (!post) return { ok: false, code: 'NOT_FOUND', status: 404 };
  if (post.status === 'published') return { ok: false, code: 'ALREADY_PUBLISHED', status: 409 };

  const now = new Date().toISOString();
  const notes = cleanText(payload.notes, 1000);
  const { data, error } = await admin
    .from('instagram_automation_posts')
    .update({
      status: 'rejected',
      rejected_at: now,
      rejected_by: user.id,
      review_notes: notes || null,
    })
    .eq('id', post.id)
    .select('*')
    .single();
  if (error) {
    console.error('[instagram-automation] reject failed', { id: post.id, code: error.code, message: error.message });
    return { ok: false, code: 'UPDATE_FAILED', status: 500 };
  }
  await createEvent(admin, {
    postId: post.id,
    actorUserId: user.id,
    eventType: 'rejected',
    statusFrom: post.status,
    statusTo: 'rejected',
    message: notes || null,
  });
  return { ok: true, data: normalizePost(data as Record<string, unknown>) };
}

function instagramConfig() {
  return {
    accessToken: process.env.INSTAGRAM_GRAPH_ACCESS_TOKEN?.trim() || '',
    businessAccountId: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID?.trim() || '',
    apiVersion: process.env.INSTAGRAM_GRAPH_API_VERSION?.trim() || 'v21.0',
  };
}

function isLikelyVideo(url: string) {
  return /\.(mp4|mov|m4v|webm)(\?|$)/i.test(url);
}

function captionFor(post: InstagramAutomationPost, lang: keyof LocalizedText) {
  const caption = post.captions[lang] || post.captions.ar || post.captions.en || post.captions.fr || '';
  const tags = post.hashtags[lang]?.length ? post.hashtags[lang] : post.hashtags.ar.length ? post.hashtags.ar : post.hashtags.en;
  return [caption, tags.map(tag => tag.startsWith('#') ? tag : `#${tag}`).join(' ')].filter(Boolean).join('\n\n').slice(0, 2200);
}

async function graphPost(path: string, params: URLSearchParams) {
  const { accessToken, apiVersion } = instagramConfig();
  params.set('access_token', accessToken);
  const response = await fetch(`https://graph.facebook.com/${apiVersion}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  const data = await response.json().catch(() => null) as Record<string, unknown> | null;
  return { response, data };
}

export async function publishPost(admin: DbClient, user: User, payload: ActionPayload): Promise<AutomationApiResult<InstagramAutomationPost>> {
  const post = await loadPost(admin, payload.id);
  if (!post) return { ok: false, code: 'NOT_FOUND', status: 404 };
  if (!['approved', 'failed'].includes(post.status)) return { ok: false, code: 'POST_NOT_APPROVED', status: 409 };
  if (!post.asset_url) return { ok: false, code: 'ASSET_REQUIRED', status: 400 };

  const config = instagramConfig();
  if (!config.accessToken || !config.businessAccountId) {
    const errorLog = { code: 'INSTAGRAM_NOT_CONFIGURED' };
    await admin
      .from('instagram_automation_posts')
      .update({ status: 'failed', error_logs: appendError(post.error_logs, errorLog) })
      .eq('id', post.id);
    await createEvent(admin, {
      postId: post.id,
      actorUserId: user.id,
      eventType: 'publish_failed',
      statusFrom: post.status,
      statusTo: 'failed',
      errorLog,
    });
    return { ok: false, code: 'INSTAGRAM_NOT_CONFIGURED', status: 503 };
  }

  await admin.from('instagram_automation_posts').update({ status: 'publishing' }).eq('id', post.id);
  await createEvent(admin, {
    postId: post.id,
    actorUserId: user.id,
    eventType: 'publish_requested',
    statusFrom: post.status,
    statusTo: 'publishing',
  });

  const selectedLanguage = language(payload.language);
  const createParams = new URLSearchParams();
  createParams.set('caption', captionFor(post, selectedLanguage));
  if (post.content_type === 'reel') {
    createParams.set('media_type', 'REELS');
    createParams.set('video_url', post.asset_url);
  } else if (post.content_type === 'story') {
    createParams.set('media_type', 'STORIES');
    createParams.set(isLikelyVideo(post.asset_url) ? 'video_url' : 'image_url', post.asset_url);
  } else {
    createParams.set(isLikelyVideo(post.asset_url) ? 'video_url' : 'image_url', post.asset_url);
  }

  const container = await graphPost(`${config.businessAccountId}/media`, createParams);
  const creationId = typeof container.data?.id === 'string' ? container.data.id : '';
  if (!container.response.ok || !creationId) {
    const errorLog = { code: 'INSTAGRAM_CONTAINER_FAILED', status: container.response.status, response: container.data };
    const { data } = await admin
      .from('instagram_automation_posts')
      .update({
        status: 'failed',
        raw_provider_responses: mergeProviderResponse(post.raw_provider_responses, 'instagram_create_container', container.data),
        error_logs: appendError(post.error_logs, errorLog),
      })
      .eq('id', post.id)
      .select('*')
      .single();
    await createEvent(admin, {
      postId: post.id,
      actorUserId: user.id,
      eventType: 'publish_failed',
      statusFrom: 'publishing',
      statusTo: 'failed',
      rawProviderResponse: container.data,
      errorLog,
    });
    return { ok: false, code: data ? 'INSTAGRAM_CONTAINER_FAILED' : 'PUBLISH_FAILED', status: 502 };
  }

  const publishParams = new URLSearchParams({ creation_id: creationId });
  const published = await graphPost(`${config.businessAccountId}/media_publish`, publishParams);
  const mediaId = typeof published.data?.id === 'string' ? published.data.id : '';
  if (!published.response.ok || !mediaId) {
    const errorLog = { code: 'INSTAGRAM_PUBLISH_FAILED', status: published.response.status, response: published.data };
    const { data } = await admin
      .from('instagram_automation_posts')
      .update({
        status: 'failed',
        instagram_container_id: creationId,
        raw_provider_responses: mergeProviderResponse(
          mergeProviderResponse(post.raw_provider_responses, 'instagram_create_container', container.data),
          'instagram_publish',
          published.data,
        ),
        error_logs: appendError(post.error_logs, errorLog),
      })
      .eq('id', post.id)
      .select('*')
      .single();
    await createEvent(admin, {
      postId: post.id,
      actorUserId: user.id,
      eventType: 'publish_failed',
      statusFrom: 'publishing',
      statusTo: 'failed',
      rawProviderResponse: published.data,
      errorLog,
      instagramContainerId: creationId,
    });
    return { ok: false, code: data ? 'INSTAGRAM_PUBLISH_FAILED' : 'PUBLISH_FAILED', status: 502 };
  }

  const now = new Date().toISOString();
  const { data, error } = await admin
    .from('instagram_automation_posts')
    .update({
      status: 'published',
      published_at: now,
      published_by: user.id,
      instagram_container_id: creationId,
      instagram_media_id: mediaId,
      raw_provider_responses: mergeProviderResponse(
        mergeProviderResponse(post.raw_provider_responses, 'instagram_create_container', container.data),
        'instagram_publish',
        published.data,
      ),
    })
    .eq('id', post.id)
    .select('*')
    .single();

  if (error) {
    console.error('[instagram-automation] publish update failed', { id: post.id, code: error.code, message: error.message });
    return { ok: false, code: 'UPDATE_FAILED', status: 500 };
  }

  await createEvent(admin, {
    postId: post.id,
    actorUserId: user.id,
    eventType: 'published',
    statusFrom: 'publishing',
    statusTo: 'published',
    rawProviderResponse: published.data,
    instagramContainerId: creationId,
    instagramMediaId: mediaId,
  });
  return { ok: true, data: normalizePost(data as Record<string, unknown>) };
}
