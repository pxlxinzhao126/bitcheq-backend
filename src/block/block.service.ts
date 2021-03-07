import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as BlockIo from 'block_io';
import { AddressService } from 'src/address/address.service';
import { TransactionDto } from 'src/transaction/transaction.dto';
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
    if (await this.userExists(username)) {
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
    return !!(await this.userService.findOneByName(username));
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
    return newAddress;
  }

  async writeTransaction(webhook_response) {
    if (
      webhook_response.type === 'address' &&
      webhook_response.data &&
      webhook_response.data.txid
    ) {
      await this.transactionService.create(webhook_response.data);
      await this.updateUserBalance(webhook_response.data);
    }
  }

  userDoesNotExist() {
    throw new HttpException(
      'Username does not exist',
      HttpStatus.BAD_REQUEST,
    );
  }

  async updateUserBalance(transactionDto: TransactionDto) {
    const { amount_sent, amount_received, address } = transactionDto;
    const addressEntity = await this.addressService.findOneByAddress(address);
    if (amount_sent > 0) {
      this.userService.spend(addressEntity.owner, amount_sent);
    }
    if (amount_received > 0) {
      this.userService.deposit(addressEntity.owner, amount_received);
    }
  }
}
