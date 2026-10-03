import { ApiResult } from '../contracts/api-result.decorator';
import { RatingDto } from '../contracts/api.dto';
import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CoreHubIdentity } from '../auth/core-hub-identity';
import { UsersService } from './users.service';

/** Rating is domain data; identity and roles always come from the verified Core Hub token. */
@Controller('v1/player-ratings')
export class ArenaProfileController {
  constructor(private readonly usersService: UsersService) {}
  @Get('me')
  @ApiResult(RatingDto, false, 200)
  async me(@CurrentUser() user: CoreHubIdentity) {
    const rating = await this.usersService.ensureUser(user.id);
    return { displayName: rating.displayName, eloRating: rating.eloRating };
  }
}
