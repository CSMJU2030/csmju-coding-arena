import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProblemBankService } from './problem-bank.service';

@Module({
  imports: [PrismaModule],
  providers: [ProblemBankService],
})
export class ProblemBankModule {}
