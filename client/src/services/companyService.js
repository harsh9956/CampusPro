import API from './api';
import cacheService from './cacheService';

export const companyService = {
  getCompanies: async (params) => {
    // When pagination or search filters are provided, bypass the static list cache
    if (params && (params.page !== undefined || params.limit !== undefined || params.search || params.status)) {
      const res = await API.get('/companies', { params });
      return res.data;
    }

    // Default: use cache for raw dropdown reference list
    return cacheService.getOrFetch('companies_list', async () => {
      const res = await API.get('/companies');
      return Array.isArray(res.data) ? res.data : (res.data?.companies || res.data?.data || []);
    }, 5 * 60 * 1000);
  },

  createCompany: async (companyData) => {
    const res = await API.post('/companies', companyData);
    cacheService.invalidate('companies_list');
    return res.data;
  },

  updateCompany: async (id, companyData) => {
    const res = await API.put(`/companies/${id}`, companyData);
    cacheService.invalidate('companies_list');
    return res.data;
  },

  deleteCompany: async (id) => {
    const res = await API.delete(`/companies/${id}`);
    cacheService.invalidate('companies_list');
    return res.data;
  },

  invalidateCache: () => {
    cacheService.invalidate('companies_list');
  }
};

export default companyService;
