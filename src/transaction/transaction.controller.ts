import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { TransactionDto } from './transaction.dto';
import { TransactionService } from './transaction.service';

@Controller('transactions')
export class TransactionsController {
  constructor(private transactionService: TransactionService) {}

  @Get()
  async getAllTransactions() {
    return await this.transactionService.findAll();
  }
}
