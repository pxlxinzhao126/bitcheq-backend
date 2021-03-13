import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import * as BlockIo from 'block_io';
import { AddressService } from 'src/address/address.service';
import { TransactionDto } from 'src/transaction/transaction.dto';
import { TransactionService } from 'src/transaction/transaction.service';
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
    this.block = new BlockIo(process.env.BITCHEQ_BTC_TESTNET_API_KEY, process.env.SECRET_PIN);
  }

  async getUserAddress(username: string) {
    const user = await this.userService.findOneByName(username);
    if (user) {
      if (user.address) {
        return { data: { address: user.address } };
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
    const { address, balance_change } = transactionDto;
    const addressEntity = await this.addressService.findOneByAddress(address);

    this.logger.debug(`Update user ${addressEntity.owner} balance ${JSON.stringify(transactionDto)}`);
    await this.userService.deposit(
      addressEntity.owner,
      balance_change,
    );
    // User returned from findOneAndUpdate has the old balance
    const updatedUser = await this.userService.findOneByName(
      addressEntity.owner,
    );
    this.logger.debug(
      `User ${updatedUser?.username} has balance ${updatedUser?.btcBalance} (delta: ${balance_change})`,
    );
  }

  async withdraw(username: string, amount: string, toAddress: string) {
    const res = await this.block.withdraw_from_addresses({ 
      amounts: amount, 
      from_addresses: await this.getUserAddress(username), 
      to_addresses: toAddress 
    });
    this.logger.debug(`withdraw transaction finished ${JSON.stringify(res)}`)
    return res;
  }

  async estimate(amount: string, toAddress: string) {
    return await this.block.get_network_fee_estimate({ amounts: amount, to_addresses: toAddress });
  }
}
