import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AddressDto } from './address.dto';
import { Address, AddressDocument } from './address.schema';

@Injectable()
export class AddressService {
  constructor(
    @InjectModel(Address.name)
    private addressModel: Model<AddressDocument>,
  ) {}

  async create(addressDto: AddressDto): Promise<Address> {
    const createdAddress = new this.addressModel(addressDto);
    return createdAddress.save();
  }

  async findOneByAddress(address: string): Promise<Address> {
    return this.addressModel.findOne({ address }).exec();
  }
}
