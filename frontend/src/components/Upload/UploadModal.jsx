import { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import exifr from 'exifr';
import { api } from '../../api';

// ── Pin marker for the placement map ────────────────────────────────────────
const pinIcon = L.divIcon({
  html: `<div style="
    width:24px; height:24px; background:#6366f1;
    border-radius:50% 50% 50% 0; transform:rotate(-45deg);
    border:3px solid white; box-shadow:0 2px 8px rgba(0,0,0,0.5)
  "></div>`,
  className: '',
  iconSize:   [24, 24],
  iconAnchor: [12, 24],
});

// ── Click handler inside the placement map ───────────────────────────────────
function MapClickHandler({ onPick }) {
  useMapEvents({ click: e => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

// ── Dynamic Centerer: Pans the mini-map camera when coordinates change ───────
function MapCenterer({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) {
      map.setView([parseFloat(lat), parseFloat(lng)], 10, { animate: true });
    }
  }, [lat, lng, map]);
  return null;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function UploadModal({ onClose, onUploaded }) {
  const [file, setFile]           = useState(null);
  const [preview, setPreview]     = useState(null);
  const [lat, setLat]             = useState('');
  const [lng, setLng]             = useState('');
  const [exifFound, setExifFound] = useState(false);
  const [dragover, setDragover]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [estimating, setEstimating] = useState(false);
  const inputRef = useRef();

  async function handleAIEstimate() {
    if (!file) return;
    setEstimating(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/photos/estimate-location', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setLat(data.lat.toFixed(6));
      setLng(data.lng.toFixed(6));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to estimate location with AI.');
    } finally {
      setEstimating(false);
    }
  }

  async function processFile(f) {
    if (!f) return;
    setError('');

    // 1. Strict File Type Validation (Images Only)
    if (!f.type.startsWith('image/')) {
      setError('Invalid file type! Please upload an image file (JPEG, PNG, or WebP).');
      return;
    }

    // 2. Strict File Size Validation (Max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (f.size > MAX_SIZE) {
      setError('File size too large! Maximum limit is 10MB.');
      return;
    }

    setFile(f);
    setPreview(URL.createObjectURL(f));

    // Try to extract GPS EXIF
    try {
      const gps = await exifr.gps(f);
      if (gps && gps.latitude != null) {
        setLat(gps.latitude.toFixed(6));
        setLng(gps.longitude.toFixed(6));
        setExifFound(true);
      } else {
        setExifFound(false);
      }
    } catch {
      setExifFound(false);
    }
  }

  function handleFileInput(e) { processFile(e.target.files[0]); }
  function handleDrop(e) {
    e.preventDefault();
    setDragover(false);
    processFile(e.dataTransfer.files[0]);
  }

  function handleMapPick(pickedLat, pickedLng) {
    setLat(pickedLat.toFixed(6));
    setLng(pickedLng.toFixed(6));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file)       return setError('Please choose a photo');
    if (!lat || !lng) return setError('Please provide or pick coordinates');
    setLoading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('lat',  lat);
      fd.append('lng',  lng);
      const { data } = await api.post('/photos', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onUploaded(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div 
      className="modal-overlay" 
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
    >
      <div className="modal" style={{ maxWidth: 540 }} role="dialog" aria-modal="true" aria-labelledby="upload-title">
        <div className="modal-header">
          <h2 className="modal-title" id="upload-title">📍 Upload a photo</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          <div className="modal-body upload-body">
            {/* ── Drop zone ── */}
            {!file ? (
              <div
                className={`upload-dropzone ${dragover ? 'dragover' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragover(true); }}
                onDragLeave={() => setDragover(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                style={{
                  border: dragover ? '2px dashed #6366f1' : '2px dashed rgba(255,255,255,0.15)',
                  background: dragover ? 'rgba(99, 102, 241, 0.05)' : 'rgba(255,255,255,0.02)',
                  transition: 'all 0.2s ease',
                  padding: '40px 20px',
                  borderRadius: '12px',
                  textAlign: 'center',
                  cursor: 'pointer'
                }}
              >
                <input
                  ref={inputRef}
                  id="file-input"
                  type="file"
                  accept="image/*"
                  onChange={handleFileInput}
                  style={{ display: 'none' }}
                />
                <div className="upload-icon" style={{ fontSize: '40px', marginBottom: '12px' }}>🖼️</div>
                <p className="upload-dropzone-text" style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>
                  Click to browse or drag &amp; drop a photo here
                </p>
                <p className="upload-dropzone-text" style={{ fontSize: 12, marginTop: 4, color: 'var(--text-muted)', margin: 0 }}>
                  JPEG, PNG, WebP · up to 10 MB
                </p>
              </div>
            ) : (
              <>
                {/* Preview */}
                <img src={preview} alt="Preview" className="preview-img" style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
                <div className="file-selected" style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '8px', marginTop: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '350px' }}>
                    ✅ {file.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => { setFile(null); setPreview(null); setLat(''); setLng(''); setExifFound(false); }}
                    style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                  >
                    Remove
                  </button>
                </div>
              </>
            )}

            {/* ── Coordinates ── */}
            <div className="coords-panel" style={{ marginTop: 16 }}>
              <div className="coords-panel-title" style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px', color: '#a5b4fc' }}>
                📌 Location coordinates
              </div>

              {exifFound ? (
                <div className="coords-detected" style={{ color: '#2ecc71', fontSize: '12.5px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  ✓ GPS coordinates auto-extracted from photo details!
                </div>
              ) : (
                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '0 0 8px 0' }}>
                    No GPS metadata found. Click the mini-map to pin or enter values manually.
                  </p>
                  {file && (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={handleAIEstimate}
                      disabled={estimating}
                      style={{
                        padding: '6px 12px',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        color: 'var(--accent-light)',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        borderRadius: '20px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'rgba(99, 102, 241, 0.05)',
                        width: 'auto'
                      }}
                    >
                      {estimating ? (
                        <>
                          <div className="spinner" style={{ width: '12px', height: '12px', borderWidth: '2px', marginRight: '6px', borderTopColor: 'var(--accent)' }} />
                          AI Estimating...
                        </>
                      ) : (
                        '✨ Estimate Location with AI'
                      )}
                    </button>
                  )}
                </div>
              )}

              <div className="coords-inputs" style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <label style={{ flex: 1, fontSize: '12px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  Latitude
                  <input
                    id="input-lat"
                    className="form-input"
                    type="number"
                    step="any"
                    placeholder="e.g. 48.8566"
                    value={lat}
                    onChange={e => setLat(e.target.value)}
                  />
                </label>
                <label style={{ flex: 1, fontSize: '12px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  Longitude
                  <input
                    id="input-lng"
                    className="form-input"
                    type="number"
                    step="any"
                    placeholder="e.g. 2.3522"
                    value={lng}
                    onChange={e => setLng(e.target.value)}
                  />
                </label>
              </div>

              {/* Mini placement map */}
              <div className="upload-map-wrap" style={{ height: '180px', borderRadius: '12px', overflow: 'hidden', marginTop: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <MapContainer
                  key="upload-map"
                  center={lat && lng ? [parseFloat(lat), parseFloat(lng)] : [20, 0]}
                  zoom={lat && lng ? 10 : 2}
                  style={{ height: '100%', width: '100%' }}
                  zoomControl={false}
                >
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; OpenStreetMap'
                    subdomains="abcd"
                    maxZoom={20}
                  />
                  <MapClickHandler onPick={handleMapPick} />
                  <MapCenterer lat={lat} lng={lng} />
                  {lat && lng && (
                    <Marker
                      position={[parseFloat(lat), parseFloat(lng)]}
                      icon={pinIcon}
                    />
                  )}
                </MapContainer>
              </div>
              <p className="upload-map-hint" style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', textAlign: 'center' }}>
                💡 Click anywhere on the map above to move/place your pin
              </p>
            </div>

            {error && <p className="error-msg" style={{ marginTop: 12 }}>{error}</p>}
          </div>

          <div className="modal-footer" style={{ display: 'flex', gap: 10, padding: '16px 24px 24px' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>
              Cancel
            </button>
            <button
              id="btn-submit-upload"
              type="submit"
              className="btn btn-primary"
              disabled={loading || !file || !lat || !lng}
              style={{ flex: 2 }}
            >
              {loading ? 'Uploading…' : '⬆ Upload photo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
