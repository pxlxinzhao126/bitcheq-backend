import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TransactionDto } from './transaction.dto';
import { Transaction, TransactionDocument } from './transaction.schema';

@Injectable()
export class TransactionService {
  constructor(
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
  ) {}

  async create(transactionDto: TransactionDto): Promise<Transaction> {
    const createdTransaction = new this.transactionModel({...transactionDto, status: 'Pending'});
    return createdTransaction.save();
  }

  async findAll(): Promise<Transaction[]> {
    return this.transactionModel.find().exec();
  }

  async findOne(txid: string): Promise<Transaction> {
    return this.transactionModel.findOne({ txid }).exec();
  }

  async findPendingTransaction(txid: string): Promise<Transaction> {
      return this.transactionModel.findOne({ txid, status: 'Pending' }).exec();
  }

  async completeTransaction(txid: string) {
      return this.transactionModel.findOneAndUpdate( {txid}, {$set: {status: 'Completed'}}, { useFindAndModify: false });
  }
}
