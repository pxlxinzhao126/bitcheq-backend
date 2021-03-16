import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';

export type UserDocument = User & mongoose.Document;

@Schema()
export class User {
  @Prop({ required: true })
  username: string;

  @Prop({ required: true })
  btcBalance: number;

  @Prop()
  pendingBtcBalance: number;

  @Prop({ required: true })
  createdDate: number;

  @Prop()
  address: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
