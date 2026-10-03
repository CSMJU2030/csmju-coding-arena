import { ApiProperty } from '@nestjs/swagger';
import { Query } from '@nestjs/common';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { ApiResult } from '../contracts/api-result.decorator';
import { SubmissionDto } from '../contracts/api.dto';
import { Controller, Post, Body, Req, Get } from '@nestjs/common';
import type { Request } from 'express';
import type { CoreHubIdentity } from '../auth/core-hub-identity';
import { SubmissionsService } from './submissions.service';
import { IsString, IsNotEmpty, IsUUID, MaxLength } from 'class-validator';

import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { Permission } from '../auth/permissions';

// DTO: กฎการรับข้อมูล
export class CreateSubmissionDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID('4')
  @ApiProperty({ type: String })
  problemId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10000, {
    message: 'Source code ยาวเกินไป (รับได้สูงสุด 10,000 ตัวอักษร)',
  })
  @ApiProperty({ type: String })
  sourceCode!: string;
}

type AuthenticatedRequest = Request & { user: CoreHubIdentity };

@Controller('v1/submissions')
@RequirePermissions(Permission.SUBMISSION_CREATE)
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Post()
  @ApiResult(SubmissionDto, false, 201)
  async createSubmission(
    @Body() body: CreateSubmissionDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const coreUserId = request.user.id;
    return this.submissionsService.submit(
      coreUserId,
      body.problemId,
      body.sourceCode,
    );
  }

  @Get()
  @ApiResult(SubmissionDto, true, 200)
  async getSubmissions(
    @Req() request: AuthenticatedRequest,
    @Query() query: PaginationQueryDto,
  ) {
    return this.submissionsService.findAll(request.user.id, query);
  }
}
