import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TestCasesService } from './test-cases.service';
import { TestCasesController } from './test-cases.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [AuthModule, PrismaModule],
  providers: [TestCasesService],
  controllers: [TestCasesController],
})
export class TestCasesModule {}
