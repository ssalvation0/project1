import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import './AddToCollectionModal.css';

function AddToCollectionModal({ setId, setName, onClose }) {
  const { user } = useAuth();
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(null);
  const [saved, setSaved] = useState({});

  useEffect(() => {
    if (!user) return;
    supabase
      .from('collections')
      .select('id, name, set_ids')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setCollections(data || []);
        const alreadyIn = {};
        (data || []).forEach(c => {
          if ((c.set_ids || []).includes(setId)) alreadyIn[c.id] = true;
        });
        setSaved(alreadyIn);
        setLoading(false);
      });
  }, [user, setId]);

  const toggleCollection = async (col) => {
    setSaving(col.id);
    const isIn = saved[col.id];
    const newIds = isIn
      ? col.set_ids.filter(id => id !== setId)
      : [...(col.set_ids || []), setId];

    await supabase
      .from('collections')
      .update({ set_ids: newIds })
      .eq('id', col.id);

    setCollections(prev => prev.map(c => c.id === col.id ? { ...c, set_ids: newIds } : c));
    setSaved(prev => ({ ...prev, [col.id]: !isIn }));
    setSaving(null);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving('new');
    const { data } = await supabase
      .from('collections')
      .insert({ user_id: user.id, name: newName.trim(), set_ids: [setId] })
      .select()
      .single();

    if (data) {
      setCollections(prev => [data, ...prev]);
      setSaved(prev => ({ ...prev, [data.id]: true }));
    }
    setNewName('');
    setCreating(false);
    setSaving(null);
  };

  return (
    <div className="atc-overlay" onClick={onClose}>
      <div className="atc-modal" onClick={e => e.stopPropagation()}>
        <div className="atc-header">
          <h3>Save to Collection</h3>
          <button className="atc-close" onClick={onClose}>×</button>
        </div>
        <p className="atc-set-name">{setName}</p>

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
