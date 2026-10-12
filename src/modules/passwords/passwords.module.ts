import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { CryptoModule } from '../crypto/crypto.module.js';
import { PasswordsController } from './passwords.controller.js';
import { PasswordsRepository } from './passwords.repository.js';
import { PasswordsService } from './passwords.service.js';

@Module({
  imports: [AuthModule, CryptoModule],
  controllers: [PasswordsController],
  providers: [PasswordsService, PasswordsRepository],
})
export class PasswordsModule {}
