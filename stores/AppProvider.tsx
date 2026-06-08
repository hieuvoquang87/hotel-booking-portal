'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type AppDates = {
  checkIn: string | null;
  checkOut: string | null;
  setCheckIn: (date: string | null) => void;
  setCheckOut: (date: string | null) => void;
};

const AppDatesContext = createContext<AppDates | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [checkIn, setCheckIn] = useState<string | null>(null);
  const [checkOut, setCheckOut] = useState<string | null>(null);

  const value = useMemo<AppDates>(
    () => ({ checkIn, checkOut, setCheckIn, setCheckOut }),
    [checkIn, checkOut],
  );

  return <AppDatesContext.Provider value={value}>{children}</AppDatesContext.Provider>;
}

export function useAppDates(): AppDates {
  const ctx = useContext(AppDatesContext);
  if (!ctx) {
    throw new Error('useAppDates must be used within <AppProvider>');
  }
  return ctx;
}
