import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import './RatingWidget.css';

function RatingWidget({ setId }) {
  const { user } = useAuth();
  const [average, setAverage] = useState(null);
  const [count, setCount] = useState(0);
  const [userScore, setUserScore] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [saving, setSaving] = useState(false);

  const loadRatings = useCallback(async () => {
    const { data } = await supabase
      .from('ratings')
      .select('score, user_id')
      .eq('set_id', setId);

    if (!data || data.length === 0) { setAverage(null); setCount(0); return; }
    const avg = data.reduce((s, r) => s + r.score, 0) / data.length;
    setAverage(avg.toFixed(1));
    setCount(data.length);
    if (user) {
      const mine = data.find(r => r.user_id === user.id);
      if (mine) setUserScore(mine.score);
    }
  }, [setId, user]);

  useEffect(() => { loadRatings(); }, [loadRatings]);

  const handleRate = async (score) => {
    if (!user || saving) return;
    setSaving(true);
    setUserScore(score);
    await supabase.from('ratings').upsert(
      { set_id: setId, user_id: user.id, score },
      { onConflict: 'set_id,user_id' }
    );
    await loadRatings();
    setSaving(false);
  };

  const display = hovered || userScore;

  return (
    <div className="rating-widget">
      <div className="rating-stars">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            className={`rating-star ${star <= display ? 'active' : ''} ${!user ? 'disabled' : ''}`}
            onMouseEnter={() => user && setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => handleRate(star)}
            disabled={!user || saving}
            aria-label={`Rate ${star} stars`}
          >★</button>
        ))}
      </div>
      <div className="rating-info">
        {average ? (
          <span className="rating-avg"><strong>{average}</strong> / 5 <span className="rating-count">({count} {count === 1 ? 'rating' : 'ratings'})</span></span>
        ) : (
          <span className="rating-none">No ratings yet</span>
        )}
        {!user && <span className="rating-login-hint">Log in to rate</span>}
      </div>
    </div>
  );
}

export default RatingWidget;
