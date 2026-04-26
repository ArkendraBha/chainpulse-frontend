// lib/apiClient.js

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

export async function apiClient(endpoint, options = {}) {
  let token = null;

  if (typeof window !== 'undefined') {
    // Use "cp_token" — matches NavBar.js, middleware.js, and login
    token = localStorage.getItem('cp_token');
  }

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401 || response.status === 403) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cp_token');
      localStorage.removeItem('cp_email');
      localStorage.removeItem('cp_token_created');
      // Clear cookie too
      document.cookie = "cp_token=; path=/; max-age=0";
      // Redirect to /app (not /login which doesn't exist)
      window.location.href = '/app?reason=session_expired';
    }
    throw new Error('Session expired');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `API error: ${response.status}`);
  }

  return response.json();
}