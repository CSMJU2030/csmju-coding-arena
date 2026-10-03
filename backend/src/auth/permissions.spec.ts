import {can,Permission} from './permissions';
import {SubsystemRole} from './core-hub-identity';
test('students cannot manage problems and lecturers cannot compete',()=>{
 expect(can(SubsystemRole.STUDENT,Permission.PROBLEM_CREATE)).toBe(false);
 expect(can(SubsystemRole.STAFF,Permission.PROBLEM_CREATE)).toBe(true);
 expect(can(SubsystemRole.STAFF,Permission.MATCH_PLAY)).toBe(false);
});
