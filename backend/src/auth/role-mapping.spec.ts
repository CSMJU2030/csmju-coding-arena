import {mapCoreRoleToSubsystemRole} from './role-mapping';
import {SubsystemRole} from './core-hub-identity';
test('ทั้ง 6 core role มี mapping ตรงกับ subsystem.yaml',()=>{
 expect(mapCoreRoleToSubsystemRole('student')).toBe(SubsystemRole.STUDENT);
 expect(mapCoreRoleToSubsystemRole('alumni')).toBe(SubsystemRole.ALUMNI);
 expect(mapCoreRoleToSubsystemRole('staff')).toBe(SubsystemRole.STAFF);
 expect(mapCoreRoleToSubsystemRole('lecturer')).toBe(SubsystemRole.STAFF);
 expect(mapCoreRoleToSubsystemRole('guest')).toBe(SubsystemRole.ALUMNI);
 expect(mapCoreRoleToSubsystemRole('admin')).toBe(SubsystemRole.ADMIN);
 for(const role of ['root','',undefined]) expect(mapCoreRoleToSubsystemRole(role)).toBeNull();
});
