import { SubsystemRole } from './core-hub-identity';
export enum Permission {
  PROBLEM_READ='problem:read', PROBLEM_MANAGE='problem:read:any', PROBLEM_CREATE='problem:create',
  PROBLEM_UPDATE='problem:update:any', PROBLEM_DELETE='problem:delete:any',
  TEST_CASE_READ='test-case:read:any', TEST_CASE_CREATE='test-case:create',
  TEST_CASE_UPDATE='test-case:update:any', TEST_CASE_DELETE='test-case:delete:any',
  MATCH_PLAY='match:play:own', SUBMISSION_CREATE='submission:create:own', LEADERBOARD_READ='leaderboard:read',
  LANGUAGE_READ='language:read', CODE_RUN_CREATE='code-run:create:own',
}
export const ROLE_PERMISSIONS: Readonly<Record<SubsystemRole,readonly Permission[]>> = {
  [SubsystemRole.STUDENT]: [Permission.PROBLEM_READ,Permission.MATCH_PLAY,Permission.SUBMISSION_CREATE,Permission.LEADERBOARD_READ,Permission.LANGUAGE_READ,Permission.CODE_RUN_CREATE],
  [SubsystemRole.STAFF]: [Permission.PROBLEM_READ,Permission.PROBLEM_MANAGE,Permission.PROBLEM_CREATE,Permission.PROBLEM_UPDATE,Permission.PROBLEM_DELETE,Permission.TEST_CASE_READ,Permission.TEST_CASE_CREATE,Permission.TEST_CASE_UPDATE,Permission.TEST_CASE_DELETE,Permission.LEADERBOARD_READ,Permission.LANGUAGE_READ,Permission.CODE_RUN_CREATE],
  [SubsystemRole.ALUMNI]: [], [SubsystemRole.ADMIN]: [],
};
export function can(role:SubsystemRole,permission:Permission):boolean { return ROLE_PERMISSIONS[role]?.includes(permission)??false; }
export function canAny(role:SubsystemRole,permissions:readonly Permission[]):boolean {return permissions.some(p=>can(role,p));}
