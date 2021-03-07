import { Controller, Get } from '@nestjs/common';
import { BlockService } from './block.service';

@Controller('block')
export class BlockController {
    constructor(private blockService: BlockService){}

    @Get('new')
    async getNewAddress() {
        return await this.blockService.getNewAddress();
    }
}
