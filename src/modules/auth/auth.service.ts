import { BadRequestException, Injectable } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { UsersRepository } from '../users/users.repository.js';
import { AuthResponseDto, LoginDto, SignupDto } from './dto/auth.dto.js';
import { TokenService } from './token.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersRepository,
    private readonly tokens: TokenService,
  ) {}

  async login({ email = '', password = '' }: LoginDto): Promise<AuthResponseDto> {
    const user = await this.users.findByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password)))
      throw new BadRequestException('Usuário/Senha inválidos.');
    return {
      name: user.name,
      email: user.email,
      token: this.tokens.sign({ _id: user._id.toString(), name: user.name, email: user.email }),
    };
  }

  async signup({
    name = '',
    email = '',
    password = '',
    confirm_password = '',
  }: SignupDto): Promise<AuthResponseDto> {
    if (!/\S+@\S+\.\S+/.test(email))
      throw new BadRequestException('O e-mail informado está inválido.');
    if (!name.trim() || !password || Buffer.byteLength(password) > 72)
      throw new BadRequestException('Informe nome e senha de até 72 bytes.');
    if (password !== confirm_password) throw new BadRequestException('Senhas não conferem.');
    if (await this.users.emailExists(email))
      throw new BadRequestException('Usuário já cadastrado.');
    try {
      await this.users.create({ name, email, password: await bcrypt.hash(password, 12) });
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
        throw new BadRequestException('Usuário já cadastrado.');
      }
      throw error;
    }
    return this.login({ email, password });
  }

  validateToken(token: unknown): { valid: boolean } {
    try {
      this.tokens.verify(token);
      return { valid: true };
    } catch {
      return { valid: false };
    }
  }
}
