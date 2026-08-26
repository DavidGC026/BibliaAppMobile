export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'https://biblia2.dvguzman.com';

export const APP_VARIANT = process.env.EXPO_PUBLIC_APP_VARIANT ?? 'internal';
export const IS_INTERNAL_APP = APP_VARIANT === 'internal';
export const COMMUNITY_ENABLED =
  process.env.EXPO_PUBLIC_COMMUNITY_ENABLED === 'true' || IS_INTERNAL_APP;

export const DEFAULT_BIBLE_ID = Number(
  process.env.EXPO_PUBLIC_DEFAULT_BIBLE_ID ?? (IS_INTERNAL_APP ? 149 : 0),
);

export const LEGAL_URLS = {
  privacy: process.env.EXPO_PUBLIC_PRIVACY_URL,
  support: process.env.EXPO_PUBLIC_SUPPORT_URL,
  accountDeletion: process.env.EXPO_PUBLIC_ACCOUNT_DELETION_URL,
  terms: process.env.EXPO_PUBLIC_TERMS_URL,
  communityGuidelines: process.env.EXPO_PUBLIC_COMMUNITY_GUIDELINES_URL,
};
