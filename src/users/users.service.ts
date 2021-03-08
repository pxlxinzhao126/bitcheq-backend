import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserDto } from './users.dto';
import { User, UserDocument } from './users.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(userDto: UserDto): Promise<User> {
    const createdUser = new this.userModel({
      ...userDto,
      btcBalance: 0,
      createdDate: new Date().getTime(),
    });
    return createdUser.save();
  }

  async spend(username, amount) {
    const user = await this.findOneByName(username);
    if (user.btcBalance < amount) {
      console.error(
        `User ${user.username} has negative balance. Investigate immediately`,
      );
    }
    return this.userModel
      .findOneAndUpdate(
        { username },
        { $inc: { btcBalance: -amount } },
        { useFindAndModify: false },
      )
      .exec();
  }

  async deposit(username, amount) {
    return this.userModel
      .findOneAndUpdate(
        { username },
        { $inc: { btcBalance: amount } },
        { useFindAndModify: false },
      )
      .exec();
  }

  async findOneByName(username: string): Promise<User> {
    return this.userModel.findOne({ username }).exec();
  }

  async updateUserAddress(username: string, address: string) {
    return this.userModel.findOneAndUpdate(
      { username },
      { $set: { address } },
      { useFindAndModify: false },
    );
  }

  mapUserToReturn(user: User) {
    const { username, btcBalance, createdDate } = user;
    return { username, btcBalance, createdDate };
  }
}
