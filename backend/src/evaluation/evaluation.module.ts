import { Module } from '@nestjs/common';
import { EvaluationService } from './evaluation.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MatchesModule } from '../matches/matches.module';
import { SandboxRunner } from './sandbox-runner';

@Module({
  imports: [PrismaModule, MatchesModule],
  providers: [EvaluationService, SandboxRunner],
})
export class EvaluationModule {}
