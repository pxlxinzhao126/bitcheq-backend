import {
  Controller,
  Get,
  Req
} from '@nestjs/common';
import { Request } from 'express';
import { TransactionService } from './transaction.service';

@Controller('transactions')
export class TransactionsController {
  constructor(private transactionService: TransactionService) {}

  @Get()
  async get(@Req() request: Request) {
    const username = request['user'] as string;
    return await this.transactionService.findAllByOwner(username);
  }
}
