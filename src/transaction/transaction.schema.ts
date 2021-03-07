import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';

export type TransactionDocument = Transaction & mongoose.Document;

@Schema()
export class Transaction {
  @Prop({ required: true })
  txid: string;

  @Prop({ required: true })
  network: string;

  @Prop({ required: true })
  address: string;

  @Prop({ required: true })
  balance_change: number;

  @Prop({ required: true })
  amount_sent: number;

  @Prop({ required: true })
  amount_received: number;

  @Prop({ required: true })
  confirmations: number;

  @Prop({ required: true })
  is_green: boolean;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
