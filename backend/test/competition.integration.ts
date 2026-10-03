import 'reflect-metadata';
import * as assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../src/prisma/prisma.service';
import { UsersService } from '../src/users/users.service';
import { MatchesService } from '../src/matches/matches.service';
import { EvaluationService } from '../src/evaluation/evaluation.service';
import { ProblemsService } from '../src/problems/problems.service';
import { TestCasesService } from '../src/test-cases/test-cases.service';
import {
  SandboxRunner,
  JudgeExecutionError,
} from '../src/evaluation/sandbox-runner';

async function main() {
  const url = new URL(process.env.DATABASE_URL ?? '');
  assert.equal(
    url.pathname,
    '/arena_test',
    'Use the disposable arena_test database only',
  );
  assert.equal(url.hostname, '127.0.0.1');
  const db = new PrismaService();
  await db.$connect();
  const users = new UsersService(db);
  const matches = new MatchesService(db, users);
  const problems = new ProblemsService(db, users);
  const tests = new TestCasesService(db);
  const runner = new SandboxRunner();
  const evaluator = new EvaluationService(db, matches, runner);
  const prefix = `integration-${randomUUID()}`;
  const playerIds: string[] = [];
  const problemIds: string[] = [];
  let matchId: string | undefined;
  try {
    const [one, two, author] = await Promise.all(
      ['one', 'two', 'author'].map((id) => users.ensureUser(`${prefix}-${id}`)),
    );
    playerIds.push(one.id, two.id, author.id);
    for (let n = 0; n < 3; n++) {
      const problem = await db.problem.create({
        data: {
          authorId: author.id,
          title: `Sum ${n}`,
          description: 'Sum two integers',
          timeLimitMs: 1000,
          isActive: true,
          testCases: {
            create: [
              { inputData: '2 3', expectedOutput: '5', isHidden: false },
              { inputData: '-3 4', expectedOutput: '1', isHidden: true },
            ],
          },
        },
      });
      problemIds.push(problem.id);
    }
    const waiting = await matches.joinQueue(one.coreUserId);
    assert.equal(waiting.state, 'waiting');
    const paired = await matches.joinQueue(two.coreUserId);
    assert.equal(paired.state, 'matched');
    matchId = 'id' in paired ? paired.id : undefined;
    assert.ok(matchId);
    const state = await matches.getMatch(matchId, one.coreUserId);
    const assignments = await db.matchRound.findMany({ where: { matchId } });
    assert.equal(new Set(assignments.map((round) => round.problemId)).size, 3);
    const other = await matches.getMatch(matchId, two.coreUserId);
    assert.deepEqual(
      state.rounds.map((round) => round.problem.id),
      other.rounds.map((round) => round.problem.id),
    );
    const duplicateJoins = await Promise.all([
      matches.joinQueue(one.coreUserId),
      matches.joinQueue(one.coreUserId),
    ]);
    assert.ok(
      duplicateJoins.every((item) => 'id' in item && item.id === matchId),
    );
    assert.equal(await db.match.count(), 1);
    await assert.rejects(
      problems.update(problemIds[0], {
        description: 'Changed while competing',
      }),
    );
    const activeTest = await db.testCase.findFirstOrThrow({
      where: { problemId: problemIds[0] },
    });
    await assert.rejects(
      tests.update(activeTest.id, { expectedOutput: 'Changed answer' }),
    );
    for (let n = 1; n <= 2; n++) {
      const current = await matches.getMatch(matchId, one.coreUserId);
      const round = current.rounds.find((item) => item.roundNumber === n)!;
      await assert.rejects(
        matches.submit(
          matchId,
          `${prefix}-outsider`,
          round.problem.id,
          'print(5)',
        ),
      );
      await matches.submit(
        matchId,
        one.coreUserId,
        round.problem.id,
        'import sys\nprint(sum(map(int,sys.stdin.read().split())))',
      );
      await assert.rejects(
        matches.submit(matchId, one.coreUserId, round.problem.id, 'print(5)'),
      );
      // Submission arrived in time; evaluation completes after the round deadline.
      await db.matchRound.update({
        where: { id: round.id },
        data: { endsAt: new Date() },
      });
      await evaluator.evaluatePendingSubmissions();
    }
    const finished = await matches.getMatch(matchId, one.coreUserId);
    assert.equal(finished.status, 'COMPLETED');
    assert.equal(finished.winnerId, one.id);
    assert.equal(finished.rounds[2].status, 'PENDING');
    const scores = await db.playerRating.findMany({
      where: { id: { in: [one.id, two.id] } },
    });
    assert.equal(scores.find((item) => item.id === one.id)?.eloRating, 1216);
    assert.equal(scores.find((item) => item.id === two.id)?.eloRating, 1184);
    const accepted = await db.submission.findFirstOrThrow({
      where: { studentId: one.id, matchRound: { matchId } },
    });
    await matches.recordEvaluation(accepted.id, new Date());
    assert.equal(
      (await db.playerRating.findUniqueOrThrow({ where: { id: one.id } }))
        .eloRating,
      1216,
    );
    assert.equal((await users.getLeaderboard()).length, 2);
    assert.equal(
      await runner.run('print(sum(map(int,input().split())))', '2 3', 1000),
      '5\n',
    );
    for (const code of [
      'while True: pass',
      'import signal\nsignal.signal(signal.SIGALRM,signal.SIG_IGN)\nwhile True: pass',
    ]) {
      await assert.rejects(
        runner.run(code, '', 300),
        (error: unknown) =>
          error instanceof JudgeExecutionError &&
          error.verdict === 'TIME_LIMIT_EXCEEDED',
      );
    }
    await assert.rejects(
      runner.run("open('/etc/arena-test','w').write('x')", '', 1000),
      JudgeExecutionError,
    );
    await assert.rejects(
      runner.run(
        "import socket\nsocket.create_connection(('1.1.1.1',443),timeout=0.2)",
        '',
        1000,
      ),
      JudgeExecutionError,
    );
    console.log(
      'PASS: matching, three distinct shared problems, duplicate/ownership protection, late evaluation, 2-of-3, Elo exactly once, leaderboard, isolated judge, timeout, read-only filesystem, blocked network',
    );
  } finally {
    await db.submission.deleteMany({ where: { studentId: { in: playerIds } } });
    if (matchId) await db.match.delete({ where: { id: matchId } });
    await db.matchQueue.deleteMany({ where: { playerId: { in: playerIds } } });
    await db.testCase.deleteMany({ where: { problemId: { in: problemIds } } });
    await db.problem.deleteMany({ where: { id: { in: problemIds } } });
    await db.playerRating.deleteMany({
      where: { coreUserId: { startsWith: prefix } },
    });
    await db.$disconnect();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
