import {can,Permission} from './permissions';
import {SubsystemRole} from './core-hub-identity';
test('students cannot manage problems and lecturers cannot compete',()=>{
 expect(can(SubsystemRole.STUDENT,Permission.PROBLEM_CREATE)).toBe(false);
 expect(can(SubsystemRole.STAFF,Permission.PROBLEM_CREATE)).toBe(true);
 expect(can(SubsystemRole.STAFF,Permission.MATCH_PLAY)).toBe(false);
});
test('ศิษย์เก่า/ผู้เยี่ยมชมดูและใช้คอมไพเลอร์ได้ แต่แข่งหรือแก้โจทย์ไม่ได้ · ผู้ดูแลจัดการโจทย์ได้',()=>{
 expect(can(SubsystemRole.ALUMNI,Permission.CODE_RUN_CREATE)).toBe(true);
 expect(can(SubsystemRole.ALUMNI,Permission.PROBLEM_CREATE)).toBe(false);
 expect(can(SubsystemRole.ALUMNI,Permission.MATCH_PLAY)).toBe(false);
 expect(can(SubsystemRole.ADMIN,Permission.PROBLEM_CREATE)).toBe(true);
 expect(can(SubsystemRole.ADMIN,Permission.TEST_CASE_DELETE)).toBe(true);
});
