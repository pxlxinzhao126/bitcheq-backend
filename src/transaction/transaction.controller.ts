import { Controller, Get, Param, Query } from '@nestjs/common';
import { TransactionService } from './transaction.service';

@Controller('transactions')
export class TransactionsController {
  constructor(private transactionService: TransactionService) {}

  @Get('address/:address')
  async getByAddress(@Param('address') address) {
    return (
      (await this.transactionService.findOneByAddress(address)) ||
      'No transaction found'
    );
  }

  @Get('owner/:owner')
  async getByOwner(@Param('owner') owner) {
    return await this.transactionService.findAllByOwner(owner);
  }

  @Get()
  async getAllTransactions() {
    return await this.transactionService.findAll();
  }
}
