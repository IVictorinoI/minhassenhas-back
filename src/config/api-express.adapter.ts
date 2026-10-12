import { BadRequestException } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';

// Normaliza antes que o adaptador perca o tipo original da exceção de parsing.
export class ApiExpressAdapter extends ExpressAdapter {
  override mapException(error: unknown): unknown {
    if (error instanceof SyntaxError || error instanceof URIError) {
      return new BadRequestException('Corpo da requisição inválido.');
    }
    return super.mapException(error);
  }
}
