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

  /**
   * {
      status: 'success',
      data: {
        network: 'BTCTEST',
        txid: '6d0b41befd9dbbbc7f43c710b6227aefd8cc45ab935c25350b40d96526c153ff',
        amount_withdrawn: '0.00028055',
        amount_sent: '0.00017600',
        network_fee: '0.00010455',
        blockio_fee: '0.00000000'
      }
    }
   */
  @Post('withdraw')
  async withdraw(@Body() withdraw_data) {
    const {username, amount, toAddress} = withdraw_data;
    const res = await this.blockService.withdraw(username, amount, toAddress);
    return res;
  }

  @Post('estimate')
  async estimate(@Body() withdraw_data) {
    const {amount, toAddress} = withdraw_data;
    const res = await this.blockService.estimate(amount, toAddress);
    return res;
  }

  /**
   * To open up webhook endpoint to internet: ngrok http -host-header=rewrite localhost:3000
   * this.block.create_notification({ type: 'account', url: 'http://898191d27b2f.ngrok.io/block/webhook' });
   * block_io.delete_notification({ notification_id: 'NOTIFICATION ID' });
   */
  @Post('webhook')
  async handleWebhook(@Body() webhook_response) {
    const res = await this.blockService.writeTransaction(webhook_response);
    return `Transaction ${res.operation}: ${res?.txid}`;
  }
}
