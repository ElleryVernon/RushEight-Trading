import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ItemsService } from './items.service';
import { ItemsController } from './items.controller';
import { UsersService } from '../users/users.service';

@Module({
  providers: [ItemsService, PrismaService, UsersService],
  controllers: [ItemsController],
})
export class ItemsModule {} 