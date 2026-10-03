import type { CoreRole } from './auth.service';

export type SubsystemRole = 'STUDENT' | 'TEACHER';

export const CORE_ROLE_TO_SUBSYSTEM_ROLE: Partial<
  Record<CoreRole, SubsystemRole>
> = {
  student: 'STUDENT',
  lecturer: 'TEACHER',
};
