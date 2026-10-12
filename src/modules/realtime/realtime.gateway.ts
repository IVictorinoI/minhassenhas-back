import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway } from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Socket } from 'socket.io';

// Compatibilidade: não há eventos de negócio nem acesso a credenciais neste namespace.
@WebSocketGateway({ namespace: '/api/' })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);
  handleConnection(_socket: Socket): void {
    this.logger.debug('Socket conectado.');
  }
  handleDisconnect(_socket: Socket): void {
    this.logger.debug('Socket desconectado.');
  }
}
