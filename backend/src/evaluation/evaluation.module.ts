import { Module } from '@nestjs/common';
import { EvaluationService } from './evaluation.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MatchesModule } from '../matches/matches.module';

@Module({
  imports: [PrismaModule, MatchesModule],
  providers: [EvaluationService],
})
export class EvaluationModule {}
