import { Query } from '@nestjs/common';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { ApiResult } from '../contracts/api-result.decorator';
import { JudgedSubmissionDto, SubmissionDto } from '../contracts/api.dto';
import { Controller, Post, Body, Req, Get } from '@nestjs/common';
import type { Request } from 'express';
import type { CoreHubIdentity } from '../auth/core-hub-identity';
import { SubmissionsService } from './submissions.service';

import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { Permission } from '../auth/permissions';

// คำตอบฝึกซ้อม: รันในเบราว์เซอร์ ตัดสินที่ server (ดู matches/browser-judge.ts)
export { BrowserJudgedSubmissionDto as CreateSubmissionDto } from '../matches/browser-judge';
import { BrowserJudgedSubmissionDto } from '../matches/browser-judge';

type AuthenticatedRequest = Request & { user: CoreHubIdentity };

@Controller('v1/submissions')
@RequirePermissions(Permission.SUBMISSION_CREATE)
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Post()
  @ApiResult(JudgedSubmissionDto, false, 201)
  async createSubmission(
    @Body() body: BrowserJudgedSubmissionDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.submissionsService.submit(request.user.id, body);
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
