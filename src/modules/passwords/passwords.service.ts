import { Injectable, NotFoundException } from '@nestjs/common';
import { CryptoService } from '../crypto/crypto.service.js';
import {
  CreatePasswordDto,
  PasswordSummaryDto,
  RevealedPasswordDto,
  UpdatePasswordDto,
} from './dto/password.dto.js';
import { PasswordsRepository } from './passwords.repository.js';
import { PasswordDocument } from './schemas/password.schema.js';

@Injectable()
export class PasswordsService {
  constructor(
    private readonly passwords: PasswordsRepository,
    private readonly crypto: CryptoService,
  ) {}
  private summary(doc: PasswordDocument): PasswordSummaryDto {
    return {
      _id: doc._id.toString(),
      description: doc.description,
      login: doc.login,
      url: doc.url,
    };
  }
  private required(doc: PasswordDocument | null): PasswordDocument {
    if (!doc) throw new NotFoundException('Senha não encontrada.');
    return doc;
  }
  async list(user: string): Promise<PasswordSummaryDto[]> {
    return (await this.passwords.listOwned(user)).map((doc) => this.summary(doc));
  }
  async reveal(id: string, user: string): Promise<RevealedPasswordDto> {
    return {
      password: this.crypto.decrypt(
        this.required(await this.passwords.findOwned(id, user)).password,
      ),
    };
  }
  async create(user: string, dto: CreatePasswordDto): Promise<PasswordSummaryDto> {
    // A persistência recebe somente ciphertext. Não depende de hooks do ORM.
    const doc = await this.passwords.create({
      description: dto.description,
      login: dto.login,
      url: dto.url,
      password: this.crypto.encrypt(dto.password),
      user,
    });
    return this.summary(doc);
  }
  async update(id: string, user: string, dto: UpdatePasswordDto): Promise<PasswordSummaryDto> {
    const data: UpdatePasswordDto = {};
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.login !== undefined) data.login = dto.login;
    if (dto.url !== undefined) data.url = dto.url;
    if (dto.password !== undefined) data.password = this.crypto.encrypt(dto.password);
    return this.summary(this.required(await this.passwords.updateOwned(id, user, data)));
  }
  async remove(id: string, user: string): Promise<PasswordSummaryDto> {
    return this.summary(this.required(await this.passwords.deleteOwned(id, user)));
  }
}
