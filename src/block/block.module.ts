import { HttpModule, Module } from '@nestjs/common';
import { UsersModule } from 'src/users/users.module';
import { BlockController } from './block.controller';
import { BlockService } from './block.service';

@Module({
  imports: [HttpModule, UsersModule],
  controllers: [BlockController],
  providers: [BlockService],
})
export class BlockModule {}
