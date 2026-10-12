import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Password, PasswordDocument } from './schemas/password.schema.js';
import { UpdatePasswordDto } from './dto/password.dto.js';

export interface StoredPasswordInput {
  description: string;
  login: string;
  url?: string;
  password: string;
  user: string;
}

@Injectable()
export class PasswordsRepository {
  constructor(@InjectModel(Password.name) private readonly model: Model<Password>) {}
  async listOwned(user: string): Promise<PasswordDocument[]> {
    return this.model.find({ user }).sort('description');
  }
  async findOwned(_id: string, user: string): Promise<PasswordDocument | null> {
    return this.model.findOne({ _id, user });
  }
  create(data: StoredPasswordInput): Promise<PasswordDocument> {
    return this.model.create(data);
  }
  async updateOwned(
    _id: string,
    user: string,
    data: UpdatePasswordDto,
  ): Promise<PasswordDocument | null> {
    const doc = await this.findOwned(_id, user);
    if (!doc) return null;
    doc.set(data);
    return doc.save();
  }
  async deleteOwned(_id: string, user: string): Promise<PasswordDocument | null> {
    return this.model.findOneAndDelete({ _id, user });
  }
}
