import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongoSchema, Types } from 'mongoose';

const required = (field: string): [true, string] => [true, `O atributo '${field}' é obrigatório.`];

@Schema({ collection: 'passwords' })
export class Password {
  @Prop({ required: required('description') }) description!: string;
  @Prop({ required: required('login') }) login!: string;
  @Prop() url?: string;
  @Prop({ required: required('password') }) password!: string;
  @Prop({ type: MongoSchema.Types.ObjectId, ref: 'User', required: required('user') })
  user!: Types.ObjectId;
}
export type PasswordDocument = HydratedDocument<Password>;
export const PasswordSchema = SchemaFactory.createForClass(Password);
PasswordSchema.index({ user: 1, description: 1 }, { name: 'passwords_user_description' });
