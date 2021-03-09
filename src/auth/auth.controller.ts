import { Controller, Get, Post, Req, Request } from '@nestjs/common';

@Controller()
export class AuthController {
  @Post('auth/login')
  async login(@Request() req) {
    return req.user;
  }

  @Get('/hello')
  getHello(@Req() request: Request): string {
    return 'Hello ' + request['user']?.email + '!';
  }

  @Get()
  helloWorld(@Req() request: Request): string {
    return 'Hello World';
  }
}
