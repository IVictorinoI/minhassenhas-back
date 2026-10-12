import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'node:crypto';
import { Environment } from '../../config/environment.js';

@Injectable()
export class CryptoService {
  constructor(private readonly config: ConfigService<Environment, true>) {}

  encryptionKey(): Buffer {
    const key = this.config.get('ENCRYPTION_KEY', { infer: true });
    if (!key || !/^[a-f\d]{64}$/i.test(key))
      throw new Error('ENCRYPTION_KEY deve conter 64 caracteres hexadecimais.');
    return Buffer.from(key, 'hex');
  }

  encrypt(content: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey(), iv);
    const data = Buffer.concat([cipher.update(content, 'utf8'), cipher.final()]);
    return [
      'v2',
      iv.toString('hex'),
      cipher.getAuthTag().toString('hex'),
      data.toString('hex'),
    ].join(':');
  }

  decrypt(content: string): string {
    if (content.startsWith('v2:')) {
      const parts = content.split(':');
      const [, iv, tag, data] = parts;
      if (
        parts.length !== 4 ||
        !iv ||
        !/^[a-f\d]{24}$/i.test(iv) ||
        !tag ||
        !/^[a-f\d]{32}$/i.test(tag) ||
        data === undefined ||
        !/^(?:[a-f\d]{2})*$/i.test(data)
      )
        throw new Error('Payload criptografado inválido.');
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        this.encryptionKey(),
        Buffer.from(iv, 'hex'),
      );
      decipher.setAuthTag(Buffer.from(tag, 'hex'));
      return Buffer.concat([decipher.update(Buffer.from(data, 'hex')), decipher.final()]).toString(
        'utf8',
      );
    }
    // Leitura apenas: compatibilidade EVP_BytesToKey com instalações anteriores.
    try {
      const password = Buffer.from('Abacaxi');
      const key = crypto.createHash('md5').update(password).digest();
      const iv = crypto
        .createHash('md5')
        .update(Buffer.concat([key, password]))
        .digest();
      const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
      const plain = Buffer.concat([
        decipher.update(Buffer.from(content, 'hex')),
        decipher.final(),
      ]).toString('utf8');
      const prefix = 'MinhasSenhasEncrypt-';
      return plain.startsWith(prefix) ? plain.slice(prefix.length) : content;
    } catch {
      return content;
    }
  }
}
