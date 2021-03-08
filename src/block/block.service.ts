import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import * as BlockIo from 'block_io';
import { AddressService } from 'src/address/address.service';
import { TransactionDto } from 'src/transaction/transaction.dto';
import { TransactionService } from 'src/transaction/transaction.service';
import { UsersService } from 'src/users/users.service';

const BTC_TESTNET_API_KEY = '1886-c8a8-6818-3b4b';

@Injectable()
export class BlockService {
  block: BlockIo;
  private readonly logger = new Logger(BlockService.name);

  constructor(
    private userService: UsersService,
    private transactionService: TransactionService,
    private addressService: AddressService,
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
      ...newAddress.data,
    });
    return newAddress;
  }

  async writeTransaction(webhook_response) {
    const data = webhook_response.data;

    if (webhook_response.type === 'address' && data && data.txid) {
      if (await this.isNewTransaction(data)) {
        await this.transactionService.create(data);
      } else {
        await this.transactionService.updateTransaction(data);
      }

      if (await this.isPendingTransaction(data)) {
        await this.updateUserBalance(data);
        await this.transactionService.completeTransaction(data.txid);
      }
    }
  }

  async isNewTransaction(data) {
    return !(await this.transactionService.findOne(data.txid));
  }

  async isPendingTransaction(data) {
    return !!(await this.transactionService.findPendingTransaction(data.txid));
  }

  userDoesNotExist() {
    throw new HttpException('Username does not exist', HttpStatus.BAD_REQUEST);
  }

  async updateUserBalance(transactionDto: TransactionDto) {
    this.logger.debug(`Updating user balance`);
    const { amount_sent, amount_received, address } = transactionDto;
    const addressEntity = await this.addressService.findOneByAddress(address);
    if (amount_sent > 0) {
      this.logger.debug(`amount_sent is ${amount_sent}`);
      await this.userService.spend(addressEntity.owner, amount_sent);
    }
    if (amount_received > 0) {
      this.logger.debug(`amount_received is ${amount_received}`);
      await this.userService.deposit(addressEntity.owner, amount_received);
    }
    this.logger.debug(`User balance updated`);
  }
}
