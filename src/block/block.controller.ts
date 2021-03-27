import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { BlockService } from './block.service';

@Controller('block')
export class BlockController {
  constructor(private blockService: BlockService) {}

  @Get('address')
  async getAddress(@Query('username') username) {
    if (username) {
      return await this.blockService.getUserAddress(username);
    }
    throw new HttpException('username is required', HttpStatus.BAD_REQUEST);
  }

  @Get('getTransactionFromBlock')
  async getTransactionFromBlock(@Query('address') address) {
    if (address) {
      return await this.blockService.getTransactionFromBlock(address);
    }
    throw new HttpException('address is required', HttpStatus.BAD_REQUEST);
  }

  @Post('withdraw')
  async withdraw(@Body() withdraw_data) {
    const { username, amount, toAddress } = withdraw_data;
    const res = await this.blockService.withdraw(username, amount, toAddress);
    return res;
  }

  @Post('estimate')
  async estimate(@Body() withdraw_data) {
    const { amount, toAddress } = withdraw_data;
    const res = await this.blockService.estimate(amount, toAddress);
    return res;
  }

  @Post('confirm')
  async confirm(@Body() data) {
    const { user } = data;
    const res = await this.blockService.confirmTransactions(user);
    return res;
  }

  /**
   * To open up local webhook endpoint to internet: ngrok http -host-header=rewrite localhost:3000
   */
  @Post('webhook')
  async handleWebhook(@Body() webhook_response) {
    const res = await this.blockService.writeTransaction(webhook_response);
    return `Transaction ${res.operation}: ${res?.txid}`;
  }

  @Post('notifications')
  async resetNotifications() {
    return await this.blockService.resetNotifications();
  }
}
