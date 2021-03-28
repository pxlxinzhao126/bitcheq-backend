import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Req
} from '@nestjs/common';
import { Request } from 'express';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private userService: UsersService) {}

  @Get()
  async getUserByName(@Req() request: Request) {
    const username = request['user'] as string;
    return this.userService.mapUser(
      await this.userService.findOneByName(username),
    );
  }

  @Get('verifyEmail')
  async verifyEmailByName(@Req() request: Request) {
    const username = request['user'] as string;
    return this.userService.mapUserEmailOnly(
      await this.userService.findOneByName(username),
    );
  }

  @Post('create')
  async createUser(@Req() request: Request) {
    const username = request['user'] as string;
    if (!!await this.userService.findOneByName(username)) {
      throw new HttpException('Username taken', HttpStatus.BAD_REQUEST);
    }

    return this.userService.mapUser(await this.userService.create( username ));
  }
}
