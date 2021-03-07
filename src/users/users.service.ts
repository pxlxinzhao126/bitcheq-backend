import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserDto } from './users.dto';
import { User, UserDocument } from './users.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(userDto: UserDto): Promise<User> {
    const createdUser = new this.userModel({...userDto, btcBalance: 0, createdDate: new Date().toISOString()});
    return createdUser.save();
  }

  async spend(username, amount) {
    const user = await this.findOneByName(username);
    if (user.btcBalance < amount) {
      console.error(`User ${user.username} has negative balance. Investigate immediately`);
    }
    return this.userModel.findOne({ username }, {$inc: {btcBalance: -amount}}).exec();
  }

  async deposit(username, amount) {
    return this.userModel.findOne({ username }, {$inc: {btcBalance: amount}}).exec();
  }

  async findAll(): Promise<User[]> {
    return this.userModel.find().exec();
  }

  async findOneByName(username: string): Promise<User> {
    return this.userModel.findOne({ username }).exec();
  }

  mapUserToReturn(user: User) {
    const { username, btcBalance, createdDate } = user;
    return { username, btcBalance, createdDate };
  }
}
