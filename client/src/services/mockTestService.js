import API from './api';

export const getMockTests = async (params = {}, signal) => {
  const response = await API.get('/mock-tests', { params, signal });
  return response.data;
};

export const getPublishedMockTests = async (params = {}, signal) => {
  const response = await API.get('/mock-tests/published', { params, signal });
  return response.data;
};

export const getFacultyMockTests = async (params = {}, signal) => {
  const response = await API.get('/mock-tests/faculty', { params, signal });
  return response.data;
};

export const getMockTestById = async (id) => {
  const response = await API.get(`/mock-tests/${id}`);
  return response.data;
};

export const createMockTest = async (data) => {
  const response = await API.post('/mock-tests', data);
  return response.data;
};

export const updateMockTest = async (id, data) => {
  const response = await API.put(`/mock-tests/${id}`, data);
  return response.data;
};

export const publishMockTest = async (id) => {
  const response = await API.patch(`/mock-tests/${id}/publish`);
  return response.data;
};

export const unpublishMockTest = async (id) => {
  const response = await API.patch(`/mock-tests/${id}/unpublish`);
  return response.data;
};

export const deleteMockTest = async (id) => {
  const response = await API.delete(`/mock-tests/${id}`);
  return response.data;
};

export const submitMockTest = async (id, payload) => {
  const response = await API.post(`/mock-tests/${id}/submit`, payload);
  return response.data;
};

export const getMockTestResults = async (id, params = {}, signal) => {
  const response = await API.get(`/mock-tests/${id}/results`, { params, signal });
  return response.data;
};

export const exportMockTestResults = async (id, params = {}) => {
  const response = await API.get(`/mock-tests/${id}/results/export`, {
    params,
    responseType: 'blob'
  });
  return response;
};

export const getMyResults = async () => {
  const response = await API.get('/mock-tests/my-results');
  return response.data;
};

export default {
  getMockTests,
  getPublishedMockTests,
  getFacultyMockTests,
  getMockTestById,
  createMockTest,
  updateMockTest,
  publishMockTest,
  unpublishMockTest,
  deleteMockTest,
  submitMockTest,
  getMockTestResults,
  exportMockTestResults,
  getMyResults
};
