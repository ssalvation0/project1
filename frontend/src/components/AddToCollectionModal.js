import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import './AddToCollectionModal.css';

const toSetIdsArray = (value) => (Array.isArray(value) ? value : []);

function AddToCollectionModal({ setId, setName, onClose }) {
  const { user } = useAuth();
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(null);
  const [saved, setSaved] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      setCollections([]);
      setSaved({});
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    let cancelled = false;
    supabase
      .from('collections')
      .select('id, name, set_ids')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error: loadErr }) => {
        if (cancelled) return;
        if (loadErr) {
          console.error('[collections] load failed', loadErr);
          setError('Failed to load collections');
          setLoading(false);
          return;
        }
        setCollections(data || []);
        const alreadyIn = {};
        (data || []).forEach(c => {
          if (toSetIdsArray(c.set_ids).includes(setId)) alreadyIn[c.id] = true;
        });
        setSaved(alreadyIn);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [user, setId]);

  // Close on Escape — expected UX for modals, previously only overlay click
  // dismissed the dialog.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const toggleCollection = async (col) => {
    if (!user?.id || saving !== null) return;
    setSaving(col.id);
    setError('');

    const currentSetIds = toSetIdsArray(col.set_ids);
    const isIn = currentSetIds.includes(setId);
    const newIds = isIn
      ? currentSetIds.filter(id => id !== setId)
      : [...new Set([...currentSetIds, setId])];

    // Scope by user_id in addition to id — RLS will enforce it server-side but
    // the extra predicate makes the intent explicit and surfaces mistakes loudly.
    const { error: updateErr } = await supabase
      .from('collections')
      .update({ set_ids: newIds })
      .eq('id', col.id)
      .eq('user_id', user.id);

    if (updateErr) {
      console.error('[collections] update failed', updateErr);
      setError('Failed to save. Try again.');
      setSaving(null);
      return;
    }

    setCollections(prev => prev.map(c => c.id === col.id ? { ...c, set_ids: newIds } : c));
    setSaved(prev => ({ ...prev, [col.id]: !isIn }));
    setSaving(null);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const trimmedName = newName.trim();
    if (!trimmedName || !user?.id || saving !== null) return;
    setSaving('new');
    setError('');
    // maybeSingle() so an RLS rejection surfaces as error instead of a throw.
    const { data, error: insertErr } = await supabase
      .from('collections')
      .insert({ user_id: user.id, name: trimmedName, set_ids: [setId] })
      .select()
      .maybeSingle();

    if (insertErr || !data) {
      console.error('[collections] create failed', insertErr);
      setError('Failed to create collection');
      setSaving(null);
      return;
    }

    setCollections(prev => [data, ...prev]);
    setSaved(prev => ({ ...prev, [data.id]: true }));
    setNewName('');
    setCreating(false);
    setSaving(null);
  };

  return (
    <div className="atc-overlay" onClick={onClose}>
      <div
        className="atc-modal"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="atc-title"
      >
        <div className="atc-header">
          <h3 id="atc-title">Save to Collection</h3>
          <button type="button" className="atc-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <p className="atc-set-name">{setName}</p>
        {error && <p className="atc-error">{error}</p>}

        <div className="atc-list">
          {loading ? (
            <div className="atc-loading">Loading...</div>
          ) : collections.length === 0 && !creating ? (
            <p className="atc-empty">No collections yet</p>
          ) : (
            collections.map(col => (
              <button
                key={col.id}
                className={`atc-item ${saved[col.id] ? 'atc-item--saved' : ''}`}
                onClick={() => toggleCollection(col)}
                disabled={saving === col.id}
              >
                <span className="atc-item-check">{saved[col.id] ? '✓' : '+'}</span>
                <span className="atc-item-name">{col.name}</span>
                <span className="atc-item-count">{(col.set_ids || []).length} sets</span>
              </button>
            ))
          )}
        </div>

        {creating ? (
          <form className="atc-create-form" onSubmit={handleCreate}>
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Collection name..."
              maxLength={50}
            />
            <div className="atc-create-btns">
              <button type="button" onClick={() => setCreating(false)}>Cancel</button>
              <button type="submit" disabled={!newName.trim() || saving === 'new'}>Create</button>
            </div>
          </form>
        ) : (
          <button className="atc-new-btn" onClick={() => setCreating(true)}>
            + New Collection
          </button>
        )}
      </div>
    </div>
  );
}

export default AddToCollectionModal;
