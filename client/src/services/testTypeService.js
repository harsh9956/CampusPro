import API from './api';

const testTypeService = {
  // Get all test types
  getTestTypes: async (params = {}) => {
    const response = await API.get('/test-types', { params });
    return response.data;
  },

  // Create new test type
  createTestType: async (data) => {
    const response = await API.post('/test-types', data);
    return response.data;
  },

  // Update test type
  updateTestType: async (id, data) => {
    const response = await API.put(`/test-types/${id}`, data);
    return response.data;
  },

  // Delete test type
  deleteTestType: async (id) => {
    const response = await API.delete(`/test-types/${id}`);
    return response.data;
  }
};

export default testTypeService;
