import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { UserDto } from './users.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private userService: UsersService) {}

  @Post('create')
  async createUser(@Body() userDto: UserDto) {
    if (!userDto.username) {
      throw new HttpException(
        'Must provide username',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!!(await this.userService.findOneByName(userDto.username))) {
      throw new HttpException('Username taken', HttpStatus.BAD_REQUEST);
    }

    return this.userService.mapUserToReturn(
      await this.userService.create(userDto),
    );
  }

  @Get()
  async getUserByName(@Query('username') username) {
    return this.userService.mapUserToReturn(
      await this.userService.findOneByName(username),
    );
  }
}
