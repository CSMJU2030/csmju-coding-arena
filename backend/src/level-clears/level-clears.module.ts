import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { LevelClearsController } from './level-clears.controller';
import { LevelClearsService } from './level-clears.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [LevelClearsController],
  providers: [LevelClearsService],
})
export class LevelClearsModule {}
