import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TransactionDto } from './transaction.dto';
import { Transaction, TransactionDocument } from './transaction.schema';

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
  ) {}

  async create(transactionDto: TransactionDto): Promise<Transaction> {
    const newTransaction = { ...transactionDto, status: 'Pending' };
    this.logger.debug(
      `create new trasaction ${JSON.stringify(newTransaction)}`,
    );
    const createdTransaction = new this.transactionModel(newTransaction);
    return createdTransaction.save();
  }

  async updateTransaction(
    transactionDto: TransactionDto,
  ): Promise<Transaction> {
    const txid = transactionDto.txid;
    this.logger.debug(
      `update trasaction ${txid} with ${JSON.stringify(transactionDto)}`,
    );
    return this.transactionModel.findOneAndUpdate(
      { txid },
      { ...transactionDto },
      { useFindAndModify: false },
    );
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
    return this.transactionModel.findOneAndUpdate(
      { txid },
      { $set: { status: 'Completed' } },
      { useFindAndModify: false },
    );
  }
}
