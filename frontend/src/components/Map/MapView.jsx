import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { API_BASE_URL } from '../../api';

function makePhotoIcon(photo, isSelected) {
  const imgSrc = `${API_BASE_URL}/uploads/${photo.filename}`;
  return L.divIcon({
    html: `
      <div class="photo-marker-wrap ${isSelected ? 'selected-marker' : ''}" title="${photo.original_name}">
        <img class="photo-marker-img" src="${imgSrc}" alt="${photo.original_name}" loading="lazy" />
      </div>`,
    className: '',
    iconSize:   [60, 60],
    iconAnchor: [30, 30],
  });
}


function MapController({ selectedPhoto, sidebarOpen }) {
  const map = useMap();

  // Fix Leaflet resize bug: tell map to recalculate its size when sidebar slides open/closed
  useEffect(() => {
    // Wait 350ms for the sidebar CSS transition to complete before recalculating
    const timer = setTimeout(() => {
      map.invalidateSize({ animate: true });
    }, 350);
    return () => clearTimeout(timer);
  }, [sidebarOpen, map]);

  useEffect(() => {
    if (selectedPhoto) {
      map.setView([selectedPhoto.lat, selectedPhoto.lng], 12, {
        animate: true,
        duration: 1.2, 
      });
    }
  }, [selectedPhoto, map]);
  return null;
}

// Intercept map movement to query bounds
function MapBoundsListener({ onBoundsChange, active }) {
  const map = useMap();

  const handleMoveEnd = useCallback(() => {
    if (!active) return;
    const bounds = map.getBounds();
    const bbox = `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}`;
    onBoundsChange(bbox);
  }, [map, active, onBoundsChange]);

  useEffect(() => {
    if (active) {
      handleMoveEnd();
    } else {
      onBoundsChange(null);
    }
  }, [active, handleMoveEnd, onBoundsChange]);

  useMapEvents({
    moveend: handleMoveEnd,
  });

  return null;
}

function PhotoMarkers({ photos, onMarkerClick, selectedPhoto }) {
  return (
    <MarkerClusterGroup chunkedLoading maxClusterRadius={60}>
      {photos.map(photo => {
        const isSelected = selectedPhoto && selectedPhoto.id === photo.id;
        return (
          <Marker
            key={photo.id}
            position={[photo.lat, photo.lng]}
            icon={makePhotoIcon(photo, isSelected)}
            eventHandlers={{
              click: () => onMarkerClick(photo),
            }}
          />
        );
      })}
    </MarkerClusterGroup>
  );
}

export default function MapView({ photos, onMarkerClick, selectedPhoto, sidebarOpen, onBoundsChange, searchOnMove, setSearchOnMove }) {
  // Available map styles
  const mapThemes = {
    dark: {
      url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      attribution: '&copy; OpenStreetMap &copy; CARTO'
    },
    streets: {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: '&copy; OpenStreetMap contributors'
    },
    satellite: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    }
  };

  const [theme, setTheme] = useState('dark');

  return (
    <div style={{ position: 'relative', height: 'calc(100vh - 64px)', width: '100%' }}>
      {/* Floating Theme Controller Widget */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        zIndex: 1000,
        background: 'rgba(23, 23, 23, 0.85)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '12px',
        padding: '6px',
        display: 'flex',
        gap: '4px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
      }}>
        {Object.keys(mapThemes).map(themeName => (
          <button
            key={themeName}
            onClick={() => setTheme(themeName)}
            style={{
              background: theme === themeName ? '#6366f1' : 'transparent',
              color: '#ffffff',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
              textTransform: 'capitalize',
              transition: 'all 0.2s ease',
            }}
          >
            {themeName}
          </button>
        ))}
      </div>

      {/* Floating Viewport Search Toggle Switch */}
      <div style={{
        position: 'absolute',
        top: '80px',
        right: '20px',
        zIndex: 1000,
        background: 'rgba(23, 23, 23, 0.85)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '12px',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        color: '#ffffff',
        fontSize: '12.5px',
        fontWeight: 600,
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'all 0.2s ease'
      }}
      onClick={() => setSearchOnMove(!searchOnMove)}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)'}
      >
        <input
          type="checkbox"
          checked={searchOnMove}
          onChange={() => {}} // handled by parent click
          style={{
            cursor: 'pointer',
            accentColor: '#6366f1',
            margin: 0,
            width: '16px',
            height: '16px'
          }}
        />
        <span>🔍 Search map viewport</span>
      </div>

      <MapContainer
        center={[20, 0]}
        zoom={3}
        minZoom={2}
        style={{ height: '100%', width: '100%' }}
        zoomControl
      >
        <TileLayer
          key={theme}
          url={mapThemes[theme].url}
          attribution={mapThemes[theme].attribution}
          maxZoom={20}
        />
        <PhotoMarkers photos={photos} onMarkerClick={onMarkerClick} selectedPhoto={selectedPhoto} />
        <MapController selectedPhoto={selectedPhoto} sidebarOpen={sidebarOpen} />
        <MapBoundsListener onBoundsChange={onBoundsChange} active={searchOnMove} />
      </MapContainer>
    </div>
  );
}
