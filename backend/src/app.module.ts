import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { CoreHubJwtGuard } from './auth/guards/core-hub-jwt.guard';
import { PermissionsGuard } from './auth/guards/permissions.guard';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import configuration from './config/configuration';
import { RequestRateGuard } from './common/request-rate.guard';
import { ScheduleModule } from '@nestjs/schedule';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProblemsModule } from './problems/problems.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { TestCasesModule } from './test-cases/test-cases.module';
import { EvaluationModule } from './evaluation/evaluation.module';
import { MatchesModule } from './matches/matches.module';
import { LanguagesModule } from './languages/languages.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      load: [configuration],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProblemsModule,
    SubmissionsModule,
    TestCasesModule,
    EvaluationModule,
    MatchesModule,
    LanguagesModule,
  ],
  controllers: [HealthController],
  providers: [
    // 🛡️ บังคับใช้ Rate Limiting ทั่วทั้งแอปพลิเคชัน
    {
      provide: APP_GUARD,
      useClass: CoreHubJwtGuard,
    },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_GUARD, useClass: RequestRateGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
  ],
})
export class AppModule {}
