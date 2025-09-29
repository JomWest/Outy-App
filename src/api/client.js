import Constants from 'expo-constants';
import { CONFIG } from '../config';

const API_URL = CONFIG.API_URL;

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  if (!res.ok) {
    const message = data?.error || data?.message || res.statusText;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  login: (email, password) => request('/api/auth/login', { method: 'POST', body: { email, password } }),
  me: (token) => request('/api/users/me', { token }),
  
  // Users endpoints
  getUsersForChat: (token) => request('/api/users/chat/list', { token }),
  
  // Conversations endpoints
  getUserConversations: (userId, token) => request(`/api/conversations/user/${userId}`, { token }),
  createConversation: (user1Id, user2Id, token) => request('/api/conversations/create', { 
    method: 'POST', 
    body: { user1Id, user2Id }, 
    token 
  }),
  getConversationMessages: (conversationId, token, page = 1, pageSize = 50) => 
    request(`/api/conversations/${conversationId}/messages?page=${page}&pageSize=${pageSize}`, { token }),
  sendMessage: (conversationId, messageText, token) => request(`/api/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: { message_text: messageText },
    token
  }),
  
  // Mark message as read
  markMessageAsRead: (conversationId, messageId, token) => request(`/api/conversations/${conversationId}/messages/${messageId}/read`, {
    method: 'PUT',
    token
  }),

  // Profile endpoints
  getCandidateProfile: (userId, token) => request(`/api/candidate_profiles/${userId}`, { token }),
  updateCandidateProfile: (userId, profileData, token) => request(`/api/candidate_profiles/${userId}`, {
    method: 'PUT',
    body: profileData,
    token
  }),
  createCandidateProfile: (profileData, token) => request('/api/candidate_profiles', {
    method: 'POST',
    body: profileData,
    token
  }),
  
  // User update endpoint
  updateUser: (userId, userData, token) => request(`/api/users/${userId}`, {
    method: 'PUT',
    body: userData,
    token
  }),

  // File upload endpoint
  uploadFile: async (formData, token) => {
    const response = await fetch(`${BASE_URL}/api/files/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        // Don't set Content-Type for FormData, let the browser set it
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return response.json();
  }
};