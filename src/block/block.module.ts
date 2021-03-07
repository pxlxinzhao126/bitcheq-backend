import { HttpModule, Module } from '@nestjs/common';
import { TransactionModule } from 'src/transaction/transaction.module';
import { UsersModule } from 'src/users/users.module';
import { BlockController } from './block.controller';
import { BlockService } from './block.service';

@Module({
  imports: [HttpModule, UsersModule, TransactionModule],
  controllers: [BlockController],
  providers: [BlockService],
})
export class BlockModule {}
