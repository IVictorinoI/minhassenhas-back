import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

const required = (field: string): [true, string] => [true, `O atributo '${field}' é obrigatório.`];

@Schema({ collection: 'users' })
export class User {
  @Prop({ required: required('name') }) name!: string;
  @Prop({ required: required('email') }) email!: string;
  @Prop({ required: required('password') }) password!: string;
}
export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ email: 1 }, { unique: true, name: 'users_email_unique' });
