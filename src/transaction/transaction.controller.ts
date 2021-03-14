import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Query,
} from '@nestjs/common';
import { TransactionService } from './transaction.service';

@Controller('transactions')
export class TransactionsController {
  constructor(private transactionService: TransactionService) {}

  @Get(':txid')
  async getById(@Param('txid') txid) {
    return await this.transactionService.findOne(txid);
  }

  @Get('address/:address')
  async getByAddress(@Param('address') address) {
    return await this.transactionService.findAllByAddress(address);
  }

  @Get('owner/:owner')
  async getByOwner(@Param('owner') owner) {
    return await this.transactionService.findAllByOwner(owner);
  }

  @Get('unconfirmed/:username')
  async findAllUnconfirmedByOwner(@Param('username') username) {
    if (username) {
      return await this.transactionService.findAllUnconfirmedByOwner(username);
    }
    throw new HttpException('username is required', HttpStatus.BAD_REQUEST);
  }
}
