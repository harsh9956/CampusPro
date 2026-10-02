import API from './api';

export const getExperiences = async (params = {}) => {
  const response = await API.get('/experiences', { params });
  return response.data;
};

export const getMyExperiences = async () => {
  const response = await API.get('/experiences/my');
  return response.data;
};

export const getExperienceById = async (id) => {
  const response = await API.get(`/experiences/${id}`);
  return response.data;
};

export const createExperience = async (data) => {
  const response = await API.post('/experiences', data);
  return response.data;
};

export const approveExperience = async (id) => {
  const response = await API.patch(`/experiences/${id}/approve`);
  return response.data;
};

export const rejectExperience = async (id, reason) => {
  const response = await API.patch(`/experiences/${id}/reject`, { reason });
  return response.data;
};

export const getExperienceStats = async () => {
  const response = await API.get('/experiences/stats');
  return response.data;
};

export const deleteExperience = async (id, reason) => {
  const response = await API.delete(`/experiences/${id}`, {
    data: { reason }
  });
  return response.data;
};

export default {
  getExperiences,
  getMyExperiences,
  getExperienceById,
  getExperienceStats,
  createExperience,
  approveExperience,
  rejectExperience,
  deleteExperience
};

