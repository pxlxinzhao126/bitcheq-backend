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
    this.logger.debug(
      `start to write transactions ${JSON.stringify(webhook_response)}`,
    );
    const data = webhook_response?.data;
    let response: WebhookResult = { txid: null, operation: null };

    if (this.isValidAddressNotification(webhook_response)) {
      response.txid = data.txid;
      const owner = await this.getAddressOwner(data.address);

      if (owner) {
        this.logger.debug(
          `Received address type webhook ${JSON.stringify(webhook_response)}`,
        );
        if (await this.isNewTransaction(data)) {
          response.operation = 'created';
          await this.transactionService.create(data, owner);
        } else {
          response.operation = 'updated';
          await this.transactionService.updateTransaction(data);
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
        response.operation = 'not modified';
        this.logger.debug(`Owner not found for address ${data.address}`);
      }
    } else {
      this.logger.debug(
        `Received non-address type webhook ${JSON.stringify(webhook_response)}`,
      );
    }

    return response;
  }

  /**
   * Find all unconfirmed transactions
   * If any of it has confirmation >=4
   * Set confirmed to true
   */
  async confirmTransactions(owner: string) {
    this.logger.debug(`confirmTransactions called by ${owner}`);
    const unconfirmedTransactions = await this.transactionService.findAllUnconfirmedByOwner(
      owner,
    );
    if (unconfirmedTransactions && unconfirmedTransactions.length > 0) {
      const blockTxs = await this.block.get_transactions({
        type: 'received',
        addresses: unconfirmedTransactions[0].address,
      });
      this.logger.debug(
        `Recent transactions of ${owner} ${JSON.stringify(blockTxs)}`,
      );
      const txs = blockTxs?.data?.txs || [];

      for (let unconfirmedTx of unconfirmedTransactions) {
        const lookup = txs.find((it) => it.txid === unconfirmedTx.txid);
        if (lookup) {
          this.logger.debug(
            `Transaction ${unconfirmedTx.txid} has ${lookup.confirmations} confirmations`,
          );

          if (lookup.confirmations >= 4) {
            this.logger.debug(
              `Confirm transaction ${unconfirmedTx.txid}, deduct pending balance by ${unconfirmedTx.balance_change}`,
            );
            await this.updateUserPendingBalance(
              owner,
              -unconfirmedTx.balance_change,
            );
            await this.transactionService.confirmTransaction(
              unconfirmedTx.txid,
            );
          }
        }
      }
    }
  }

  async getTransactionFromBlock(address: string) {
    const tx = await this.block.get_transactions({
      type: 'received',
      addresses: address,
    });
    return tx;
  }

  async getAddressOwner(address: string) {
    const addressEntity = await this.addressService.findOneByAddress(address);

    if (addressEntity) {
      return addressEntity.owner;
    } else {
      return null;
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
    } else {
      this.logger.error(`
      Prevented pending balance going to negative for user ${username}. 
      Pending balance is ${currentUser.pendingBtcBalance} but balance change is ${balance_change}`);
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
      const fromAddress = await this.getUserAddress(username);
      this.logger.debug(`withdraw from address ${fromAddress} for user ${username}`);
      const res = await this.block.withdraw_from_addresses({
        amounts: amount,
        from_addresses: fromAddress.data.address,
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

  async resetNotifications() {
    const response = await this.block.list_notifications();
    this.logger.debug(`Listing notification ${JSON.stringify(response)}`);

    if (response?.data?.notifications?.length > 0) {
      const notifications = response.data.notifications;
      for (let n of notifications) {
        this.logger.debug(`Deleting notification ${n.notification_id}`);
        await this.block.delete_notification({
          notification_id: n.notification_id,
        });
      }
    }
    const newNotification = await this.block.create_notification({
      type: 'account',
      url: 'https://bitcheq.herokuapp.com/block/webhook',
    });
    this.logger.debug(
      `Successfully creat a new notification ${JSON.stringify(
        newNotification,
      )}`,
    );
    return newNotification;
  }
}
