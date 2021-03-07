import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';

export type UserDocument = User & mongoose.Document;

@Schema()
export class User {
  @Prop({ required: true })
  username: string;

  @Prop({ required: true })
  password: string;

  @Prop(
    raw([
      {
        address: { type: String },
        used: { type: Boolean },
      },
    ]),
  )
  addresses: Record<string, any>[];
}

export const UserSchema = SchemaFactory.createForClass(User);
