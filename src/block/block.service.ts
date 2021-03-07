import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as BlockIo from 'block_io';
import { AddressService } from 'src/address/address.service';
import { TransactionService } from 'src/transaction/transaction.service';
import { UsersService } from 'src/users/users.service';

const BTC_TESTNET_API_KEY = '1886-c8a8-6818-3b4b';

@Injectable()
export class BlockService {
  block: BlockIo;

  constructor(
    private userService: UsersService,
    private transactionService: TransactionService,
    private addressService: AddressService
  ) {
    this.block = new BlockIo(BTC_TESTNET_API_KEY);
  }

  async getUserAddress(username: string) {
    if (this.userExists(username)) {
      const unusedAddress = await this.findUnusedAddress(username);
      if (unusedAddress) {
        return unusedAddress;
      } else {
        const newAddress = await this.createNewAddress(username);
        return newAddress;
      }
    } else {
      this.userDoesNotExist();
    }
  }

  async userExists(username: string) {
    return !!(await this.userService.findOne(username));
  }

  async findUnusedAddress(username) {
    return await this.addressService.findUnusedAddress(username);
  }

  async createNewAddress(username: string) {
    const newAddress = await this.block.get_new_address({
      label: username + '-' + new Date().getTime(),
    });
    this.addressService.create({
      owner: username,
      used: false,
      ...newAddress.data
    });
  }

  async writeTransaction(webhook_response) {
    if (
      webhook_response.type === 'address' &&
      webhook_response.data &&
      webhook_response.data.txid
    ) {
      this.transactionService.create(webhook_response.data);
    }
  }

  userDoesNotExist() {
    throw new HttpException(
      'Username does not exist',
      HttpStatus.BAD_REQUEST,
    );
  }
}
