import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema.js';

@Injectable()
export class UsersRepository {
  constructor(@InjectModel(User.name) private readonly model: Model<User>) {}
  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.model.findOne({ email });
  }
  async emailExists(email: string): Promise<boolean> {
    return Boolean(await this.model.exists({ email }));
  }
  create(user: User): Promise<UserDocument> {
    return this.model.create(user);
  }
}
