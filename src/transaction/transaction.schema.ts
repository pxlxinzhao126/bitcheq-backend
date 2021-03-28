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
  is_green: boolean;

  // When webhook is received, create a new transaction with pending status
  // Apply balance change to user balance, and then set status to complete
  @Prop()
  status: 'Pending' | 'Completed';

  // When deposit transaction is confirmed (confimations > 4), remove pending balance.
  @Prop()
  confirmed: boolean;

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
