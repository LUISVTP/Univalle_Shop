import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true, collection: 'users' })
export class UserDocument {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true, select: false })
  passwordHash: string;

  createdAt?: Date;
}

export type UserHydratedDocument = HydratedDocument<UserDocument>;

export const UserSchema = SchemaFactory.createForClass(UserDocument);
