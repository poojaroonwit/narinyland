"use client";

import React from 'react';

const GardenPageContext = React.createContext<any>(null);

export const GardenPageProvider: React.FC<{ value: any; children: React.ReactNode }> = ({ value, children }) => (
  <GardenPageContext.Provider value={value}>{children}</GardenPageContext.Provider>
);

export const useGardenPageContext = () => {
  const context = React.useContext(GardenPageContext);
  if (!context) throw new Error('useGardenPageContext must be used within GardenPageProvider');
  return context;
};
