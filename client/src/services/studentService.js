import API from './api';

/**
 * Student Service for centralized student directory, actions, and export operations
 */
export const studentService = {
  /**
   * Fetch students with dynamic filters and optional AbortSignal
   * @param {Object} params - { department, section, minCgpa, academicYear, backlogs, status, search, page, limit }
   * @param {AbortSignal} [signal] - Optional signal to abort stale queries
   */
  getStudents: async (params = {}, signal = undefined) => {
    const res = await API.get('/users/students', { params, signal });
    return res.data;
  },

  /**
   * Initiate background export for filtered students
   * @param {Object} params - { department, section, minCgpa, academicYear, backlogs, status, search }
   */
  exportStudents: async (params = {}) => {
    const res = await API.post('/users/students/export', params, { params });
    return res.data;
  },

  /**
   * Check status of background export job
   * @param {String} jobId - ExportJob ObjectId
   */
  getExportStatus: async (jobId) => {
    const res = await API.get(`/users/students/export/status/${jobId}`);
    return res.data;
  },

  /**
   * Download completed export file as blob
   * @param {String} jobId - ExportJob ObjectId
   */
  downloadExport: async (jobId) => {
    const res = await API.get(`/users/students/export/download/${jobId}`, {
      responseType: 'blob'
    });
    return res;
  },

  /**
   * Get single student detailed info
   * @param {String} id - Student ObjectId
   */
  getStudentById: async (id) => {
    const res = await API.get(`/users/students/${id}`);
    return res.data;
  },

  /**
   * Admin update student profile
   * @param {String} id - Student ObjectId
   * @param {Object} updateData
   */
  updateStudent: async (id, updateData) => {
    const res = await API.put(`/users/students/${id}`, updateData);
    return res.data;
  },

  /**
   * Toggle student active/inactive status
   * @param {String} id - Student ObjectId
   * @param {String} [status] - 'ACTIVE' | 'INACTIVE'
   */
  toggleStudentStatus: async (id, status) => {
    const res = await API.patch(`/users/students/${id}/status`, { status });
    return res.data;
  },

  /**
   * Permanently delete single student and cascade student-owned records
   * @param {String} id - Student ObjectId
   */
  deleteStudent: async (id) => {
    const res = await API.delete(`/users/students/${id}`);
    return res.data;
  },

  /**
   * Permanently delete multiple students in bulk
   * @param {Array<String>} studentIds - Array of student ObjectIds (max 50)
   */
  bulkDeleteStudents: async (studentIds) => {
    const res = await API.delete('/users/students/bulk', {
      data: { studentIds }
    });
    return res.data;
  },

  /**
   * Get authenticated student profile
   */
  getProfile: async () => {
    const res = await API.get('/users/student-profile');
    return res.data;
  },

  /**
   * Update authenticated student profile
   * @param {Object} updateData
   */
  updateProfile: async (updateData) => {
    const res = await API.put('/users/student-profile', updateData);
    return res.data;
  },

  /**
   * Upload resume document for authenticated student
   * @param {FormData} formData
   */
  uploadResume: async (formData) => {
    const res = await API.post('/users/student-resume', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },

  /**
   * Delete uploaded resume document
   */
  deleteResume: async () => {
    const res = await API.delete('/users/student-resume');
    return res.data;
  }
};

export default studentService;
