'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { businessesApi, Business } from '@shu/api-client';
import { BusinessContextType } from '../lib/business';

const BusinessContext = createContext<BusinessContextType>({
  business: null,
  isStore: false,
  isFood: false,
  isLoading: true,
  refetch: () => {},
});

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [business, setBusiness] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBusiness = async () => {
    try {
      setIsLoading(true);
      const data = await businessesApi.mine();
      setBusiness(data);
    } catch (err: any) {
      if (err.response?.status === 401) {
        router.push('/login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBusiness();
  }, []);

  const isStore = business?.type === 'STORE';
  const isFood = business?.type === 'FOOD';

  return (
    <BusinessContext.Provider value={{ business, isStore, isFood, isLoading, refetch: fetchBusiness }}>
      {children}
    </BusinessContext.Provider>
  );
}

export const useBusiness = () => useContext(BusinessContext);
