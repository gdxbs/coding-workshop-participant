const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class ApiError extends Error {
  constructor(status, message, data = null) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = 'ApiError';
  }
}

async function request(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  
  const authHeaders = {};
  const token = localStorage.getItem('authToken');
  if (token) {
    authHeaders['Authorization'] = `Bearer ${token}`;
  }
  const userStr = localStorage.getItem('currentUser');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      authHeaders['x-user-id'] = user._id;
      authHeaders['x-system-role'] = user.system_role;
    } catch (e) {
      console.error("Failed to parse user", e);
    }
  }

  const headers = {
    'Content-Type': 'application/json',
    ...authHeaders,
    ...(options.headers || {})
  };

  const config = {
    ...options,
    headers
  };

  if (config.body && typeof config.body !== 'string') {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
        let errorData = null;
        try {
            errorData = await response.json();
        } catch (e) {
            // Error parsing JSON, keep errorData null
        }
        
        switch (response.status) {
            case 401: {
                const isAuthEndpoint = endpoint.includes('/auth/login');
                if (!isAuthEndpoint) {
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('currentUser');
                    window.location.href = '/login';
                }
                throw new ApiError(401, errorData?.error || errorData?.message || 'Unauthorized', errorData);
            }
            case 400:
                throw new ApiError(400, errorData?.error || errorData?.message || 'Bad Request', errorData);
            case 403:
                throw new ApiError(403, errorData?.error || errorData?.message || 'Forbidden', errorData);
            case 409:
                throw new ApiError(409, errorData?.error || errorData?.message || 'Conflict: duplicate entry', errorData);
            case 404:
                throw new ApiError(404, errorData?.error || errorData?.message || 'Not Found', errorData);
            case 500:
                throw new ApiError(500, errorData?.error || errorData?.message || 'Internal Server Error', errorData);
            default:
                throw new ApiError(response.status, errorData?.error || errorData?.message || `HTTP Error ${response.status}`, errorData);
        }
    }
    
    // Check if the response has body before trying to parse JSON
    if (response.status !== 204) {
      return await response.json();
    }
    return null;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(0, error.message || 'Network Error');
  }
}

/**
 * Sends a login request to the authentication endpoint.
 * @param {string} email - The user's email address.
 * @param {string} password - The user's password.
 * @returns {Promise<{ token: string, user: Object }>} The auth token and user object.
 */
async function login(email, password) {
  return request('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

/**
 * Fetches the current user's profile using the stored auth token.
 * @returns {Promise<Object>} The user profile object.
 */
async function fetchCurrentUser() {
  return request('/api/auth/me', { method: 'GET' });
}

export const api = {
  get: (endpoint, options = {}) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, data, options = {}) => request(endpoint, { ...options, method: 'POST', body: data }),
  put: (endpoint, data, options = {}) => request(endpoint, { ...options, method: 'PUT', body: data }),
  delete: (endpoint, options = {}) => request(endpoint, { ...options, method: 'DELETE' }),
  login,
  fetchCurrentUser,
};

export { ApiError };
export default api;
