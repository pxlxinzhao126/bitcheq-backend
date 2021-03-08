import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { BlockModule } from './block/block.module';
import { mongoUrl } from './config';
import { TransactionModule } from './transaction/transaction.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    MongooseModule.forRoot(mongoUrl),
    AuthModule,
    UsersModule,
    BlockModule,
    TransactionModule,
  ],
})
export class AppModule {}
