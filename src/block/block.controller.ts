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

  @Get('new')
  async getNewAddress(@Query('username') username) {
    if (username) {
      return await this.blockService.getNewAddress(username);
    }
    throw new HttpException('username is required', HttpStatus.BAD_REQUEST);
  }

  @Post('webhook')
  handleWebhook(@Body() webhook_response) {
    this.blockService.writeTransaction(webhook_response);
    return 'Received';
  }
}
