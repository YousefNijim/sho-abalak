import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from './useSocket';
import { useActiveOrderStore } from '../stores/active-order.store';

const TERMINAL = ['DELIVERED', 'CANCELLED'];

/**
 * App-wide order reconciliation. Listens for `order:status_update` regardless of
 * which screen is mounted, so that a cancellation (or any status change) pushed
 * while the user is on Home — not the tracking screen — still:
 *   - refreshes the orders list + tracked order, and
 *   - clears the active-order card from Home once the order reaches a terminal state.
 */
export function useGlobalOrderSync() {
  const socket = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) return;
    const handle = (payload: { orderId: string; status: string }) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', payload.orderId] });

      const active = useActiveOrderStore.getState().order;
      if (active && active.id === payload.orderId) {
        if (TERMINAL.includes(payload.status)) {
          useActiveOrderStore.getState().clear();
        } else {
          useActiveOrderStore.getState().set({ ...active, status: payload.status });
        }
      }
    };
    socket.on('order:status_update', handle);
    return () => {
      socket.off('order:status_update', handle);
    };
  }, [socket, queryClient]);
}
