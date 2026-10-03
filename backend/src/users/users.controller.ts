import { ApiResult } from '../contracts/api-result.decorator';
import { LeaderboardEntryDto } from '../contracts/api.dto';
import { Controller, Get } from '@nestjs/common';
import { UsersService } from './users.service';
import { CollectionResult } from '../common/api-response';
import { buildPaginationMeta } from '../common/dto/pagination.dto';

import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { Permission } from '../auth/permissions';

@Controller('v1/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('leaderboard')
  @RequirePermissions(Permission.LEADERBOARD_READ)
  @ApiResult(LeaderboardEntryDto, true, 200)
  async getLeaderboard() {
    const data = await this.usersService.getLeaderboard();
    return new CollectionResult(data, buildPaginationMeta(data.length, 1, 5));
  }
}
