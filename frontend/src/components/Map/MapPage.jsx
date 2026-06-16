import { useState, useEffect, useCallback } from 'react';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import MapView from './MapView';
import UploadModal from '../Upload/UploadModal';
import PhotoModal from '../PhotoModal/PhotoModal';

export default function MapPage() {
  const { user, logout } = useAuth();
  const [photos, setPhotos]             = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [showUpload, setShowUpload]     = useState(false);
  const [searchQuery, setSearchQuery]   = useState('');
  const [sidebarOpen, setSidebarOpen]   = useState(true);

  const loadPhotos = useCallback(async () => {
    try {
      const { data } = await api.get('/photos');
      setPhotos(data);
    } catch (err) {
      console.error('Failed to load photos:', err);
    }
  }, []);

  useEffect(() => { loadPhotos(); }, [loadPhotos]);

  function handlePhotoUploaded(newPhoto) {
    setPhotos(prev => [newPhoto, ...prev]);
    setShowUpload(false);
  }

  function handleMarkerClick(photo) {
    setSelectedPhoto(photo);
  }

  // Filter photos based on search query (checks name and description)
  const filteredPhotos = photos.filter(photo => {
    const query = searchQuery.toLowerCase();
    return (
      (photo.original_name && photo.original_name.toLowerCase().includes(query)) ||
      (photo.description && photo.description.toLowerCase().includes(query)) ||
      (photo.username && photo.username.toLowerCase().includes(query))
    );
  });

  return (
    <div className="map-page" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* ── Navbar ── */}
      <nav className="navbar" style={{ flexShrink: 0, zIndex: 1010 }}>
        <div className="navbar-brand">
          <div className="navbar-logo">🗺️</div>
          <span className="navbar-title">GeoPhoto</span>
        </div>

        {/* Global Search Box in Navbar */}
        <div className="navbar-search" style={{ flexGrow: 1, maxLength: '400px', display: 'flex', justifyContent: 'center' }}>
          <input
            type="text"
            placeholder="Search photos, descriptions or users..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              maxWidth: '360px',
              padding: '8px 16px',
              borderRadius: '20px',
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.05)',
              color: '#ffffff',
              fontSize: '13px',
              outline: 'none',
              transition: 'border 0.2s ease',
            }}
            onFocus={e => e.target.style.borderColor = '#6366f1'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
          />
        </div>

        <div className="navbar-right">
          <div className="navbar-user">
            Signed in as <span>{user.email}</span>
          </div>
          <button
            id="btn-logout"
            className="btn btn-ghost btn-sm"
            onClick={logout}
          >
            Sign out
          </button>
        </div>
      </nav>

      {/* ── Main Dashboard Workspace ── */}
      <div style={{ display: 'flex', flexGrow: 1, position: 'relative', overflow: 'hidden', paddingTop: '64px' }}>
        
        {/* Collapsible Photo Sidebar Drawer */}
        <div style={{
          width: sidebarOpen ? '320px' : '0px',
          background: 'rgba(23, 23, 23, 0.75)',
          backdropFilter: 'blur(16px)',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          zIndex: 1005,
          position: 'relative'
        }}>
          {/* Sidebar Header */}
          <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, letterSpacing: '0.5px', color: '#ffffff' }}>Explore Gallery</h3>
            <span style={{ fontSize: '11px', background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', padding: '3px 8px', borderRadius: '12px', fontWeight: 600 }}>
              {filteredPhotos.length} {filteredPhotos.length === 1 ? 'photo' : 'photos'}
            </span>
          </div>

          {/* Photo List Wrapper */}
          <div style={{ flexGrow: 1, overflowY: 'auto', padding: '16px' }} className="custom-scrollbar">
            {filteredPhotos.length === 0 ? (
              <div style={{ textAlign: 'center', marginTop: '40px', padding: '0 20px' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔍</div>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>No photos match your search.</p>
              </div>
            ) : (
              filteredPhotos.map(photo => {
                const imgSrc = `http://localhost:3001/uploads/${photo.filename}`;
                const isSelected = selectedPhoto && selectedPhoto.id === photo.id;
                return (
                  <div
                    key={photo.id}
                    onClick={() => handleMarkerClick(photo)}
                    style={{
                      display: 'flex',
                      gap: '14px',
                      padding: '12px',
                      borderRadius: '12px',
                      background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.02)',
                      border: isSelected ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.03)',
                      boxShadow: isSelected ? '0 4px 12px rgba(99, 102, 241, 0.2)' : 'none',
                      marginBottom: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      transform: isSelected ? 'scale(1.02)' : 'scale(1)'
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                        e.currentTarget.style.transform = 'translateX(4px)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                        e.currentTarget.style.transform = 'translateX(0px)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.03)';
                      }
                    }}
                  >
                    <img
                      src={imgSrc}
                      alt={photo.original_name}
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '10px',
                        objectFit: 'cover',
                        border: '1px solid rgba(255,255,255,0.1)'
                      }}
                    />
                    <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center', flexGrow: 1 }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '4px' }}>
                        {photo.original_name}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        📍 {photo.lat.toFixed(3)}, {photo.lng.toFixed(3)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Sidebar Toggle Toggle-Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            position: 'absolute',
            left: sidebarOpen ? '320px' : '0px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 1009,
            background: 'rgba(23, 23, 23, 0.85)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderLeft: 'none',
            borderRadius: '0 12px 12px 0',
            color: '#ffffff',
            padding: '16px 8px',
            cursor: 'pointer',
            boxShadow: '4px 0 20px rgba(0,0,0,0.3)',
            transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
            outline: 'none',
            fontSize: '11px'
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#6366f1'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(23, 23, 23, 0.85)'}
        >
          {sidebarOpen ? '◀' : '▶'}
        </button>

        {/* Map Container */}
        <div style={{ flexGrow: 1, height: '100%', position: 'relative' }}>
          <MapView photos={filteredPhotos} onMarkerClick={handleMarkerClick} selectedPhoto={selectedPhoto} sidebarOpen={sidebarOpen} />
        </div>

      </div>

      {/* ── FAB ── */}
      <button
        id="btn-upload"
        className="fab"
        title="Upload a photo"
        onClick={() => setShowUpload(true)}
        aria-label="Upload a geotagged photo"
      >
        +
      </button>

      {/* ── Modals ── */}
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUploaded={handlePhotoUploaded}
        />
      )}

      {selectedPhoto && (
        <PhotoModal
          photoId={selectedPhoto.id}
          onClose={() => setSelectedPhoto(null)}
          currentUser={user}
        />
      )}
    </div>
  );
}
