import API from './api';
import cacheService from './cacheService';

/**
 * Section Service for centralized section operations with in-memory caching
 */
export const sectionService = {
  /**
   * Fetch all sections (Optionally include inactive if admin: { all: true })
   */
  getSections: async (params = {}) => {
    const isAll = params && params.all;
    const yearKey = params?.academicYear ? `_${params.academicYear}` : '';
    const cacheKey = isAll ? `sections_all${yearKey}` : `sections_list${yearKey}`;
    return cacheService.getOrFetch(cacheKey, async () => {
      const res = await API.get('/sections', { params });
      return res.data;
    }, 3 * 60 * 1000);
  },

  /**
   * Fetch only active sections (for dropdowns: student registration, filters, etc.)
   */
  getActiveSections: async (params = {}) => {
    const yearKey = params?.academicYear ? `_${params.academicYear}` : '';
    return cacheService.getOrFetch(`sections_active${yearKey}`, async () => {
      const res = await API.get('/sections/active', { params });
      return res.data;
    }, 5 * 60 * 1000);
  },

  /**
   * Create a new section (Admin only)
   */
  createSection: async (sectionData) => {
    const res = await API.post('/sections', sectionData);
    cacheService.invalidatePrefix('sections_');
    return res.data;
  },

  /**
   * Update section (Admin only)
   */
  updateSection: async (id, sectionData) => {
    const res = await API.put(`/sections/${id}`, sectionData);
    cacheService.invalidatePrefix('sections_');
    return res.data;
  },

  /**
   * Delete or deactivate section (Admin only)
   */
  deleteSection: async (id) => {
    const res = await API.delete(`/sections/${id}`);
    cacheService.invalidatePrefix('sections_');
    return res.data;
  }
};

export default sectionService;
