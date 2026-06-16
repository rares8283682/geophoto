import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:3001',
});

// Automatically attach the login token (JWT) to every request if it exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('gp_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Automatically detect expired sessions (401 Unauthorized) and clean up
api.interceptors.response.use((response) => {
  return response;
}, (error) => {
  if (error.response && error.response.status === 401) {
    // DO NOT intercept wrong credentials on login/signup routes
    const url = error.config?.url || '';
    const isAuthRoute = url.includes('/auth/login') || url.includes('/auth/signup');
    
    if (!isAuthRoute) {
      // If the server tells us our token is invalid/expired on a protected route:
      localStorage.removeItem('gp_token');
      localStorage.removeItem('gp_user');
      
      // Reload the page to reset the React state and send them to the login screen
      window.location.reload();
    }
  }
  return Promise.reject(error);
});
