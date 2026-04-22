import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ChatCircle } from '@phosphor-icons/react';
import './CommentsSection.css';

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function CommentsSection({ setId }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  // Guard with a cancel flag so switching sets quickly can't have the old
  // response overwrite comments on the new page.
  const loadComments = useCallback(async ({ signal } = {}) => {
    setLoading(true);
    const { data, error: loadErr } = await supabase
      .from('comments')
      .select(`
        id, content, created_at, user_id,
        profiles(name, avatar_url)
      `)
      .eq('set_id', setId)
      .order('created_at', { ascending: false });

    if (signal?.aborted) return;
    if (loadErr) {
      console.error('[comments] load failed', loadErr);
      setError('Failed to load comments');
    }
    setComments(data || []);
    setLoading(false);
  }, [setId]);

  useEffect(() => {
    const controller = new AbortController();
    loadComments({ signal: controller.signal });
    return () => controller.abort();
  }, [loadComments]);

  const handlePost = async (e) => {
    e.preventDefault();
    if (!text.trim() || posting) return;
    if (!user?.id) {
      setError('Please log in to post a comment');
      return;
    }
    setPosting(true);
    setError('');

    const { error: err } = await supabase.from('comments').insert({
      set_id: setId,
      user_id: user.id,
      content: text.trim(),
    });

    if (err) {
      setError('Failed to post comment');
    } else {
      setText('');
      await loadComments();
    }
    setPosting(false);
  };

  const handleDelete = async (commentId) => {
    if (!user?.id) return;
    if (!window.confirm('Delete this comment?')) return;
    // Scope by user_id so a broken RLS policy can't let one user delete another's.
    const { error: delErr } = await supabase
      .from('comments').delete().eq('id', commentId).eq('user_id', user.id);
    if (delErr) {
      console.error('[comments] delete failed', delErr);
      setError('Failed to delete comment');
      return;
    }
    setComments(prev => prev.filter(c => c.id !== commentId));
  };

  return (
    <div className="comments-section">
      <h2><ChatCircle size={22} /> Comments <span className="comments-count">{comments.length > 0 ? comments.length : ''}</span></h2>

      {user ? (
        <form className="comment-form" onSubmit={handlePost}>
          <div className="comment-form-avatar">
            {user.avatarUrl
              ? <img src={user.avatarUrl} alt="" />
              : <span>{(user.name || user.email || '?')[0].toUpperCase()}</span>
            }
          </div>
          <div className="comment-form-right">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Share your thoughts on this set..."
              rows={3}
              maxLength={500}
            />
            {error && <p className="comment-error">{error}</p>}
            <div className="comment-form-footer">
              <span className="comment-char-count">{text.length}/500</span>
              <button type="submit" className="comment-submit-btn" disabled={!text.trim() || posting}>
                {posting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <p className="comments-login-hint">Log in to leave a comment</p>
      )}

      <div className="comments-list">
        {loading ? (
          [...Array(2)].map((_, i) => <div key={i} className="comment-skeleton" />)
        ) : comments.length === 0 ? (
          <p className="comments-empty">No comments yet. Be the first!</p>
        ) : (
          comments.map(c => (
            <div key={c.id} className="comment-item">
              <div className="comment-avatar">
                {c.profiles?.avatar_url
                  ? <img src={c.profiles.avatar_url} alt="" />
                  : <span>{(c.profiles?.name || '?')[0].toUpperCase()}</span>
                }
              </div>
              <div className="comment-body">
                <div className="comment-header">
                  <span className="comment-author">{c.profiles?.name || 'User'}</span>
                  <span className="comment-time">{timeAgo(c.created_at)}</span>
                  {user?.id === c.user_id && (
                    <button className="comment-delete-btn" onClick={() => handleDelete(c.id)} aria-label="Delete comment">
                      ×
                    </button>
                  )}
                </div>
                <p className="comment-content">{c.content}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default CommentsSection;
