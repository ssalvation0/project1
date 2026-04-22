import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { getProfile, upsertProfile } from '../services/db';

const AuthContext = createContext(null);

// Treat empty strings as falsy alongside null/undefined so we fall through cleanly
const firstNonBlank = (...vals) => {
  for (const v of vals) {
    if (v !== null && v !== undefined && v !== '') return v;
  }
  return null;
};

function buildUser(supabaseUser, profileRow) {
  if (!supabaseUser) return null;
  const meta = supabaseUser.user_metadata || {};
  const legacyPrefs = Array.isArray(meta.preferences) ? meta.preferences : [];
  const classPreferences =
    (profileRow?.class_preferences?.length ? profileRow.class_preferences : null)
    ?? (Array.isArray(meta.class_preferences) ? meta.class_preferences : null)
    ?? legacyPrefs.filter(p => CLASS_IDS.includes(p));
  const stylePreferences =
    (profileRow?.style_preferences?.length ? profileRow.style_preferences : null)
    ?? (Array.isArray(meta.style_preferences) ? meta.style_preferences : null)
    ?? legacyPrefs.filter(p => !CLASS_IDS.includes(p));

  // Derive a display name: saved profile → metadata → email local part → generic fallback
  const emailLocal = supabaseUser.email ? supabaseUser.email.split('@')[0] : null;
  const name = firstNonBlank(
    profileRow?.name,
    meta.name,
    meta.full_name,
    emailLocal,
    'User',
  );

  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    name,
    avatarUrl: firstNonBlank(profileRow?.avatar_url, meta.avatar_url),
    classPreferences,
    stylePreferences,
    preferences: [...classPreferences, ...stylePreferences],
    createdAt: supabaseUser.created_at,
  };
}

const CLASS_IDS = [
  'warrior', 'paladin', 'hunter', 'rogue', 'priest', 'deathknight',
  'shaman', 'mage', 'warlock', 'monk', 'druid', 'demonhunter', 'evoker',
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  // raw Supabase user — set synchronously inside onAuthStateChange (no async)
  const [rawUser, setRawUser] = useState(undefined);
  // When we just wrote a profile update locally, suppress the next server-driven
  // refetch from overwriting our optimistic state with stale DB data.
  const skipNextRefetchRef = useRef(false);
  const queryClient = useQueryClient();

  // Load profile asynchronously whenever rawUser changes
  useEffect(() => {
    if (rawUser === undefined) return; // not yet initialized
    if (!rawUser) {
      setUser(null);
      setLoading(false);
      return;
    }

    // If the change came from our own updateProfile → skip this cycle
    if (skipNextRefetchRef.current) {
      skipNextRefetchRef.current = false;
      setLoading(false);
      return;
    }

    let cancelled = false;
    getProfile(rawUser.id)
      .then(async (profile) => {
        if (cancelled) return;
        // If no profile row exists, bootstrap one from metadata so subsequent
        // logins read consistently from the profiles table.
        if (!profile) {
          const meta = rawUser.user_metadata || {};
          const bootstrap = {
            name: meta.name || meta.full_name || (rawUser.email ? rawUser.email.split('@')[0] : 'User'),
            avatar_url: meta.avatar_url || null,
            class_preferences: Array.isArray(meta.class_preferences) ? meta.class_preferences : [],
            style_preferences: Array.isArray(meta.style_preferences) ? meta.style_preferences : [],
          };
          try {
            await upsertProfile(rawUser.id, bootstrap);
            if (!cancelled) setUser(buildUser(rawUser, bootstrap));
          } catch (err) {
            console.warn('[auth] could not bootstrap profile row', err);
            if (!cancelled) setUser(buildUser(rawUser, null));
          }
        } else {
          setUser(buildUser(rawUser, profile));
        }
        if (!cancelled) setLoading(false);
      })
      .catch(async (err) => {
        if (cancelled) return;
        // PGRST116 = no rows → try bootstrap
        if (err?.code === 'PGRST116') {
          const meta = rawUser.user_metadata || {};
          const bootstrap = {
            name: meta.name || meta.full_name || (rawUser.email ? rawUser.email.split('@')[0] : 'User'),
            avatar_url: meta.avatar_url || null,
            class_preferences: Array.isArray(meta.class_preferences) ? meta.class_preferences : [],
            style_preferences: Array.isArray(meta.style_preferences) ? meta.style_preferences : [],
          };
          try {
            await upsertProfile(rawUser.id, bootstrap);
            if (!cancelled) setUser(buildUser(rawUser, bootstrap));
          } catch (bootErr) {
            console.warn('[auth] profile bootstrap failed', bootErr);
            if (!cancelled) setUser(buildUser(rawUser, null));
          }
        } else {
          console.warn('[auth] getProfile failed, using metadata fallback', err);
          if (!cancelled) setUser(buildUser(rawUser, null));
        }
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [rawUser]);

  useEffect(() => {
    let mounted = true;

    // Initial session — kick off by reading session synchronously-ish
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setRawUser(session?.user ?? null);
    });

    // onAuthStateChange must NOT await anything — would deadlock with updateUser
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true);
      }
      setRawUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    localStorage.removeItem('favoriteTransmogs');
    // Wipe user-specific TanStack Query cache so stale data doesn't bleed
    // across accounts on the next login.
    queryClient.clear();
    return supabase.auth.signOut();
  };

  const setNewPassword = async (password) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    setPasswordRecovery(false);
  };

  const dismissPasswordRecovery = () => setPasswordRecovery(false);

  const updateProfile = async (updates) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    await upsertProfile(session.user.id, {
      name: updates.name,
      avatar_url: updates.avatarUrl,
      class_preferences: updates.classPreferences,
      style_preferences: updates.stylePreferences,
    });

    // Keep user_metadata in sync for Google OAuth avatar fallback.
    // This fires USER_UPDATED → onAuthStateChange → setRawUser → would
    // retrigger profile useEffect and overwrite our optimistic state with
    // a stale re-read. Mark the next cycle to be skipped.
    skipNextRefetchRef.current = true;
    try {
      await supabase.auth.updateUser({
        data: {
          name: updates.name,
          avatar_url: updates.avatarUrl || null,
          class_preferences: updates.classPreferences,
          style_preferences: updates.stylePreferences,
        },
      });
    } catch (err) {
      // If updateUser throws, no USER_UPDATED event fires — reset the flag so
      // the next legitimate rawUser change isn't silently skipped.
      skipNextRefetchRef.current = false;
      throw err;
    }

    setUser(prev => ({ ...prev, ...updates, preferences: [...(updates.classPreferences || []), ...(updates.stylePreferences || [])] }));
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut, updateProfile, passwordRecovery, setNewPassword, dismissPasswordRecovery }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
