import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';

export type TransactionDocument = Transaction & mongoose.Document;

@Schema()
export class Transaction {
  @Prop({ required: true })
  txid: string;

  @Prop({ required: true })
  network: string;

  @Prop()
  address: string;

  @Prop()
  balance_change: number;

  @Prop()
  amount_sent: number;

  @Prop()
  amount_received: number;

  @Prop()
  confirmations: number;

  @Prop()
  is_green: boolean;

  @Prop()
  status: 'Pending' | 'Completed';

  @Prop()
  owner: string;

  @Prop({ required: true })
  createdDate: number;

  @Prop()
  amount_withdrawn: number;

  @Prop()
  network_fee: number;

  @Prop()
  blockio_fee: number;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
