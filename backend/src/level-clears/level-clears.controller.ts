import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { CoreHubIdentity } from '../auth/core-hub-identity';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { Permission } from '../auth/permissions';
import { ApiResult } from '../contracts/api-result.decorator';
import {
  CreateLevelClearDto,
  LevelClearDto,
  LevelClearQueryDto,
} from './level-clears.dto';
import { LevelClearsService } from './level-clears.service';

type AuthenticatedRequest = Request & { user: CoreHubIdentity };

@Controller('v1/level-clears')
export class LevelClearsController {
  constructor(private readonly levelClears: LevelClearsService) {}

  @Get()
  @RequirePermissions(Permission.CSS_GAME_PLAY)
  @ApiResult(LevelClearDto, true, 200)
  list(
    @Query() query: LevelClearQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.levelClears.list(request.user.id, query);
  }

  @Post()
  @RequirePermissions(Permission.CSS_GAME_PLAY)
  @ApiResult(LevelClearDto, false, 201)
  create(
    @Body() body: CreateLevelClearDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.levelClears.create(request.user.id, body.game, body.level);
  }
}
