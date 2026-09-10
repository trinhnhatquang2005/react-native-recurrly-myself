import { HOME_SUBSCRIPTIONS } from '@/constants/data';
import React, { createContext, useContext, useState } from 'react';

type SubscriptionsContextType = {
  subscriptions: Subscription[];
  addSubscription: (sub: Subscription) => void;
};

const SubscriptionsContext = createContext<SubscriptionsContextType | undefined>(undefined);

export const SubscriptionsProvider = ({ children }: { children: React.ReactNode }) => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(HOME_SUBSCRIPTIONS);

  const addSubscription = (sub: Subscription) => {
    setSubscriptions(prev => [sub, ...prev]);
  };

  return (
    <SubscriptionsContext.Provider value={{ subscriptions, addSubscription }}>
      {children}
    </SubscriptionsContext.Provider>
  );
};

export const useSubscriptions = () => {
  const context = useContext(SubscriptionsContext);
  if (!context) {
    throw new Error('useSubscriptions must be used within a SubscriptionsProvider');
  }
  return context;
};
