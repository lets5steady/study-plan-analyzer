import { createContext, useContext } from 'react';
import { useStorage, type UseStorageReturn } from '../hooks/useStorage';

const StorageContext = createContext<UseStorageReturn | null>(null);

export function StorageProvider({ children }: { children: React.ReactNode }) {
  const storage = useStorage();
  return (
    <StorageContext.Provider value={storage}>{children}</StorageContext.Provider>
  );
}

export function useStorageContext(): UseStorageReturn {
  const ctx = useContext(StorageContext);
  if (!ctx) throw new Error('useStorageContext must be used inside <StorageProvider>');
  return ctx;
}
