import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import API from '../services/api';

const AcademicYearContext = createContext();

export const AcademicYearProvider = ({ children }) => {
  const [availableYears, setAvailableYears] = useState([]);
  const [currentAcademicYear, setCurrentAcademicYearState] = useState('');
  const [academicYear, setAcademicYearState] = useState(() => {
    return localStorage.getItem('campuspro_selected_academic_year') || '';
  });
  const [historicalManageMode, setHistoricalManageModeState] = useState(() => {
    return sessionStorage.getItem('campuspro_historical_manage') === 'true';
  });
  const [loading, setLoading] = useState(true);

  // Fetch academic years from backend
  const refreshYears = useCallback(async () => {
    try {
      const res = await API.get('/academic-years');
      if (res.data?.success && Array.isArray(res.data.data)) {
        const yearsList = res.data.data;
        const yearNames = yearsList.map(y => y.year);
        setAvailableYears(yearNames);

        const currentObj = yearsList.find(y => y.isCurrent) || yearsList[0];
        if (currentObj) {
          setCurrentAcademicYearState(currentObj.year);
          // If no stored year in localStorage or stored year is invalid, default to current
          const storedYear = localStorage.getItem('campuspro_selected_academic_year');
          if (!storedYear || !yearNames.includes(storedYear)) {
            setAcademicYearState(currentObj.year);
            localStorage.setItem('campuspro_selected_academic_year', currentObj.year);
          }
        } else {
          setCurrentAcademicYearState('');
          setAcademicYearState('');
        }
      }
    } catch (err) {
      console.warn('[AcademicYearContext] Could not load academic years from server', err?.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshYears();
  }, [refreshYears]);

  const setAcademicYear = useCallback((newYear) => {
    setAcademicYearState(newYear);
    localStorage.setItem('campuspro_selected_academic_year', newYear);
    // If switching to current year, turn off historical management mode automatically
    if (newYear === currentAcademicYear) {
      setHistoricalManageModeState(false);
      sessionStorage.removeItem('campuspro_historical_manage');
    }
  }, [currentAcademicYear]);

  const setHistoricalManageMode = useCallback((enabled) => {
    setHistoricalManageModeState(enabled);
    if (enabled) {
      sessionStorage.setItem('campuspro_historical_manage', 'true');
    } else {
      sessionStorage.removeItem('campuspro_historical_manage');
    }
  }, []);

  const createAcademicYear = useCallback(async (year, status = 'ACTIVE') => {
    const res = await API.post('/academic-years', { year, status });
    await refreshYears();
    return res.data;
  }, [refreshYears]);

  const setCurrentYear = useCallback(async (year) => {
    const res = await API.put('/academic-years/current', { year });
    setCurrentAcademicYearState(year);
    await refreshYears();
    return res.data;
  }, [refreshYears]);

  const isCurrentYear = academicYear === currentAcademicYear;
  const isHistorical = !isCurrentYear;

  return (
    <AcademicYearContext.Provider
      value={{
        academicYear,
        setAcademicYear,
        availableYears,
        currentAcademicYear,
        isCurrentYear,
        isHistorical,
        historicalManageMode,
        setHistoricalManageMode,
        createAcademicYear,
        setCurrentYear,
        refreshYears,
        loading
      }}
    >
      {children}
    </AcademicYearContext.Provider>
  );
};

export const useAcademicYear = () => {
  const context = useContext(AcademicYearContext);
  if (!context) {
    throw new Error('useAcademicYear must be used within an AcademicYearProvider');
  }
  return context;
};

export default AcademicYearContext;
