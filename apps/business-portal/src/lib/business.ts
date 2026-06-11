import { Business } from '@shu/api-client';

export interface BusinessContextType {
  business: Business | null;
  isStore: boolean;
  isFood: boolean;
  isLoading: boolean;
  refetch: () => void;
}
