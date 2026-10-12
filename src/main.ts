import 'reflect-metadata';
import { INestApplication, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './config/configure-app.js';
import { Environment } from './config/environment.js';
import { ApiExpressAdapter } from './config/api-express.adapter.js';

async function bootstrap(): Promise<void> {
  let app: INestApplication | undefined;
  try {
    app = await NestFactory.create(AppModule, new ApiExpressAdapter(), { abortOnError: false });
    configureApp(app);
    app.enableShutdownHooks();
    const config = app.get<ConfigService<Environment, true>>(ConfigService);
    await app.listen(config.get('PORT', { infer: true }));
    new Logger('Bootstrap').log(`API disponível na porta ${config.get('PORT', { infer: true })}.`);
  } catch (error: unknown) {
    await app?.close();
    throw error;
  }
}

void bootstrap().catch(() => {
  // Não incluir a exceção bruta nesta mensagem operacional.
  new Logger('Bootstrap').error(
    'Falha ao iniciar a API. Verifique a configuração e a disponibilidade do MongoDB.',
  );
  process.exitCode = 1;
});
