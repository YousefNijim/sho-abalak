import { useEffect, useRef } from 'react';
import io, { Socket } from 'socket.io-client';
import { BASE_URL } from '@shu/api-client';
import { useAuthStore } from '../stores/auth.store';

let socketInstance: Socket | null = null;

export function useSocket(): Socket | null {
  const token = useAuthStore((s) => s.token);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) {
      if (socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
      }
      return;
    }

    if (!socketInstance) {
      socketInstance = io(BASE_URL, {
        auth: { token },
        transports: ['websocket'],
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
      });

      socketInstance.on('connect', () => {
        console.log('Customer App WS connected successfully');
      });

      socketInstance.on('connect_error', (err) => {
        console.warn('Customer App WS connection error:', err.message);
      });

      socketInstance.on('disconnect', (reason) => {
        console.log('Customer App WS disconnected:', reason);
      });
    }

    socketRef.current = socketInstance;

    return () => {
      socketRef.current = null;
    };
  }, [token]);

  return socketRef.current || socketInstance;
}
