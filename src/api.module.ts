import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ApiExceptionFilter } from './common/filters/api-exception.filter.js';
import { createValidationPipe } from './common/validation.js';
import { Environment } from './config/environment.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { PasswordsModule } from './modules/passwords/passwords.module.js';

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    PasswordsModule,
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Environment, true>) => [
        {
          ttl: config.get('AUTH_RATE_TTL_MS', { infer: true }) ?? 60000,
          limit: config.get('AUTH_RATE_LIMIT', { infer: true }) ?? 20,
        },
      ],
    }),
  ],
  providers: [
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
    { provide: APP_PIPE, useFactory: createValidationPipe },
  ],
})
export class ApiModule {}
