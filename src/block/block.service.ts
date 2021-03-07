import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as BlockIo from 'block_io';
import { UsersService } from 'src/users/users.service';

const API_KEY = '1886-c8a8-6818-3b4b';

@Injectable()
export class BlockService {
  block: BlockIo;

  /**
   * Existing Account Notification Id 3493a5e76693c2e9c20c75df 
   * this.block.create_notification({ type: 'account', url: 'http://898191d27b2f.ngrok.io/block/webhook' });
   */
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
      const newAddress = await this.block.get_new_address({ label: username + '-' + new Date().getTime()});
      await this.userService.addAddress(username, newAddress.data.address);
      return newAddress;
    } else {
      throw new HttpException(
        'Username does not exist',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
