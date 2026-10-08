import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CodeRunsService } from './code-runs.service';
import {
  CodeRunsController,
  LanguagesController,
} from './languages.controller';
import { PolyglotRunner } from './polyglot-runner';

@Module({
  imports: [AuthModule],
  controllers: [LanguagesController, CodeRunsController],
  providers: [CodeRunsService, PolyglotRunner],
})
export class LanguagesModule {}
