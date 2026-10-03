import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import type { CoreUser } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { UsersService } from './users.service';

type AuthenticatedRequest = Request & { user: CoreUser };

@Controller('v1/me')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MeController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('STUDENT', 'TEACHER')
  async getMyProfile(@Req() request: AuthenticatedRequest) {
    const user = await this.usersService.ensureUser(request.user.coreUserId);
    return {
      coreUserId: request.user.coreUserId,
      coreRole: request.user.coreRole,
      eloRating: user.eloRating,
      displayName: user.displayName,
      session: {
        expiresAt: new Date(request.user.expiresAt * 1000).toISOString(),
      },
    };
  }
}
