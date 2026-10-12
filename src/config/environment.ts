export interface Environment {
  NODE_ENV: 'development' | 'test' | 'production';
  PORT: number;
  MONGODB_URI: string;
  AUTH_SECRET: string;
  ENCRYPTION_KEY: string;
  CORS_ORIGINS: string;
  SWAGGER_ENABLED: boolean;
  AUTH_RATE_LIMIT: number;
  AUTH_RATE_TTL_MS: number;
}

export function validateEnvironment(input: Record<string, unknown>): Environment {
  const secret = input.AUTH_SECRET;
  if (typeof secret !== 'string' || secret.length < 32) {
    throw new Error('Defina AUTH_SECRET com pelo menos 32 caracteres.');
  }
  const key = input.ENCRYPTION_KEY;
  if (typeof key !== 'string' || !/^[a-f\d]{64}$/i.test(key)) {
    throw new Error('ENCRYPTION_KEY deve conter 64 caracteres hexadecimais.');
  }
  const nodeEnv = input.NODE_ENV ?? 'development';
  if (typeof nodeEnv !== 'string' || !['development', 'test', 'production'].includes(nodeEnv)) {
    throw new Error('NODE_ENV deve ser development, test ou production.');
  }
  const positiveInteger = (name: string, fallback: number): number => {
    const value = Number(input[name] ?? fallback);
    if (!Number.isSafeInteger(value) || value <= 0)
      throw new Error(`${name} deve ser um inteiro positivo.`);
    return value;
  };
  const port = positiveInteger('PORT', 3000);
  if (port > 65535) throw new Error('PORT deve ser menor ou igual a 65535.');
  const uri = input.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/minhassenhas';
  if (typeof uri !== 'string' || !/^mongodb(\+srv)?:\/\//.test(uri))
    throw new Error('MONGODB_URI deve ser uma URI MongoDB.');
  const origins = input.CORS_ORIGINS ?? '*';
  if (typeof origins !== 'string') throw new Error('CORS_ORIGINS deve ser uma string.');
  if (
    origins !== '*' &&
    (!origins.trim() ||
      origins.split(',').some((origin) => {
        try {
          return !['http:', 'https:'].includes(new URL(origin.trim()).protocol);
        } catch {
          return true;
        }
      }))
  )
    throw new Error('CORS_ORIGINS deve conter * ou origens HTTP separadas por vírgula.');
  const swagger = input.SWAGGER_ENABLED ?? (nodeEnv !== 'production' ? 'true' : 'false');
  if (![true, false, 'true', 'false'].includes(swagger as string | boolean)) {
    throw new Error('SWAGGER_ENABLED deve ser true ou false.');
  }
  return {
    NODE_ENV: nodeEnv as Environment['NODE_ENV'],
    PORT: port,
    MONGODB_URI: uri,
    AUTH_SECRET: secret,
    ENCRYPTION_KEY: key,
    CORS_ORIGINS: origins,
    SWAGGER_ENABLED: swagger === true || swagger === 'true',
    AUTH_RATE_LIMIT: positiveInteger('AUTH_RATE_LIMIT', 20),
    AUTH_RATE_TTL_MS: positiveInteger('AUTH_RATE_TTL_MS', 60000),
  };
}

export function corsOrigin(value: string): string | string[] {
  return value === '*' ? '*' : value.split(',').map((origin) => origin.trim());
}
