import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { getProfile, upsertProfile } from '../services/db';

const AuthContext = createContext(null);

function buildUser(supabaseUser, profileRow) {
  if (!supabaseUser) return null;
  const meta = supabaseUser.user_metadata || {};
  const legacyPrefs = meta.preferences || [];
  const classPreferences =
    profileRow?.class_preferences?.length
      ? profileRow.class_preferences
      : meta.class_preferences || legacyPrefs.filter(p => CLASS_IDS.includes(p));
  const stylePreferences =
    profileRow?.style_preferences?.length
      ? profileRow.style_preferences
      : meta.style_preferences || legacyPrefs.filter(p => !CLASS_IDS.includes(p));

  return {
    id: supabaseUser.id,
    email: supabaseUser.email,
    name: profileRow?.name || meta.name || meta.full_name || supabaseUser.email.split('@')[0],
    avatarUrl: profileRow?.avatar_url || meta.avatar_url || null,
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

  // Load profile asynchronously whenever rawUser changes
  useEffect(() => {
    if (rawUser === undefined) return; // not yet initialized
    if (!rawUser) {
      setUser(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    getProfile(rawUser.id)
      .then(profile => {
        if (!cancelled) {
          setUser(buildUser(rawUser, profile));
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUser(buildUser(rawUser, null));
          setLoading(false);
        }
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

  const signOut = () => supabase.auth.signOut();

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

    // Keep user_metadata in sync for Google OAuth avatar fallback
    await supabase.auth.updateUser({
      data: {
        name: updates.name,
        avatar_url: updates.avatarUrl || null,
        class_preferences: updates.classPreferences,
        style_preferences: updates.stylePreferences,
      },
    });

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
