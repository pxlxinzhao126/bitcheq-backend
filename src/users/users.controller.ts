import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { UserDto } from './users.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private userService: UsersService) {}

  @Post('create')
  async createUser(@Body() userDto: UserDto) {
    if (!userDto.username || !userDto.password) {
      throw new HttpException(
        'Must provide username and password',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!!(await this.userService.findOne(userDto.username))) {
      throw new HttpException('Username taken', HttpStatus.BAD_REQUEST);
    }

    const user = await this.userService.create(userDto);
    return `created user ${userDto.username}`;
  }
}
