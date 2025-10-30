const API_URL = '/api';

const apiRequest = async (endpoint, options = {}) => {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'API request failed');
    }

    return response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

export const testConnection = () => apiRequest('/test-connection');

export const getTransmogs = (page = 0, pageSize = 20, classFilter = 'all', search = '') => {
  const params = new URLSearchParams({ page, pageSize });
  if (classFilter !== 'all') params.append('class', classFilter);
  if (search) params.append('search', search);
  
  return apiRequest(`/transmogs?${params}`);
};

export const getTransmogSet = (id) => apiRequest(`/transmogs/${id}`);

export const getItem = (id) => apiRequest(`/items/${id}`);

export const getItemMedia = (id) => apiRequest(`/items/${id}/media`);

export const clearCache = () => apiRequest('/cache/clear', { method: 'POST' });