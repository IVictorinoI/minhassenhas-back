import 'reflect-metadata';
import { existsSync } from 'node:fs';
import mongoose from 'mongoose';
import { validateEnvironment } from '../config/environment.js';
import { User, UserSchema } from '../modules/users/schemas/user.schema.js';
import { Password, PasswordSchema } from '../modules/passwords/schemas/password.schema.js';

async function ensureIndexes(): Promise<void> {
  if (existsSync('.env')) process.loadEnvFile('.env');
  const config = validateEnvironment(process.env);
  await mongoose.connect(config.MONGODB_URI, { autoIndex: false, serverSelectionTimeoutMS: 10000 });
  try {
    // Apenas cria índices declarados. Não remove índices nem altera documentos.
    await mongoose.model(User.name, UserSchema).createIndexes();
    await mongoose.model(Password.name, PasswordSchema).createIndexes();
    console.log('Índices criados/verificados.');
  } finally {
    await mongoose.disconnect();
  }
}

void ensureIndexes().catch(() => {
  console.error(
    'Falha ao criar índices. Verifique conexão, permissões e e-mails duplicados antes de tentar novamente.',
  );
  process.exitCode = 1;
});
