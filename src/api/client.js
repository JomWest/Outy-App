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
  
  // Name validation endpoint
  validateCandidateName: (fullName, excludeUserId, token) => request('/api/candidate_profiles/validate/name', {
    method: 'POST',
    body: { full_name: fullName, exclude_user_id: excludeUserId },
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
    const response = await fetch(`${API_URL}/api/files/upload`, {
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
  },

  // File upload to database as BLOB
  uploadFileToDatabase: async (formData, token, type) => {
    try {
      console.log('Uploading file to database:', { type, hasToken: !!token });
      
      if (!token) {
        throw new Error('Token de autenticación requerido');
      }

      const response = await fetch(`${API_URL}/api/files-blob/upload?type=${type}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type for FormData - let the browser set it with boundary
        },
        body: formData,
      });

      console.log('Upload response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload error response:', errorText);
        
        let errorMessage = 'Error al subir el archivo';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
        } catch (e) {
          // If not JSON, use the text as error message
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Upload successful:', result);
      return result;
    } catch (error) {
      console.error('Error in uploadFileToDatabase:', error);
      throw error;
    }
  },

  // Get file from database
  getFileFromDatabase: async (userId, type, token) => {
    try {
      console.log('Getting file from database:', { userId, type, hasToken: !!token });
      
      let url = `${API_URL}/api/files-blob/${type}/${userId}`;
      
      // Add token as query parameter if available
      if (token) {
        url += `?token=${encodeURIComponent(token)}`;
      }
      
      console.log('Fetching from URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'image/*,application/*',
          // Add Authorization header as well for extra security
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
      });

      console.log('File fetch response status:', response.status);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log('File not found in database');
          return null;
        }
        
        const errorText = await response.text();
        console.error('File fetch error response:', errorText);
        
        let errorMessage = 'Error al obtener el archivo';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
        } catch (e) {
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      // Return the blob URL for images
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      console.log('File retrieved successfully, blob URL created');
      return blobUrl;
      
    } catch (error) {
      console.error('Error in getFileFromDatabase:', error);
      throw error;
    }
  }
};