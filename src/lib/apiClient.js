// lib/apiClient.js

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://your-backend.onrender.com';

export async function apiClient(endpoint, options = {}) {
  let token = null;

  // Only access localStorage in the browser
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('access_token');
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

  // Handle expired/invalid tokens
  if (response.status === 401 || response.status === 403) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      window.location.href = '/login?reason=session_expired';
    }
    throw new Error('Session expired');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `API error: ${response.status}`);
  }

  return response.json();
}