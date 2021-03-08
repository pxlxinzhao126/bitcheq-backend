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
    const user = await this.userService.findOneByName(username);
    if (user) {
      return user.address || (await this.createNewAddress(username));
    } else {
      this.logger.debug(`user ${username} does not exist`);
      this.userDoesNotExist();
    }
  }

  async createNewAddress(username: string) {
    const newAddress = await this.block.get_new_address({
      label: username + '-' + new Date().getTime(),
    });
    this.logger.debug(`new address is created ${JSON.stringify(newAddress)}`);
    await this.addressService.create({
      owner: username,
      used: false,
      ...newAddress.data,
    });
    this.userService.updateUserAddress(username, newAddress.data.address);
    return newAddress;
  }

  async writeTransaction(webhook_response) {
    const data = webhook_response.data;

    if (
      webhook_response.type === 'address' &&
      data &&
      data.txid &&
      data.address
    ) {
      if (await this.isNewTransaction(data)) {
        const addressEntity = await this.addressService.findOneByAddress(
          data.address,
        );
        await this.transactionService.create(data, addressEntity.owner);
      } else {
        await this.transactionService.updateTransaction(data);
      }

      if (await this.isPendingTransaction(data)) {
        await this.updateUserBalance(data);
        await this.transactionService.completeTransaction(data.txid);
      }
    }

    return await this.transactionService.findOne(data?.txid);
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
