import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Environment } from '../config/environment.js';
import { User, UserSchema } from '../modules/users/schemas/user.schema.js';
import { Password, PasswordSchema } from '../modules/passwords/schemas/password.schema.js';

@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Environment, true>) => ({
        uri: config.get('MONGODB_URI', { infer: true }),
        serverSelectionTimeoutMS: 10000,
        retryAttempts: 1,
        autoIndex: false,
      }),
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Password.name, schema: PasswordSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
