require('reflect-metadata');
const { Global, Module, HttpException } = require('@nestjs/common');
const { Test } = require('@nestjs/testing');
const { ConfigModule, ConfigService } = require('@nestjs/config');
const { getModelToken } = require('@nestjs/mongoose');
const mongoose = require('mongoose');
const { UserSchema } = require('../../dist/modules/users/schemas/user.schema');
const { PasswordSchema } = require('../../dist/modules/passwords/schemas/password.schema');
const { CryptoService } = require('../../dist/modules/crypto/crypto.service');
const { UsersRepository } = require('../../dist/modules/users/users.repository');
const { PasswordsRepository } = require('../../dist/modules/passwords/passwords.repository');
const { PasswordsService } = require('../../dist/modules/passwords/passwords.service');
const { AuthService } = require('../../dist/modules/auth/auth.service');
const { AuthGuard } = require('../../dist/modules/auth/auth.guard');
const { TokenService } = require('../../dist/modules/auth/token.service');
const { createValidationPipe } = require('../../dist/common/validation');
const { LoginDto, SignupDto, ValidateTokenDto } = require('../../dist/modules/auth/dto/auth.dto');
const { validateEnvironment } = require('../../dist/config/environment');
const { configureApp } = require('../../dist/config/configure-app');
const { ApiExpressAdapter } = require('../../dist/config/api-express.adapter');
const { ApiModule } = require('../../dist/api.module');
const { RealtimeModule } = require('../../dist/modules/realtime/realtime.module');

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Password = mongoose.models.Password || mongoose.model('Password', PasswordSchema);
const config = new ConfigService();
const crypto = new CryptoService(config);
const crypter = {
  encrypt: (value) => crypto.encrypt(value),
  decrypt: (value) => crypto.decrypt(value),
  encryptionKey: () => crypto.encryptionKey(),
};
const users = new UsersRepository(User);
const passwords = new PasswordsRepository(Password);
const passwordsService = new PasswordsService(passwords, crypto);
const tokens = new TokenService(config);
const authService = new AuthService(users, tokens);
const guard = new AuthGuard(tokens);
const pipe = createValidationPipe();

class TestPersistenceModule {}
Global()(TestPersistenceModule);
Module({
  providers: [
    { provide: getModelToken('User'), useValue: User },
    { provide: getModelToken('Password'), useValue: Password },
  ],
  exports: [getModelToken('User'), getModelToken('Password')],
})(TestPersistenceModule);

async function createTestApp(options = {}) {
  const module = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
        validate: (input) =>
          validateEnvironment({
            ...input,
            AUTH_RATE_LIMIT: options.rateLimit ?? 1000,
            AUTH_RATE_TTL_MS: 60000,
            SWAGGER_ENABLED: options.swagger ?? false,
            CORS_ORIGINS: options.origins ?? '*',
          }),
      }),
      TestPersistenceModule,
      ApiModule,
      RealtimeModule,
    ],
  }).compile();
  const app = module.createNestApplication(new ApiExpressAdapter(), { logger: false });
  configureApp(app);
  return app;
}

// Adaptadores exclusivos de teste: preservam as asserções anteriores enquanto
// exercitam o DTO/ValidationPipe, service e guard reais do Nest.
function writeException(error, res) {
  if (!(error instanceof HttpException)) throw error;
  const body = error.getResponse();
  res
    .status(error.getStatus())
    .json({ errors: typeof body === 'string' ? [body] : body.errors || [body.message] });
}
const service = {};
for (const [name, Dto] of [
  ['login', LoginDto],
  ['signup', SignupDto],
]) {
  service[name] = async (req, res) => {
    try {
      const dto = await pipe.transform(req.body, { type: 'body', metatype: Dto });
      res.json(await authService[name](dto));
    } catch (error) {
      writeException(error, res);
    }
  };
}
service.validateToken = (req, res) => res.json(authService.validateToken(req.body?.token));
function auth(req, res, next) {
  try {
    if (guard.canActivate({ switchToHttp: () => ({ getRequest: () => req }) })) next();
  } catch (error) {
    writeException(error, res);
  }
}

module.exports = {
  createTestApp,
  User,
  Password,
  crypter,
  service,
  auth,
  passwordsService,
  passwords,
  tokens,
  config,
  ValidateTokenDto,
};
