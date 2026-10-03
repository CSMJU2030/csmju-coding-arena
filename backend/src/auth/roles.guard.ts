import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { CoreUser } from './auth.service';
import {
  CORE_ROLE_TO_SUBSYSTEM_ROLE,
  type SubsystemRole,
} from './role-mapping';

type AuthenticatedRequest = Request & { user?: CoreUser };

export const Roles = (...roles: SubsystemRole[]) =>
  SetMetadata('subsystem_roles', roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<SubsystemRole[]>(
      'subsystem_roles',
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const coreRole = request.user?.coreRole;
    const subsystemRole = coreRole
      ? CORE_ROLE_TO_SUBSYSTEM_ROLE[coreRole]
      : undefined;
    return subsystemRole !== undefined && requiredRoles.includes(subsystemRole);
  }
}
