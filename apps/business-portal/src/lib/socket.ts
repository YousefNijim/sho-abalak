import { io, Socket } from 'socket.io-client';
import { getToken } from './auth';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_API_URL || process.env.EXPO_PUBLIC_API_URL || 'https://shu-abalak-production.up.railway.app', {
      auth: { token: getToken() },
      autoConnect: false,
    });
  }
  return socket;
}

export function connectSocket(): void {
  const s = getSocket();
  if (!s.connected) s.connect();
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
