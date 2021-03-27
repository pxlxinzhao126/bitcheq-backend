import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TransactionDto } from './transaction.dto';
import { Transaction, TransactionDocument } from './transaction.schema';

const TX_PER_PAGE = 10;
const PENDING = 'Pending';
const COMPLETED = 'Completed';
@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
  ) {}

  async create(
    transactionDto: TransactionDto,
    owner: string,
  ): Promise<Transaction> {
    const newTransaction = {
      ...transactionDto,
      status: PENDING,
      confirmed: false,
      owner,
      createdDate: new Date().getTime(),
    };
    this.logger.debug(`create new transaction ${transactionDto.txid}`);
    const createdTransaction = new this.transactionModel(newTransaction);
    return createdTransaction.save();
  }

  async updateTransaction(
    transactionDto: TransactionDto,
  ): Promise<Transaction> {
    const txid = transactionDto.txid;
    this.logger.debug(`update transaction ${txid}`);
    return this.transactionModel.findOneAndUpdate(
      { txid },
      { ...transactionDto },
      { useFindAndModify: false },
    );
  }

  async findOne(txid: string): Promise<Transaction> {
    return this.transactionModel.findOne({ txid }).exec();
  }

  async findAllByAddress(address: string): Promise<Transaction[]> {
    return this.transactionModel
      .find({ address })
      .limit(TX_PER_PAGE)
      .sort({ createdDate: -1 })
      .exec();
  }

  async findAllByOwner(owner: string): Promise<Transaction[]> {
    return this.transactionModel
      .find({ owner })
      .limit(TX_PER_PAGE)
      .sort({ createdDate: -1 })
      .exec();
  }

  async findAllUnconfirmedByOwner(owner: string): Promise<Transaction[]> {
    return this.transactionModel
      .find({ owner, confirmed: false })
      .sort({ createdDate: -1 })
      .exec();
  }

  async findPendingTransaction(txid: string): Promise<Transaction> {
    return this.transactionModel.findOne({ txid, status: PENDING }).exec();
  }

  async completeTransaction(txid: string) {
    return this.transactionModel.findOneAndUpdate(
      { txid },
      { $set: { status: COMPLETED } },
      { useFindAndModify: false },
    );
  }

  async confirmTransaction(txid: string) {
    return this.transactionModel.findOneAndUpdate(
      { txid },
      { $set: { confirmed: true } },
      { useFindAndModify: false },
    );
  }

}
