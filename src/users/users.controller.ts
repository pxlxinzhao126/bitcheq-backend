import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { CreateUserDto } from './users.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private userService: UsersService) {}

  @Post('create')
  async createUser(@Body() createUserDto: CreateUserDto) {
    if (!createUserDto.username || !createUserDto.password) {
      throw new HttpException(
        'Must provide username and password',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!!(await this.userService.findOne(createUserDto.username))) {
      throw new HttpException('Username taken', HttpStatus.BAD_REQUEST);
    }

    const user = await this.userService.create(createUserDto);
    return `created user ${createUserDto.username}`;
  }
}
