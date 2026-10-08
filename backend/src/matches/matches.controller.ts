import { ApiResult } from '../contracts/api-result.decorator';
import {
  QueueStateDto,
  MatchDto,
  MatchRoomDto,
  JudgedSubmissionDto,
  DeletedDto,
} from '../contracts/api.dto';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import type { CoreHubIdentity } from '../auth/core-hub-identity';

import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { Permission } from '../auth/permissions';
import {
  CreateMatchRoomDto,
  CreateMatchSubmissionDto,
  MatchRoomQueryDto,
} from './dto/create-match-submission.dto';
import { TestInputsDto } from './browser-judge';
import { MatchesService } from './matches.service';

type AuthenticatedRequest = Request & { user: CoreHubIdentity };
const MATCH_ID = new ParseUUIDPipe({ version: '4' });

@Controller('v1/matches')
@RequirePermissions(Permission.MATCH_PLAY)
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  /** รายการห้อง (ค่าเริ่ม = ห้องที่รอคู่แข่ง) */
  @Get()
  @ApiResult(MatchRoomDto, true, 200)
  listRooms(
    @Query() query: MatchRoomQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.matchesService.listRooms(
      request.user.id,
      query.status ?? 'WAITING',
      query.page ?? 1,
      query.take,
    );
  }

  /** สร้างห้องรอคู่แข่ง */
  @Post()
  @ApiResult(MatchDto, false, 201)
  createRoom(
    @Body() dto: CreateMatchRoomDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.matchesService.createRoom(
      request.user.id,
      dto.title,
      dto.problemIds,
    );
  }

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
    @Param('matchId', MATCH_ID) matchId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.matchesService.getMatch(matchId, request.user.id);
  }

  /** เจ้าของห้องปิดห้องที่ยังไม่มีคู่แข่ง */
  @Delete(':matchId')
  @ApiResult(DeletedDto, false, 200)
  cancelRoom(
    @Param('matchId', MATCH_ID) matchId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.matchesService.cancelRoom(matchId, request.user.id);
  }

  /** เข้าร่วมห้องในฐานะคู่แข่ง */
  @Post(':matchId/participants')
  @ApiResult(MatchDto, false, 201)
  joinRoom(
    @Param('matchId', MATCH_ID) matchId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.matchesService.joinRoom(matchId, request.user.id);
  }

  /** input ของชุดทดสอบในข้อปัจจุบัน ให้เบราว์เซอร์รันโค้ด */
  @Get(':matchId/test-inputs')
  @ApiResult(TestInputsDto, false, 200)
  testInputs(
    @Param('matchId', MATCH_ID) matchId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.matchesService.testInputs(matchId, request.user.id);
  }

  @Post(':matchId/submissions')
  @ApiResult(JudgedSubmissionDto, false, 201)
  submit(
    @Param('matchId', MATCH_ID) matchId: string,
    @Body() dto: CreateMatchSubmissionDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.matchesService.submit(matchId, request.user.id, dto);
  }

  @Post(':matchId/ready')
  @HttpCode(HttpStatus.OK)
  @ApiResult(MatchDto, false, 200)
  markReady(
    @Param('matchId', MATCH_ID) matchId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.matchesService.markReady(matchId, request.user.id);
  }
}
