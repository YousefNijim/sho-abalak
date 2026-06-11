import { useEffect, useRef } from 'react';
import { connectSocket, disconnectSocket, getSocket } from '../lib/socket';
import { useQueryClient } from '@tanstack/react-query';

export function useBusinessSocket() {
  const queryClient = useQueryClient();
  const socketRef = useRef(getSocket());

  useEffect(() => {
    connectSocket();
    const socket = socketRef.current;

    const handleNewOrder = (data: any) => {
      const order = data.order;
      // Optimistically add to active orders cache if it exists
      queryClient.setQueryData(['orders', 'all'], (oldData: any) => {
        if (!oldData) return [order];
        // Ensure no duplicates
        if (oldData.some((o: any) => o.id === order.id)) return oldData;
        return [order, ...oldData];
      });

      // Also invalidate to fetch full details properly
      queryClient.invalidateQueries({ queryKey: ['orders'] });

      // Browser Notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('طلب جديد! 🛎️', {
          body: `طلب جديد بقيمة ${order.total} ₪`,
          icon: '/favicon.ico', // Assuming there's a favicon or you could use a local logo
        });
      }

      // Try playing a sound
      try {
        const audio = new Audio('/notification.mp3');
        audio.play().catch(() => {
          // Fallback to AudioContext beep if file not found or blocked
          try {
            // @ts-ignore
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
            gain.gain.setValueAtTime(0.1, ctx.currentTime); // Low volume
            osc.start();
            setTimeout(() => {
              osc.stop();
              ctx.close();
            }, 500);
          } catch(e) {}
        });
      } catch (e) {}
    };

    const handleStatusUpdate = (data: { orderId: string; status: string }) => {
      // Optimistically update order status
      queryClient.setQueryData(['orders', 'all'], (oldData: any) => {
        if (!oldData) return oldData;
        return oldData.map((o: any) => 
          o.id === data.orderId ? { ...o, status: data.status } : o
        );
      });
      
      // Full refresh
      queryClient.invalidateQueries({ queryKey: ['orders'] });

      // If delivered/cancelled, optionally show a toast/alert
      if (data.status === 'DELIVERED') {
        // You could use a toast library here if installed
        console.log(`تم توصيل طلب #${data.orderId.slice(-6).toUpperCase()}`);
      }
    };

    const handleDriverRejected = (data: { orderId: string; driverName: string }) => {
      // Refresh orders
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      // We can use a simple alert since shadcn toast isn't fully set up in this snippet
      alert(`تنبيه: السائق ${data.driverName} رفض الطلب #${data.orderId.slice(-6).toUpperCase()}`);
    };

    socket.on('order:new', handleNewOrder);
    socket.on('order:status_update', handleStatusUpdate);
    socket.on('order:driver_rejected', handleDriverRejected);

    // Also request notification permission if not asked
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      socket.off('order:new', handleNewOrder);
      socket.off('order:status_update', handleStatusUpdate);
      socket.off('order:driver_rejected', handleDriverRejected);
      disconnectSocket();
    };
  }, [queryClient]);
}
