import { Injectable, Logger } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { SocketEvents, OrderStatus, DriverStatus } from '@shu/shared-types';

interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    role: string;
    areaId: string | null;
  };
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
@Injectable()
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(SocketGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.query?.token;
      if (!token) {
        this.logger.warn(`WebSocket connection rejected: missing JWT token`);
        client.disconnect(true);
        return;
      }

      // Verify and decode JWT
      const decoded = this.jwtService.verify(token);
      client.user = {
        id: decoded.sub,
        role: decoded.role,
        areaId: decoded.areaId || null,
      };

      this.logger.log(`WS Client connected: User ${client.user.id} (${client.user.role})`);

      // Join client to unique personal user room for targeted notifications
      await client.join(`user:${client.user.id}`);

      // If user is a business owner, join business owner room
      if (client.user.role === 'BUSINESS') {
        await client.join(`business:owner:${client.user.id}`);
      }
    } catch (err) {
      this.logger.warn(`WebSocket connection rejected: token verification failed`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.user) {
      this.logger.log(`WS Client disconnected: User ${client.user.id}`);
    }
  }

  // --- Broadcast emitters called from other core services ---

  /** Pushes real-time order status updates to customer tracking screen */
  emitOrderStatusUpdate(customerId: string, orderId: string, status: OrderStatus) {
    this.logger.log(`Emit status update [${status}] to customer user:${customerId} for order:${orderId}`);
    this.server.to(`user:${customerId}`).emit(SocketEvents.ORDER_STATUS_UPDATE, {
      orderId,
      status,
    });
  }

  /** Pushes real-time order status updates to business owner screen */
  emitOrderStatusUpdateToBusiness(businessOwnerId: string, orderId: string, status: OrderStatus) {
    this.logger.log(`Emit status update [${status}] to business owner business:owner:${businessOwnerId} for order:${orderId}`);
    this.server.to(`business:owner:${businessOwnerId}`).emit(SocketEvents.ORDER_STATUS_UPDATE, {
      orderId,
      status,
    });
  }

  /** Pushes new incoming order details to the business owner */
  emitOrderNew(businessOwnerId: string, order: any) {
    this.logger.log(`Emit order:new to business owner business:owner:${businessOwnerId}`);
    this.server.to(`business:owner:${businessOwnerId}`).emit(SocketEvents.ORDER_NEW, {
      order,
    });
  }

  /** Dispatches delivery request directly to assigned driver's app */
  emitDriverRequest(driverUserId: string, payload: { orderId: string; businessName: string; areaName: string; addressDetail?: string; total: number }) {
    this.logger.log(`Emit driver request to driver user:${driverUserId} for order:${payload.orderId}`);
    this.server.to(`user:${driverUserId}`).emit(SocketEvents.DRIVER_REQUEST, payload);
  }

  /** Broadcasts driver status switch globally for dashboards */
  emitDriverStatusChange(driverId: string, status: DriverStatus) {
    this.logger.log(`Broadcast driver status change: driver:${driverId} is now ${status}`);
    this.server.emit(SocketEvents.DRIVER_STATUS_CHANGE, {
      driverId,
      status,
    });
  }

  /** Alerts the business owner that the driver rejected the assignment */
  emitOrderDriverRejected(businessOwnerId: string, payload: { orderId: string; driverName: string }) {
    this.logger.log(`Emit driver rejected to business owner business:owner:${businessOwnerId} for order:${payload.orderId}`);
    this.server.to(`business:owner:${businessOwnerId}`).emit(SocketEvents.ORDER_DRIVER_REJECTED, payload);
  }
}
