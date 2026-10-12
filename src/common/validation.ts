import { BadRequestException, ValidationPipe } from '@nestjs/common';

export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidUnknownValues: true,
    stopAtFirstError: true,
    transformOptions: { enableImplicitConversion: false },
    exceptionFactory: (errors) =>
      new BadRequestException({
        errors: [...new Set(errors.flatMap((error) => Object.values(error.constraints ?? {})))],
      }),
  });
}
