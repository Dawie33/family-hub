import { Module } from '@nestjs/common'
import { ShoppingController } from './shopping.controller'
import { DatabaseModule } from '../database/database.module'

@Module({
  imports: [DatabaseModule],
  controllers: [ShoppingController],
})
export class ShoppingModule {}
