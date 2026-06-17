import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:3001',
});

// Automatically attach the login token (JWT) to every request if it exists
api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('gp_token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Automatically detect expired sessions (401 Unauthorized) and clean up
api.interceptors.response.use((response) => {
  // --- Silent Session Token Auto-Renewal ---
  const refreshToken = response.headers['x-refresh-token'];
  if (refreshToken && typeof window !== 'undefined') {
    window.localStorage.setItem('gp_token', refreshToken);
    console.log('🔄 Silent Session Refresh: Token updated successfully.');
  }
  return response;
}, (error) => {
  if (error.response && error.response.status === 401) {
    // DO NOT intercept wrong credentials on login/signup routes
    const url = error.config?.url || '';
    const isAuthRoute = url.includes('/auth/login') || url.includes('/auth/signup');
    
    if (!isAuthRoute) {
      // If the server tells us our token is invalid/expired on a protected route:
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('gp_token');
        window.localStorage.removeItem('gp_user');
        // Reload the page to reset the React state and send them to the login screen
        window.location.reload();
      }
    }
  }
  return Promise.reject(error);
});
