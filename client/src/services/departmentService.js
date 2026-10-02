import API from './api';
import cacheService from './cacheService';

/**
 * Department Service for centralized department operations with in-memory caching
 */
export const departmentService = {
  /**
   * Fetch all departments (Optionally include inactive if admin: { all: true, academicYear })
   */
  getDepartments: async (params = {}) => {
    const isAll = params && params.all;
    const yearKey = params?.academicYear ? `_${params.academicYear}` : '';
    const cacheKey = isAll ? `departments_all${yearKey}` : `departments_list${yearKey}`;
    return cacheService.getOrFetch(cacheKey, async () => {
      const res = await API.get('/departments', { params });
      return res.data;
    }, 3 * 60 * 1000);
  },

  /**
   * Fetch only active departments (for dropdowns: faculty form, student registration, etc.)
   */
  getActiveDepartments: async (params = {}) => {
    const yearKey = params?.academicYear ? `_${params.academicYear}` : '';
    return cacheService.getOrFetch(`departments_active${yearKey}`, async () => {
      const res = await API.get('/departments/active', { params });
      return res.data;
    }, 5 * 60 * 1000);
  },

  /**
   * Create a new department (Admin only)
   */
  createDepartment: async (deptData) => {
    const res = await API.post('/departments', deptData);
    cacheService.invalidatePrefix('departments_');
    return res.data;
  },

  /**
   * Update department (Admin only)
   */
  updateDepartment: async (id, deptData) => {
    const res = await API.put(`/departments/${id}`, deptData);
    cacheService.invalidatePrefix('departments_');
    return res.data;
  },

  /**
   * Delete or deactivate department (Admin only)
   */
  deleteDepartment: async (id) => {
    const res = await API.delete(`/departments/${id}`);
    cacheService.invalidatePrefix('departments_');
    return res.data;
  }
};

export default departmentService;
