import React, { createContext, useContext, useState } from 'react';
import { Clinic } from '../types';

interface StoreContextType {
  activeStore: Clinic | null;
  setActiveStore: (store: Clinic | null) => void;
}

const StoreContext = createContext<StoreContextType>({
  activeStore: null,
  setActiveStore: () => {},
});

export const StoreProvider = ({ children }: { children: React.ReactNode }) => {
  const [activeStore, setActiveStoreState] = useState<Clinic | null>(() => {
    const saved = localStorage.getItem('activeStore');
    return saved ? JSON.parse(saved) : null;
  });

  const setActiveStore = (store: Clinic | null) => {
    setActiveStoreState(store);
    if (store) {
      localStorage.setItem('activeStore', JSON.stringify(store));
    } else {
      localStorage.removeItem('activeStore');
    }
  };

  return (
    <StoreContext.Provider value={{ activeStore, setActiveStore }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => useContext(StoreContext);
