"use client";

import React from 'react';

export type EditDrawerContextValue = Record<string, any>;

const EditDrawerContext = React.createContext<EditDrawerContextValue | null>(null);

export const EditDrawerProvider: React.FC<{ value: EditDrawerContextValue; children: React.ReactNode }> = ({ value, children }) => (
  <EditDrawerContext.Provider value={value}>{children}</EditDrawerContext.Provider>
);

export const useEditDrawerContext = () => {
  const context = React.useContext(EditDrawerContext);
  if (!context) throw new Error('useEditDrawerContext must be used within EditDrawerProvider');
  return context;
};
