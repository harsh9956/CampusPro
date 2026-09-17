import React, { createContext, useContext, useState } from 'react';

const AcademicYearContext = createContext();

export const AcademicYearProvider = ({ children }) => {
  const [academicYear, setAcademicYear] = useState('2026-27');
  const availableYears = ['2026-27', '2025-26', '2024-25'];

  return (
    <AcademicYearContext.Provider value={{ academicYear, setAcademicYear, availableYears }}>
      {children}
    </AcademicYearContext.Provider>
  );
};

export const useAcademicYear = () => useContext(AcademicYearContext);
