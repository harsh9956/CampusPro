import API from './api';

export const getQuestions = async (params = {}) => {
  const response = await API.get('/questions', { params });
  return response.data;
};

export const getQuestionStats = async () => {
  const response = await API.get('/questions/stats');
  return response.data;
};

export const getQuestionMeta = async () => {
  const response = await API.get('/questions/meta');
  return response.data;
};

export const getQuestionById = async (id) => {
  const response = await API.get(`/questions/${id}`);
  return response.data;
};

export const createQuestion = async (data) => {
  const response = await API.post('/questions', data);
  return response.data;
};

export const updateQuestion = async (id, data) => {
  const response = await API.put(`/questions/${id}`, data);
  return response.data;
};

export const deleteQuestion = async (id) => {
  const response = await API.delete(`/questions/${id}`);
  return response.data;
};

export default {
  getQuestions,
  getQuestionStats,
  getQuestionMeta,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion
};
