import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { emptyProfile, type TravelProfile } from '../lib/travel';
const AccountContext = createContext<any>(null);
export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<TravelProfile>(emptyProfile);
  const [ready, setReady] = useState(false);
  const hasLoaded = useRef(false);

  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;
    // Simulación de carga - en producción aquí iría la llamada a Supabase
    setReady(true);
  }, []);

  const update = (data: Partial<TravelProfile>) => {
    setProfile(prev => ({ ...prev, ...data }));
  };

  return (
    <AccountContext.Provider value={{ user, ready, profile, update, setUser }}>
      {children}
    </AccountContext.Provider>
  );
}

export const useAccount = () => useContext(AccountContext);
