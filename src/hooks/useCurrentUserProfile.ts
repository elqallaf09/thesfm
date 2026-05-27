'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';

export const CURRENT_USER_PROFILE_CHANGED_EVENT = 'sfm-current-user-profile-changed';

type ProfileRow = {
  id?: string | null;
  full_name?: string | null;
  display_name?: string | null;
  username?: string | null;
  email?: string | null;
  default_currency?: string | null;
  country?: string | null;
};

export type CurrentUserProfileChangedDetail = {
  userId?: string;
  profile?: Partial<ProfileRow>;
  authEmail?: string | null;
};

export type CurrentUserProfile = {
  userId: string | null;
  email: string;
  username: string;
  displayName: string;
  avatarInitial: string;
  defaultCurrency: string;
  country: string;
  isLoading: boolean;
  isGuest: boolean;
  refresh: () => Promise<void>;
};

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function isGeneratedAuthEmail(email: string) {
  return email.toLowerCase().endsWith('@smart-finance.local');
}

function emailPrefix(email: string) {
  return email.replace(/@smart-finance\.local$/i, '').split('@')[0] || '';
}

function realEmail(authEmail: string, profileEmail: string) {
  if (authEmail && (!isGeneratedAuthEmail(authEmail) || !profileEmail)) return authEmail;
  return profileEmail || authEmail;
}

function initialsFrom(value: string) {
  const source = value.trim();
  if (!source) return 'S';
  const parts = source.includes('@') ? [source.split('@')[0]] : source.split(/\s+/);
  return parts
    .map(part => part[0] || '')
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'S';
}

export function getUserDisplay(args: {
  user: User | null;
  profile: ProfileRow | null;
  fallbackName: string;
}) {
  const metadata = args.user?.user_metadata ?? {};
  const authEmail = clean(args.user?.email);
  const profileEmail = clean(args.profile?.email);
  const email = realEmail(authEmail, profileEmail);
  const username = clean(args.profile?.username) || clean(metadata.username);
  const displayName =
    clean(args.profile?.full_name) ||
    clean(args.profile?.display_name) ||
    username ||
    clean(metadata.full_name) ||
    clean(metadata.display_name) ||
    clean(metadata.name) ||
    emailPrefix(email) ||
    args.fallbackName;

  return {
    userId: args.user?.id ?? args.profile?.id ?? null,
    email,
    username,
    displayName,
    avatarInitial: initialsFrom(displayName || email || args.fallbackName),
    defaultCurrency: clean(args.profile?.default_currency) || 'KWD',
    country: clean(args.profile?.country),
  };
}

export function notifyCurrentUserProfileChanged(detail: CurrentUserProfileChangedDetail = {}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(CURRENT_USER_PROFILE_CHANGED_EVENT, { detail }));
}

export function useCurrentUserProfile(): CurrentUserProfile {
  const { user, loading: authLoading, isGuest } = useAuth();
  const { t } = useLanguage();
  const fallbackName = isGuest ? t('guest_mode') : t('common_user');
  const [authUser, setAuthUser] = useState<User | null>(user);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!user) {
      setAuthUser(null);
      setProfile(null);
      setIsLoadingProfile(false);
      return;
    }

    setIsLoadingProfile(true);
    const [{ data: authData }, { data: profileData }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    ]);

    setAuthUser(authData.user ?? user);
    setProfile((profileData ?? null) as ProfileRow | null);
    setIsLoadingProfile(false);
  }, [user]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    const handleProfileChange = (event: Event) => {
      const detail = event instanceof CustomEvent ? event.detail as CurrentUserProfileChangedDetail : {};
      if (detail.userId && user?.id && detail.userId !== user.id) return;

      if (detail.profile) {
        setProfile(prev => ({ ...(prev ?? {}), ...detail.profile }));
      }

      if (detail.authEmail !== undefined) {
        setAuthUser(prev => prev ? { ...prev, email: detail.authEmail || undefined } as User : prev);
      }

      void loadProfile();
    };

    window.addEventListener(CURRENT_USER_PROFILE_CHANGED_EVENT, handleProfileChange);
    return () => window.removeEventListener(CURRENT_USER_PROFILE_CHANGED_EVENT, handleProfileChange);
  }, [loadProfile, user?.id]);

  return useMemo(() => {
    const display = getUserDisplay({ user: authUser ?? user, profile, fallbackName });
    return {
      ...display,
      isGuest,
      isLoading: authLoading || isLoadingProfile,
      refresh: loadProfile,
    };
  }, [authLoading, authUser, fallbackName, isGuest, isLoadingProfile, loadProfile, profile, user]);
}
