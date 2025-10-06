import Constants from 'expo-constants';
import { CONFIG } from '../config';

const API_URL = CONFIG.API_URL;

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // Sanear el cuerpo: eliminar claves con undefined para evitar errores de validación
  const cleanBody = body && typeof body === 'object'
    ? Object.fromEntries(Object.entries(body).filter(([_, v]) => v !== undefined))
    : body;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: cleanBody ? JSON.stringify(cleanBody) : undefined,
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
  createUser: (userData) => request('/api/users', { method: 'POST', body: userData }),
  getUsersForChat: (token) => request('/api/users/chat/list', { token }),
  getAllUsers: (token) => request('/api/users', { token }),
  getUserById: (id, token) => request(`/api/users/${id}`, { token }),
  // Company profile (empleador)
  getCompanyProfile: (userId, token) => request(`/api/company_profiles/${userId}`, { token }),
  
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
  deleteMessage: (conversationId, messageId, token) => request(`/api/conversations/${conversationId}/messages/${messageId}`, {
    method: 'DELETE',
    token
  }),
  deleteConversation: (conversationId, token) => request(`/api/conversations/${conversationId}`, {
    method: 'DELETE',
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

  // Locations (departamentos y municipios)
  getLocationsNicaragua: (page = 1, pageSize = 500, token) => request(`/api/locations_nicaragua?page=${page}&pageSize=${pageSize}`, { token }),

  // ======== Trabajos Exprés (Express Jobs) ========
  // Categorías de oficios (para filtros y formulario)
  getTradeCategories: (page = 1, pageSize = 200, token) => request(`/api/trade_categories?page=${page}&pageSize=${pageSize}`, { token }),

  // Listar perfiles de trabajadores (paginado)
  getWorkerProfilesPaged: (page = 1, pageSize = 500, token) => request(`/api/worker_profiles?page=${page}&pageSize=${pageSize}`, { token }),
  // Crear perfil de trabajador
  createWorkerProfile: (profileData, token) => request('/api/worker_profiles', { method: 'POST', body: profileData, token }),

  // Buscar trabajadores con filtros (destacados: verificados y disponibles, ordenados por rating)
  searchWorkers: ({ trade_category_id, location_id, min_rating, available_only, verified_only, max_hourly_rate, search_text } = {}, token) => {
    const params = new URLSearchParams();
    if (trade_category_id) params.append('trade_category_id', trade_category_id);
    if (location_id) params.append('location_id', location_id);
    if (min_rating) params.append('min_rating', min_rating);
    if (available_only !== undefined) params.append('available_only', available_only);
    if (verified_only !== undefined) params.append('verified_only', verified_only);
    if (max_hourly_rate) params.append('max_hourly_rate', max_hourly_rate);
    if (search_text) params.append('search_text', search_text);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return request(`/api/workers/search${qs}`, { token });
  },

  // Buscar trabajos exprés con filtros
  searchExpressJobs: ({ trade_category_id, location_id, urgency, min_budget, max_budget, status = 'abierto', client_id } = {}, token) => {
    const params = new URLSearchParams();
    if (trade_category_id) params.append('trade_category_id', trade_category_id);
    if (location_id) params.append('location_id', location_id);
    if (urgency) params.append('urgency', urgency);
    if (min_budget) params.append('min_budget', min_budget);
    if (max_budget) params.append('max_budget', max_budget);
    if (status) params.append('status', status);
    if (client_id) params.append('client_id', client_id);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return request(`/api/workers/express-jobs/search${qs}`, { token });
  },

  // CRUD de trabajos exprés
  createExpressJob: (jobData, token) => request('/api/express_jobs', { method: 'POST', body: jobData, token }),
  updateExpressJob: (id, jobData, token) => request(`/api/express_jobs/${id}`, { method: 'PATCH', body: jobData, token }),
  deleteExpressJob: (id, token) => {
    console.log('[api] deleteExpressJob called', { id });
    return request(`/api/express_jobs/${id}`, { method: 'DELETE', token })
      .then(res => {
        console.log('[api] deleteExpressJob success', { id });
        return res;
      })
      .catch(err => {
        console.error('[api] deleteExpressJob error', err);
        throw err;
      });
  },
  getExpressJobsPaged: (page = 1, pageSize = 20, token) => request(`/api/express_jobs?page=${page}&pageSize=${pageSize}`, { token }),

  // Postulaciones a trabajos exprés
  getExpressJobApplications: (jobId, token) => request(`/api/workers/express-jobs/${jobId}/applications`, { token }),
  createExpressJobApplication: (applicationData, token) => request('/api/express_job_applications', { method: 'POST', body: applicationData, token }),
  // Actualizar una postulación exprés (PATCH parcial)
  updateExpressJobApplication: (id, applicationData, token) => request(`/api/express_job_applications/${id}`, { method: 'PATCH', body: applicationData, token }),
  // Listar postulaciones exprés con paginación (para "Mis postulaciones exprés")
  getExpressJobApplicationsPaged: (page = 1, pageSize = 100, token) => request(`/api/express_job_applications?page=${page}&pageSize=${pageSize}`, { token }),
  // Obtener un anuncio exprés por ID
  getExpressJobById: (id, token) => request(`/api/express_jobs/${id}`, { token }),

  // ======== Notificaciones ========
  listMyNotifications: (token) => request('/api/notifications/my', { token }),
  markNotificationRead: (id, token) => request(`/api/notifications/${id}/read`, { method: 'PUT', token }),

  // ======== Reseñas de trabajadores ========
  // Obtener reseñas de un trabajador
  getWorkerReviews: (workerId, token) => request(`/api/workers/${workerId}/reviews`, { token }),
  // Crear una reseña para un trabajador
  createWorkerReview: (reviewData, token) => request('/api/worker_reviews', { method: 'POST', body: reviewData, token }),

  // ======== Reseñas genéricas (candidatos/empleadores) ========
  // Crear reseña genérica vinculada a una postulación
  createReview: (reviewData, token) => request('/api/reviews', { method: 'POST', body: reviewData, token }),
  // Consultar postulaciones (para localizar job_application_id de un candidato)
  // Incluye paginación para obtener suficientes resultados del backend
  getJobApplications: ({ job_id, candidate_id, status, page = 1, pageSize = 200 } = {}, token) => {
    const params = new URLSearchParams();
    if (job_id) params.append('job_id', job_id);
    if (candidate_id) params.append('candidate_id', candidate_id);
    if (status) params.append('status', status);
    if (page) params.append('page', page);
    if (pageSize) params.append('pageSize', pageSize);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return request(`/api/job_applications${qs}`, { token });
  },
  updateExpressJobApplication: (id, applicationData, token) => request(`/api/express_job_applications/${id}`, { method: 'PUT', body: applicationData, token }),
  deleteExpressJobApplication: (id, token) => request(`/api/express_job_applications/${id}`, { method: 'DELETE', token }),

  // File upload endpoint
  uploadFile: async (formData, token, type = 'figan') => {
    const response = await fetch(`${API_URL}/api/files/upload?type=${encodeURIComponent(type)}`, {
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
  },
  // Work experience endpoint
  getWorkExperience: (userId, token) => request(`/api/work_experience?user_id=${userId}`, { token }),

  // Push notifications
  registerPushToken: (tokenValue, deviceInfo, jwt) => request('/api/push/register', {
    method: 'POST',
    body: { token: tokenValue, device: deviceInfo },
    token: jwt,
  }),
  // Enviar push a un usuario (solo admin/super_admin)
  sendPushToUser: (userId, title, body, data = {}, token) => request('/api/push/send', {
    method: 'POST',
    body: { user_id: userId, title, body, data },
    token,
  }),

  // ======== Moderación (reportes y bloqueos) ========
  reportUser: (reportedUserId, reason, token) => request('/api/moderation/report', {
    method: 'POST',
    body: { reported_user_id: reportedUserId, reason },
    token
  }),
  blockUser: (userId, reason, token) => request(`/api/moderation/block/${userId}`, {
    method: 'POST',
    body: { reason },
    token
  }),
  listDailyReports: (date, token) => request(`/api/moderation/reports/daily${date ? `?date=${encodeURIComponent(date)}` : ''}`, { token }),
  listReports: (token) => request('/api/moderation/reports', { token }),
  listBlocks: (token) => request('/api/moderation/blocks', { token }),
  // Reportes de anuncios
  reportAd: (adId, adType, reason, token) => request('/api/moderation/report-ad', {
    method: 'POST',
    body: { ad_id: adId, ad_type: adType, reason },
    token
  }),
  listDailyAdReports: (date, token) => request(`/api/moderation/ad-reports/daily${date ? `?date=${encodeURIComponent(date)}` : ''}`, { token }),
  listAdReports: (token) => request('/api/moderation/ad-reports', { token }),
  // Utilidad: obtener usuario por ID para mostrar nombres en AdminReports
  getUserById: (id, token) => request(`/api/users/${id}`, { token })
};