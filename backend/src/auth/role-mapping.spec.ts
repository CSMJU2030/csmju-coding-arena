import {mapCoreRoleToSubsystemRole} from './role-mapping';
import {SubsystemRole} from './core-hub-identity';
test('only students and lecturers enter Coding Arena',()=>{
 expect(mapCoreRoleToSubsystemRole('student')).toBe(SubsystemRole.STUDENT);
 expect(mapCoreRoleToSubsystemRole('lecturer')).toBe(SubsystemRole.STAFF);
 for(const role of ['staff','guest','alumni','admin']) expect(mapCoreRoleToSubsystemRole(role)).toBeNull();
});
