import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import * as BlockIo from 'block_io';
import { AddressService } from 'src/address/address.service';
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
    this.block = new BlockIo(
      process.env.BITCHEQ_BTC_TESTNET_API_KEY,
      process.env.SECRET_PIN,
    );
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
      const owner = await this.getAddressOwner(data.address);
      this.logger.debug(
        `Received address type webhook ${JSON.stringify(webhook_response)}`,
      );
      if (await this.isNewTransaction(data)) {
        response.operation = 'created';
        await this.transactionService.create(data, owner);
      } else {
        response.operation = 'updated';
        await this.transactionService.updateTransaction(data);

        // sync user's transactions, only for receiving
        if (data?.confirmations == 4 && +data.balance_change > 0) {
          this.logger.debug(
            `User ${owner} has ${data.balance_change} confirmed after ${data.confirmations} confirmations`,
          );
          await this.confirmTransactions(owner, data);
        }
      }

      if (await this.isPendingTransaction(data)) {
        // Withdraw webhook does not affect user balances
        if (+data.balance_change > 0) {
          await this.updateUserBalance(owner, data.balance_change);
          await this.updateUserPendingBalance(owner, data.balance_change);
        } else {
          this.logger.debug(`withdraw transaction does not update balance`);
        }
        await this.transactionService.completeTransaction(data.txid);
      }
    } else {
      this.logger.debug(
        `Received non-address type webhook ${JSON.stringify(webhook_response)}`,
      );
    }

    return response;
  }

  private async confirmTransactions(owner: string, data: any) {
    const unconfirmedTransactions = await this.transactionService.findAllUnconfirmedByOwner(owner);
    if (unconfirmedTransactions && unconfirmedTransactions.length > 0) {
      for (let tx of unconfirmedTransactions) {
        if (tx.confirmations >= 4 && tx.confirmed === false) {
          await this.updateUserPendingBalance(owner, -tx.balance_change);
          await this.transactionService.confirmTransaction(tx.txid);
        }
      }
    }
  }

  async getAddressOwner(address: string) {
    const addressEntity = await this.addressService.findOneByAddress(address);
    try {
      return addressEntity.owner;
    } catch (e) {
      throw new HttpException(
        `Address ${address} not found`,
        HttpStatus.BAD_REQUEST,
      );
    }
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

  async updateUserBalance(username: string, balance_change: number) {
    this.logger.debug(`Update user ${username} balance ${balance_change}`);
    await this.userService.deposit(username, balance_change);
    // User returned from findOneAndUpdate has the old balance
    const updatedUser = await this.userService.findOneByName(username);
    this.logger.debug(
      `User ${updatedUser?.username} has balance ${updatedUser?.btcBalance} (delta: ${balance_change})`,
    );
  }

  async updateUserPendingBalance(
    username: string,
    balance_change: number,
  ): Promise<void> {
    this.logger.debug(
      `Update user ${username} pending balance ${balance_change}`,
    );
    const currentUser = await this.userService.findOneByName(username);
    if (currentUser.pendingBtcBalance + balance_change >= 0) {
      // Pending balance is always positive. Withdraw happens immediately which does not require confirmation
      await this.userService.updateUserPendingBalance(username, balance_change);
    }

    // User returned from findOneAndUpdate has the old balance
    const updatedUser = await this.userService.findOneByName(username);
    this.logger.debug(
      `User ${updatedUser?.username} has pending balance ${updatedUser?.pendingBtcBalance} (delta: ${balance_change})`,
    );
  }

  async withdraw(username: string, amount: string, toAddress: string) {
    this.logger.debug(
      `${username} initiated withdraw of ${amount} to ${toAddress}`,
    );
    if (+amount < 0.00002) {
      throw new HttpException(
        `Amount to withdraw must be over 0.00002 BTC`,
        HttpStatus.BAD_REQUEST,
      );
    }
    const checkResult = await this.preWithdrawCheck(
      username,
      amount,
      toAddress,
    );
    if (checkResult) {
      const { totalWithdraw } = checkResult;
      const res = await this.block.withdraw_from_addresses({
        amounts: amount,
        from_addresses: await this.getUserAddress(username),
        to_addresses: toAddress,
      });

      // Withdraw transaction updates balance immediately. Because webhook's address can be random.
      // The spend total amount is just an estimation, network fee might vary.
      await this.userService.spend(username, checkResult.totalWithdraw);

      // User returned from findOneAndUpdate has the old balance
      const updatedUser = await this.userService.findOneByName(username);

      this.logger.debug(
        `User ${updatedUser?.username} has balance ${updatedUser?.btcBalance} (delta: ${totalWithdraw})`,
      );
      this.logger.debug(`Withdraw transaction finished ${JSON.stringify(res)}`);
      return res;
    } else {
      this.logger.debug(`${username} has not enough balance`);
      throw new HttpException(
        `${username} has not enough balance`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async preWithdrawCheck(
    username: string,
    amount: string,
    toAddress: string,
  ): Promise<any> {
    const user = await this.userService.findOneByName(username);
    const currentBalance = user.btcBalance;

    if (+currentBalance > +amount) {
      let estimatedResult;
      try {
        estimatedResult = await this.estimate(amount, toAddress);
      } catch (e) {
        this.logger.debug(`Estimation failed. ${JSON.stringify(e.data)}`);
        throw new HttpException(
          'Not enough total balance',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (estimatedResult && estimatedResult.data) {
        const { estimated_network_fee, blockio_fee } = estimatedResult.data;
        if (estimated_network_fee && blockio_fee) {
          const totalWithdraw = +amount + +estimated_network_fee + +blockio_fee;

          this.logger.debug(`
              Withdraw estimation for User ${username}
              Current balance: ${currentBalance}
              Amount: ${amount}
              Estimated Network Fee: ${estimated_network_fee}
              BlockIo Fee: ${blockio_fee}
              Total: ${totalWithdraw}
              Expected balance: ${currentBalance - totalWithdraw}
            `);
          return {
            totalWithdraw,
          };
        }
      }
    }

    return false;
  }

  async estimate(amount: string, toAddress: string) {
    return await this.block.get_network_fee_estimate({
      amounts: amount,
      to_addresses: toAddress,
    });
  }
}
