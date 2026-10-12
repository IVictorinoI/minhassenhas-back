import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Environment, corsOrigin } from './environment.js';
import { SocketAdapter } from './socket.adapter.js';
import { NextFunction, Request, Response } from 'express';

export function configureApp(app: INestApplication): void {
  const config = app.get<ConfigService<Environment, true>>(ConfigService);
  app.useSecurityHeaders();
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  const origin = corsOrigin(config.get('CORS_ORIGINS', { infer: true }) ?? '*');
  app.enableCors({
    origin,
    methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  });
  app.useWebSocketAdapter(new SocketAdapter(app, origin));
  if (config.get('SWAGGER_ENABLED', { infer: true })) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Minhas Senhas API')
        .setDescription('Autenticação e gerenciamento de credenciais pessoais.')
        .setVersion('1.0')
        .addBearerAuth()
        .build(),
    );
    SwaggerModule.setup('docs', app, document, { swaggerOptions: { persistAuthorization: false } });
  }
}
