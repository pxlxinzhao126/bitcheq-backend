import { Injectable } from '@nestjs/common';
import * as BlockIo from 'block_io';

const API_KEY = '1886-c8a8-6818-3b4b';

@Injectable()
export class BlockService {
  block: BlockIo;

  constructor() {
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
  async getNewAddress() {
    return await this.block.get_new_address();
  }
}
