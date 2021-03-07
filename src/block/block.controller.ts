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
   * Existing Account Notification Id 3493a5e76693c2e9c20c75df
   * this.block.create_notification({ type: 'account', url: 'http://898191d27b2f.ngrok.io/block/webhook' });
  */
  @Post('webhook')
  handleWebhook(@Body() webhook_response) {
    this.blockService.writeTransaction(webhook_response);
    return 'Received';
  }
}
