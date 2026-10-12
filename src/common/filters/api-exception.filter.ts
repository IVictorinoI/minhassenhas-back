import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Error as MongooseError } from 'mongoose';

@Injectable()
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);
  constructor(private readonly adapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.adapterHost;
    const response: unknown = host.switchToHttp().getResponse();
    if (httpAdapter.isHeadersSent(response)) {
      httpAdapter.end(response);
      return;
    }
    let status = 500;
    let errors = ['Erro interno do servidor.'];
    if (exception instanceof MongooseError.ValidationError) {
      status = 400;
      errors = Object.values(exception.errors).map((error) => error.message);
    } else if (exception instanceof MongooseError.CastError) {
      status = 400;
      errors = ['Identificador inválido.'];
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') errors = [body];
      else if ('errors' in body && Array.isArray(body.errors)) errors = body.errors.map(String);
      else if ('message' in body)
        errors = Array.isArray(body.message) ? body.message.map(String) : [String(body.message)];
    } else if (exception instanceof Error && 'status' in exception && exception.status === 400) {
      status = 400;
      errors = ['Corpo da requisição inválido.'];
    }
    // Não registrar exceções brutas: podem conter URI do banco, tokens ou credenciais.
    if (status >= 500) this.logger.error('Falha interna ao processar requisição.');
    httpAdapter.reply(response, { errors }, status);
  }
}
