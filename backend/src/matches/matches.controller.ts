import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import type { CoreUser } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { CreateMatchSubmissionDto } from './dto/create-match-submission.dto';
import { MatchesService } from './matches.service';

type AuthenticatedRequest = Request & { user: CoreUser };

@Controller('v1/matches')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('STUDENT')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Post('queue')
  joinQueue(@Req() request: AuthenticatedRequest) {
    return this.matchesService.joinQueue(request.user.coreUserId);
  }

  @Delete('queue')
  leaveQueue(@Req() request: AuthenticatedRequest) {
    return this.matchesService.leaveQueue(request.user.coreUserId);
  }

  @Get('current')
  getCurrent(@Req() request: AuthenticatedRequest) {
    return this.matchesService.getCurrent(request.user.coreUserId);
  }

  @Get(':matchId')
  getMatch(
    @Param('matchId', new ParseUUIDPipe({ version: '4' })) matchId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.matchesService.getMatch(matchId, request.user.coreUserId);
  }

  @Post(':matchId/submissions')
  submit(
    @Param('matchId', new ParseUUIDPipe({ version: '4' })) matchId: string,
    @Body() dto: CreateMatchSubmissionDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.matchesService.submit(
      matchId,
      request.user.coreUserId,
      dto.problemId,
      dto.sourceCode,
    );
  }
}
