import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedUser, TokenService } from './token.service.js';

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly tokens: TokenService) {}
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (req.method === 'OPTIONS') return true;
    // Fontes legadas são mantidas até uma mudança coordenada com todos os clientes.
    const body: unknown = req.body;
    const bodyToken =
      typeof body === 'object' && body !== null && 'token' in body ? body.token : undefined;
    const rawToken: unknown = bodyToken || req.query.token || req.headers.authorization;
    const token = typeof rawToken === 'string' ? rawToken.replace(/^Bearer\s+/i, '') : '';
    if (!token) throw new ForbiddenException('No token provided.');
    try {
      req.user = this.tokens.verify(token);
      return true;
    } catch {
      throw new ForbiddenException('Failed to authenticate token.');
    }
  }
}
