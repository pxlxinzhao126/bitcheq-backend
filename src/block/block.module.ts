import { HttpModule, Module } from '@nestjs/common';
import { AddressModule } from 'src/address/address.module';
import { TransactionModule } from 'src/transaction/transaction.module';
import { UsersModule } from 'src/users/users.module';
import { BlockController } from './block.controller';
import { BlockService } from './block.service';

@Module({
  imports: [HttpModule, UsersModule, TransactionModule, AddressModule],
  controllers: [BlockController],
  providers: [BlockService],
})
export class BlockModule {}
