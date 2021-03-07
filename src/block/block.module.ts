import { HttpModule, Module } from '@nestjs/common';
import { BlockController } from './block.controller';
import { BlockService } from './block.service';

@Module({
  imports: [HttpModule],
  controllers: [BlockController],
  providers: [BlockService]
})
export class BlockModule {}
