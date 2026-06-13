import { useEffect, useRef, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import { BASE_URL } from '@shu/api-client';
import { useAuthStore } from '../stores/auth.store';

let socketInstance: Socket | null = null;

export function useSocket(): Socket | null {
  const token = useAuthStore((s) => s.token);
  const [, forceUpdate] = useState(0);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) {
      if (socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
        socketRef.current = null;
        forceUpdate((n) => n + 1);
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

        socketRef.current = socketInstance;
        forceUpdate((n) => n + 1);
      });

      socketInstance.on('connect_error', (err) => {
        console.warn('Customer App WS connection error:', err.message);
      });

      socketInstance.on('disconnect', (reason) => {

      });
    }

    socketRef.current = socketInstance;

    return () => {
      socketRef.current = null;
    };
  }, [token]);

  return socketRef.current || socketInstance;
}
