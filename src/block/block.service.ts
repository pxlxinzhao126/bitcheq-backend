import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import * as BlockIo from 'block_io';
import { AddressService } from 'src/address/address.service';
import { BTC_TESTNET_API_KEY } from 'src/config';
import { TransactionDto } from 'src/transaction/transaction.dto';
import { TransactionService } from 'src/transaction/transaction.service';
import { User } from 'src/users/users.schema';
import { UsersService } from 'src/users/users.service';

export type WebhookResult = { txid: string; operation: string };
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
      if (user.address) {
        return { data: { address: user.address} }
      } else {
        return await this.createNewAddress(username);
      }
    } else {
      this.logger.debug(`user ${username} does not exist`);
      throw new HttpException(
        'Username does not exist',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async createNewAddress(username: string) {
    const newAddress = await this.block.get_new_address({
      label: username + '-' + new Date().getTime(),
    });
    this.logger.debug(`new address is created ${JSON.stringify(newAddress)}`);
    await this.addressService.create({
      owner: username,
      createdDate: new Date().getTime(),
      ...newAddress.data,
    });
    this.userService.updateUserAddress(username, newAddress.data.address);
    return newAddress;
  }

  async writeTransaction(webhook_response): Promise<WebhookResult> {
    const data = webhook_response?.data;
    let response: WebhookResult = { txid: null, operation: null };

    if (this.isValidAddressNotification(webhook_response)) {
      response.txid = data.txid;
      this.logger.debug(
        `Received address type webhook ${JSON.stringify(webhook_response)}`,
      );
      if (await this.isNewTransaction(data)) {
        response.operation = 'created';
        await this.transactionService.create(
          data,
          await this.getAddressOwner(data.address),
        );
      } else {
        response.operation = 'updated';
        await this.transactionService.updateTransaction(data);
      }

      if (await this.isPendingTransaction(data)) {
        await this.updateUserBalance(data);
        await this.transactionService.completeTransaction(data.txid);
      }
    } else {
      this.logger.debug(
        `Received non-address type webhook ${JSON.stringify(webhook_response)}`,
      );
    }

    return response;
  }

  async getAddressOwner(address: string) {
    const addressEntity = await this.addressService.findOneByAddress(address);
    return addressEntity.owner;
  }

  private isValidAddressNotification(webhook_response: any) {
    const data = webhook_response?.data;

    return (
      webhook_response.type === 'address' && data && data.txid && data.address
    );
  }

  async isNewTransaction(data) {
    return !(await this.transactionService.findOne(data.txid));
  }

  async isPendingTransaction(data) {
    return !!(await this.transactionService.findPendingTransaction(data.txid));
  }

  async updateUserBalance(transactionDto: TransactionDto) {
    const { amount_sent, amount_received, address } = transactionDto;
    const addressEntity = await this.addressService.findOneByAddress(address);
    let user: User;
    if (amount_sent > 0) {
      this.logger.debug(`${addressEntity.owner} sent is ${amount_sent}`);
      user = await this.userService.spend(addressEntity.owner, amount_sent);
    }
    if (amount_received > 0) {
      this.logger.debug(`${addressEntity.owner} received ${amount_received}`);
      user = await this.userService.deposit(
        addressEntity.owner,
        amount_received,
      );
    }
    // User returned from findOneAndUpdate has the old balance
    const updatedUser = await this.userService.findOneByName(addressEntity.owner);
    this.logger.debug(`User ${updatedUser?.username} has balance ${updatedUser?.btcBalance}`);
  }
}
