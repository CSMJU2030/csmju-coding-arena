import { ApiResult } from '../contracts/api-result.decorator';
import { QueueStateDto, MatchDto, SubmissionDto } from '../contracts/api.dto';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import type { CoreHubIdentity } from '../auth/core-hub-identity';

import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { Permission } from '../auth/permissions';
import { CreateMatchSubmissionDto } from './dto/create-match-submission.dto';
import { MatchesService } from './matches.service';

type AuthenticatedRequest = Request & { user: CoreHubIdentity };

@Controller('v1/matches')
@RequirePermissions(Permission.MATCH_PLAY)
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Post('queue')
  @ApiResult(QueueStateDto, false, 201)
  joinQueue(@Req() request: AuthenticatedRequest) {
    return this.matchesService.joinQueue(request.user.id);
  }

  @Delete('queue')
  @ApiResult(QueueStateDto, false, 200)
  leaveQueue(@Req() request: AuthenticatedRequest) {
    return this.matchesService.leaveQueue(request.user.id);
  }

  @Get('current')
  @ApiResult(QueueStateDto, false, 200)
  getCurrent(@Req() request: AuthenticatedRequest) {
    return this.matchesService.getCurrent(request.user.id);
  }

  @Get(':matchId')
  @ApiResult(MatchDto, false, 200)
  getMatch(
    @Param('matchId', new ParseUUIDPipe({ version: '4' })) matchId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.matchesService.getMatch(matchId, request.user.id);
  }

  @Post(':matchId/submissions')
  @ApiResult(SubmissionDto, false, 201)
  submit(
    @Param('matchId', new ParseUUIDPipe({ version: '4' })) matchId: string,
    @Body() dto: CreateMatchSubmissionDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.matchesService.submit(
      matchId,
      request.user.id,
      dto.problemId,
      dto.sourceCode,
    );
  }
}
