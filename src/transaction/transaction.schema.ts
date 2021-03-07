import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';

export type TransactionDocument = Transaction & mongoose.Document;

@Schema()
export class Transaction {
  @Prop({ required: true })
  txid: string;

  @Prop()
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
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
