import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as BlockIo from 'block_io';
import { UsersService } from 'src/users/users.service';

const API_KEY = '1886-c8a8-6818-3b4b';

@Injectable()
export class BlockService {
  block: BlockIo;

  constructor(private userService: UsersService) {
    this.block = new BlockIo(API_KEY);
  }

  /** 
     * Sample Response
     * {
            "status": "success",
            "data": {
                "network": "BTCTEST",
                "user_id": 2,
                "address": "2Mt4zyvxrCED7DixGM8t8xauKD3j9NcrrDV",
                "label": "ngeji22"
            }
        }
    */
  async getNewAddress(username: string) {
    const user = await this.userService.findOne(username);
    if (user) {
      const newAddress = await this.block.get_new_address();
      await this.userService.addAddress(username, newAddress.data.address);
    } else {
      throw new HttpException(
        'Username does not exist',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
