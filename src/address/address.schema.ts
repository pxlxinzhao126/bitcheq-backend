import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';

export type AddressDocument = Address & mongoose.Document;

@Schema()
export class Address {
  @Prop({ required: true })
  network: string;

  @Prop()
  user_id: number;

  @Prop({ required: true })
  address: string;

  @Prop()
  label: string;

  @Prop({ required: true })
  owner: string;

  @Prop({ required: true })
  used: string;
}

export const AddressSchema = SchemaFactory.createForClass(Address);
