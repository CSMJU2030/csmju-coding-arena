import { Controller, Post, Body, UseGuards, Req, Get } from '@nestjs/common';
import type { Request } from 'express';
import type { CoreUser } from '../auth/auth.service';
import { SubmissionsService } from './submissions.service';
import { IsString, IsNotEmpty, IsUUID, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';

// DTO: กฎการรับข้อมูล
export class CreateSubmissionDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID('4')
  problemId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10000, {
    message: 'Source code ยาวเกินไป (รับได้สูงสุด 10,000 ตัวอักษร)',
  })
  sourceCode!: string;
}

type AuthenticatedRequest = Request & { user: CoreUser };

@Controller('v1/submissions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('STUDENT')
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Post()
  async createSubmission(
    @Body() body: CreateSubmissionDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const coreUserId = request.user.coreUserId;
    return this.submissionsService.submit(
      coreUserId,
      body.problemId,
      body.sourceCode,
    );
  }

  @Get()
  async getSubmissions(@Req() request: AuthenticatedRequest) {
    return this.submissionsService.findAll(request.user.coreUserId);
  }
}
