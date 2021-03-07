import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { BlockService } from './block.service';

@Controller('block')
export class BlockController {
  constructor(
    private blockService: BlockService,
    private userService: UsersService,
  ) {}

  @Get('new')
  async getNewAddress(@Query('username') username) {
    if (username) {
      return await this.blockService.getNewAddress(username);
    }
    throw new HttpException('username is required', HttpStatus.BAD_REQUEST);
  }
}
