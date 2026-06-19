import { useState, useEffect, useRef } from 'react';
import { api, API_BASE_URL } from '../../api';

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function PhotoModal({ photoId, onClose, currentUser, onDeleted }) {
  const [photo, setPhoto]       = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending]   = useState(false);
  const [loadingPhoto, setLoadingPhoto] = useState(true);
  
  // Custom states for upgrades
  const [imageLoaded, setImageLoaded] = useState(false);
  const [copied, setCopied]           = useState(false);
  const [isSpeaking, setIsSpeaking]   = useState(false);
  const [deleting, setDeleting]       = useState(false);
  const [regeneratingAI, setRegeneratingAI] = useState(false);

  // Poll for AI description while it's missing
  const pollRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const utteranceRef = useRef(null);

  useEffect(() => {
    async function loadPhoto() {
      setLoadingPhoto(true);
      setImageLoaded(false);
      try {
        const [photoRes, commentsRes] = await Promise.all([
          api.get(`/photos/${photoId}`),
          api.get(`/comments/${photoId}`),
        ]);
        setPhoto(photoRes.data);
        setComments(commentsRes.data);
      } finally {
        setLoadingPhoto(false);
      }
    }
    loadPhoto();
  }, [photoId]);

  // Poll every 3s until AI description arrives
  useEffect(() => {
    if (!photo) return;
    if (photo.ai_description) {
      clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await api.get(`/photos/${photoId}`);
        if (data.ai_description) {
          setPhoto(data);
          clearInterval(pollRef.current);
        }
      } catch { /* silent */ }
    }, 3000);
    return () => clearInterval(pollRef.current);
  }, [photo, photoId]);

  // Clean up speech synthesis when component closes
  useEffect(() => {
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  // Copy GPS Coordinates Utility
  function handleCopyCoords() {
    if (!photo) return;
    const coordsStr = `${photo.lat}, ${photo.lng}`;
    navigator.clipboard.writeText(coordsStr).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // Text-To-Speech Speech Narration Utility
  function handleToggleSpeech() {
    if (!photo?.ai_description) return;
    
    if (isSpeaking) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    } else {
      synthRef.current.cancel(); // cancel any active speaking first
      utteranceRef.current = new SpeechSynthesisUtterance(photo.ai_description);
      
      utteranceRef.current.onend = () => {
        setIsSpeaking(false);
      };
      
      utteranceRef.current.onerror = () => {
        setIsSpeaking(false);
      };

      setIsSpeaking(true);
      synthRef.current.speak(utteranceRef.current);
    }
  }

  async function handleDeletePhoto() {
    if (!window.confirm('Are you sure you want to delete this photo? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await api.delete(`/photos/${photoId}`);
      if (onDeleted) {
        onDeleted(photoId);
      } else {
        onClose();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete photo');
    } finally {
      setDeleting(false);
    }
  }

  async function handleRegenerateAI() {
    setRegeneratingAI(true);
    try {
      const { data } = await api.post(`/photos/${photoId}/regenerate-description`);
      setPhoto(prev => ({ ...prev, ai_description: data.ai_description }));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to regenerate AI description');
    } finally {
      setRegeneratingAI(false);
    }
  }

  async function handleAddComment(e) {
    e.preventDefault();
    if (!newComment.trim() || newComment.length > 250) return;
    setSending(true);
    try {
      const { data } = await api.post(`/comments/${photoId}`, { body: newComment.trim() });
      setComments(prev => [...prev, data]);
      setNewComment('');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to post comment');
    } finally {
      setSending(false);
    }
  }

  const isOwner = currentUser && photo && Number(currentUser.id) === Number(photo.user_id);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="photo-modal-title" style={{ maxWidth: '640px' }}>
        <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 className="modal-title" id="photo-modal-title">
            {loadingPhoto ? 'Loading…' : (photo?.original_name || 'Photo')}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isOwner && (
              <button
                onClick={handleDeletePhoto}
                disabled={deleting}
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: '#ef4444',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                  e.currentTarget.style.borderColor = '#ef4444';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
                }}
              >
                {deleting ? '🗑️ Deleting...' : '🗑️ Delete Photo'}
              </button>
            )}
            <button className="modal-close" onClick={onClose} aria-label="Close modal" style={{ position: 'static', margin: 0 }}>×</button>
          </div>
        </div>

        <div className="modal-body">
          {loadingPhoto ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto' }} />
            </div>
          ) : photo ? (
            <>
              {/* ── Image with Fade-In ── */}
              <div style={{ position: 'relative', width: '100%', height: '340px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {!imageLoaded && <div className="spinner" style={{ position: 'absolute' }} />}
                <img
                  src={`${API_BASE_URL}/uploads/${photo.filename}`}
                  alt={photo.original_name}
                  onLoad={() => setImageLoaded(true)}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    opacity: imageLoaded ? 1 : 0,
                    transition: 'opacity 0.5s ease-in-out',
                  }}
                />
              </div>

              {/* ── Meta with Copy Button ── */}
              <div className="photo-meta" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '8px' }}>
                <span className="photo-author" style={{ fontSize: '13px', fontWeight: 500 }}>📷 {photo.author_email}</span>
                <span className="photo-date" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{formatDate(photo.created_at)}</span>
                
                {/* Coordinates Copy Link */}
                <button 
                  onClick={handleCopyCoords}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: copied ? '#2ecc71' : 'var(--accent-light)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  title="Click to copy coordinates"
                >
                  🌍 {Number(photo.lat).toFixed(4)}, {Number(photo.lng).toFixed(4)} {copied ? '✓ Copied' : '📋 Copy'}
                </button>
              </div>

              {/* ── Glassmorphic AI description ── */}
              <div className="ai-panel" style={{
                marginTop: '16px',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(6, 9, 26, 0.4))',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                borderRadius: '12px',
                padding: '16px',
                position: 'relative',
                boxShadow: '0 8px 32px rgba(99, 102, 241, 0.05)',
                animation: !photo.ai_description ? 'shimmer-ai 1.8s infinite alternate' : 'none'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '13px', fontWeight: 700, color: '#a5b4fc', letterSpacing: '0.5px' }}>
                  <span>✨ AI NARRATION</span>
                  
                  <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                    {/* Regenerate AI Description */}
                    <button
                      type="button"
                      onClick={handleRegenerateAI}
                      disabled={regeneratingAI}
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#ffffff',
                        padding: '4px 8px',
                        borderRadius: '20px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontWeight: 600,
                        transition: 'all 0.2s ease',
                      }}
                      title="Regenerate description with AI"
                    >
                      {regeneratingAI ? '🔄 Generating...' : (photo.ai_description ? '🔄 Regenerate' : '✨ Generate')}
                    </button>

                    {/* Speech Narration Button */}
                    {photo.ai_description && (
                      <button
                        onClick={handleToggleSpeech}
                        style={{
                          background: isSpeaking ? '#ef4444' : 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: '#ffffff',
                          padding: '4px 8px',
                          borderRadius: '20px',
                          cursor: 'pointer',
                          fontSize: '11px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontWeight: 600,
                          transition: 'all 0.2s ease'
                        }}
                        title={isSpeaking ? 'Stop voice reader' : 'Listen to AI narration'}
                      >
                        {isSpeaking ? '⏹ Stop Voice' : '🔊 Listen Description'}
                      </button>
                    )}
                  </div>

                  {!photo.ai_description && !regeneratingAI && (
                    <span className="badge badge-accent">Generating…</span>
                  )}
                </div>

                {photo.ai_description ? (
                  <p className="ai-text" style={{ margin: 0, fontSize: '13.5px', lineHeight: '1.6', color: '#e0e7ff' }}>{photo.ai_description}</p>
                ) : (
                  <>
                    <div className="ai-skeleton" style={{ width: '90%', height: '12px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', marginBottom: '8px' }} />
                    <div className="ai-skeleton" style={{ width: '75%', height: '12px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', marginBottom: '8px' }} />
                    <div className="ai-skeleton" style={{ width: '55%', height: '12px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)' }} />
                  </>
                )}
              </div>

              {/* ── Comments with character counter & list animations ── */}
              <div className="comments-section" style={{ marginTop: '24px' }}>
                <p className="comments-title" style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>
                  💬 Comments ({comments.length})
                </p>

                <div className="comment-list" style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
                  {comments.length === 0 && (
                    <p className="no-comments" style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>No comments yet. Be the first!</p>
                  )}
                  {comments.map(c => (
                    <div key={c.id} className="comment-item" style={{
                      padding: '10px 12px',
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.03)',
                      animation: 'comment-slide-in 0.35s ease-out forwards'
                    }}>
                      <div className="comment-header" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                        <span className="comment-author" style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{c.author_email}</span>
                        <span className="comment-date">{formatDate(c.created_at)}</span>
                      </div>
                      <p className="comment-body" style={{ margin: 0, fontSize: '12.5px', color: '#ffffff', lineHeight: '1.4' }}>{c.body}</p>
                    </div>
                  ))}
                </div>

                {/* Add comment form with character limit */}
                <form className="comment-form" onSubmit={handleAddComment} id="comment-form" style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      id="comment-input"
                      className="comment-input"
                      placeholder="Add a comment…"
                      value={newComment}
                      onChange={e => setNewComment(e.target.value.slice(0, 250))} // strict length capping
                      disabled={sending}
                      style={{ flexGrow: 1 }}
                    />
                    <button
                      id="btn-submit-comment"
                      type="submit"
                      className="btn btn-primary"
                      style={{ flexShrink: 0, padding: '0 20px' }}
                      disabled={sending || !newComment.trim() || newComment.length > 250}
                    >
                      {sending ? '…' : 'Post'}
                    </button>
                  </div>
                  {/* Character Counter Display */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '11px', color: newComment.length >= 240 ? '#ef4444' : 'var(--text-muted)' }}>
                    {newComment.length} / 250 characters
                  </div>
                </form>
              </div>
            </>
          ) : (
            <p style={{ padding: 24, color: 'var(--danger)', textAlign: 'center' }}>Photo not found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
