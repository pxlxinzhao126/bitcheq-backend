import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PreauthMiddleware } from './auth/preauth.middleware';
import { BlockModule } from './block/block.module';
import { TransactionModule } from './transaction/transaction.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.BITCHEQ_DATABASE_URL),
    UsersModule,
    BlockModule,
    TransactionModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(PreauthMiddleware).forRoutes({
      path: '*',
      method: RequestMethod.ALL,
    });
  }
}
