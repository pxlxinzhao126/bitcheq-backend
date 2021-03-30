import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { BlockService } from './block.service';

@Controller('block')
export class BlockController {
  constructor(private blockService: BlockService) {}

  @Get('address')
  async getAddress(@Req() request: Request) {
    const username = request['user'] as string;
    return await this.blockService.getUserAddress(username);
  }

  @Post('withdraw')
  async withdraw(@Body() withdraw_data, @Req() request: Request) {
    const username = request['user'] as string;
    const { amount, toAddress } = withdraw_data;
    const res = await this.blockService.withdraw(username, amount, toAddress);
    return res;
  }

  /**
   *  available_balance: "0.05481701"
      blockio_fee: "0.01000000"
      error_message: "Cannot withdraw funds without Network Fee of 0.00082040 BTCTEST. Maximum withdrawable balance is 0.04399661 BTCTEST."
      estimated_max_custom_network_fee: "0.01758000"
      estimated_min_custom_network_fee: "0.00011720"
      estimated_network_fee: "0.00082040"
      max_withdrawal_available: "0.04399661"
      minimum_balance_needed: "1.01000000"
   * @param withdraw_data 
   * @returns 
   */
  @Post('estimate')
  async estimate(@Body() withdraw_data) {
    const { amount, toAddress } = withdraw_data;
    try {
      const res = await this.blockService.estimate(amount, toAddress);
      return res;
    } catch(err) {
      return err;
    }

  }

  @Post('confirm')
  async confirm(@Req() request: Request) {
    const username = request['user'] as string;
    const res = await this.blockService.confirmTransactions(username);
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
