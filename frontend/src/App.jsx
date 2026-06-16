import { lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './components/Auth/AuthPage';

const MapPage = lazy(() => import('./components/Map/MapPage'));


function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }

  return user ? (
    <Suspense fallback={
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    }>
      <MapPage />
    </Suspense>
  ) : (
    <AuthPage />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
