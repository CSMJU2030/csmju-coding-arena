import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { ArenaProfileController } from './arena-profile.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [UsersController, ArenaProfileController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
