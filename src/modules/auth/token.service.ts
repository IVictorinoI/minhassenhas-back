import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt from 'jsonwebtoken';
import { Environment } from '../../config/environment.js';

export interface AuthenticatedUser {
  _id: string;
  name?: string;
  email?: string;
}

@Injectable()
export class TokenService {
  constructor(private readonly config: ConfigService<Environment, true>) {}
  sign(user: AuthenticatedUser): string {
    return jwt.sign(user, this.config.get('AUTH_SECRET', { infer: true }), {
      expiresIn: '1d',
      algorithm: 'HS256',
    });
  }
  verify(token: unknown): AuthenticatedUser {
    if (typeof token !== 'string') throw new Error('Token inválido.');
    const payload = jwt.verify(token, this.config.get('AUTH_SECRET', { infer: true }), {
      algorithms: ['HS256'],
    });
    if (typeof payload === 'string' || typeof payload._id !== 'string' || !payload._id)
      throw new Error('Identidade inválida.');
    return {
      _id: payload._id,
      ...(typeof payload.name === 'string' ? { name: payload.name } : {}),
      ...(typeof payload.email === 'string' ? { email: payload.email } : {}),
    };
  }
}
