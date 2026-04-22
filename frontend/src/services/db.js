import { supabase } from './supabase';

// ─── FAVORITES ────────────────────────────────────────────────

export async function getFavorites(userId) {
  const { data, error } = await supabase
    .from('favorites')
    .select('transmog_id')
    .eq('user_id', userId);
  if (error) throw error;
  return data.map((row) => row.transmog_id);
}

export async function addFavorite(userId, transmogId) {
  const { error } = await supabase
    .from('favorites')
    .insert({ user_id: userId, transmog_id: String(transmogId) });
  if (error) throw error;
}

export async function removeFavorite(userId, transmogId) {
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('user_id', userId)
    .eq('transmog_id', String(transmogId));
  if (error) throw error;
}

// ─── PROFILES ─────────────────────────────────────────────────

export async function getProfile(userId) {
  // maybeSingle() returns data:null instead of throwing on 0 rows — cleaner
  // than distinguishing PGRST116 from real errors in the caller.
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertProfile(userId, updates) {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...updates, updated_at: new Date().toISOString() });
  if (error) throw error;
}
