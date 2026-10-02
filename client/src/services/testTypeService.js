import API from './api';
import cacheService from './cacheService';

const testTypeService = {
  // Get all test types with in-memory caching
  getTestTypes: async (params = {}) => {
    const key = `test_types_${JSON.stringify(params)}`;
    return cacheService.getOrFetch(key, async () => {
      const response = await API.get('/test-types', { params });
      return response.data;
    }, 5 * 60 * 1000);
  },

  // Create new test type
  createTestType: async (data) => {
    const response = await API.post('/test-types', data);
    cacheService.invalidatePrefix('test_types_');
    return response.data;
  },

  // Update test type
  updateTestType: async (id, data) => {
    const response = await API.put(`/test-types/${id}`, data);
    cacheService.invalidatePrefix('test_types_');
    return response.data;
  },

  // Delete test type
  deleteTestType: async (id) => {
    const response = await API.delete(`/test-types/${id}`);
    cacheService.invalidatePrefix('test_types_');
    return response.data;
  }
};

export default testTypeService;
