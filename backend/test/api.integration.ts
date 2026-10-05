import 'reflect-metadata';
import * as assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { NestFactory } from '@nestjs/core';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { FakeCoreHub } from './helpers/fake-core-hub';
import { createSigningKey, signCoreHubToken } from './helpers/token-factory';

async function main() {
  const url = new URL(process.env.DATABASE_URL ?? '');
  assert.equal(
    url.pathname,
    '/arena_test',
    'Use only the disposable arena_test database',
  );
  assert.equal(url.hostname, '127.0.0.1');
  const key = await createSigningKey();
  const core = new FakeCoreHub();
  await core.start([key]);
  process.env.CORE_HUB_JWKS_URL = core.jwksUrl;
  process.env.CORE_HUB_URL = core.url;
  process.env.CORE_HUB_WEB_URL = core.url;
  const prefix = `http-test-${randomUUID()}`;
  const teacher = await signCoreHubToken(key, {
    sub: prefix + '-teacher',
    role: 'lecturer',
    azp: 'csmju-coding-arena',
  });
  const student = await signCoreHubToken(key, {
    sub: prefix + '-student',
    role: 'student',
    azp: 'csmju-coding-arena',
  });
  const secondStudent = await signCoreHubToken(key, {
    sub: prefix + '-student-two',
    role: 'student',
    azp: 'csmju-coding-arena',
  });
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api', {
    exclude: [
      { path: 'auth/login', method: RequestMethod.GET },
      { path: 'auth/callback', method: RequestMethod.GET },
      { path: 'auth/logout', method: RequestMethod.POST },
    ],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  await app.listen(0, '127.0.0.1');
  const base = await app.getUrl();
  const db = app.get(PrismaService);
  const ids: string[] = [];
  let matchId: string | undefined;
  type Envelope<T> = {
    success: boolean;
    data: T;
    meta?: { total: number; limit: number };
    error?: { code: string };
  };
  async function request<T>(
    path: string,
    token?: string,
    method = 'GET',
    body?: object,
  ) {
    const res = await fetch(base + path, {
      method,
      headers: {
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      redirect: 'manual',
    });
    const json = (await res.json()) as Envelope<T>;
    return { res, json };
  }
  try {
    assert.equal((await request('/api/health')).res.status, 200);
    const denied = await request('/api/v1/problems');
    assert.equal(denied.res.status, 401);
    assert.equal(denied.json.error?.code, 'UNAUTHORIZED');
    const me = await request<{ coreRole: string; id: string }>(
      '/api/v1/me',
      student,
    );
    assert.equal(me.json.data.coreRole, 'student');
    assert.equal(me.json.data.id, prefix + '-student');
    assert.equal(
      (await request('/api/v1/problems', student, 'POST', {})).res.status,
      403,
    );
    assert.equal(
      (await request('/api/v1/problems', teacher, 'POST', { title: '' })).res
        .status,
      400,
    );
    for (let n = 0; n < 3; n++) {
      const created = await request<{ id: string }>(
        '/api/v1/problems',
        teacher,
        'POST',
        {
          title: 'Sum ' + n,
          description: 'Sum two integers',
          timeLimitMs: 1000,
          isActive: true,
        },
      );
      assert.equal(created.res.status, 201);
      assert.equal(created.json.success, true);
      ids.push(created.json.data.id);
    }
    const collection = await request<Array<{ id: string }>>(
      '/api/v1/problems?page=1&limit=2',
      student,
    );
    assert.equal(collection.json.data.length, 2);
    assert.equal(collection.json.meta?.total, 3);
    assert.equal(collection.json.meta?.limit, 2);
    assert.equal(
      (await request('/api/v1/problems?limit=101', student)).res.status,
      400,
    );
    assert.equal(
      (await request('/api/v1/problems/not-a-uuid', student)).res.status,
      400,
    );
    assert.equal(
      (
        await request(
          '/api/v1/problems/99999999-9999-4999-8999-999999999999',
          student,
        )
      ).res.status,
      404,
    );
    const test = await request<{ id: string }>(
      '/api/v1/test-cases',
      teacher,
      'POST',
      {
        problemId: ids[0],
        inputData: '2 3',
        expectedOutput: '5',
        isHidden: true,
      },
    );
    assert.equal(test.res.status, 201);
    assert.equal(
      (await request('/api/v1/test-cases/problem/' + ids[0], student)).res
        .status,
      403,
    );
    assert.equal(
      (
        await request(
          '/api/v1/test-cases/' + test.json.data.id,
          teacher,
          'PATCH',
          { expectedOutput: '6' },
        )
      ).res.status,
      200,
    );
    const deleted = await request<{ id: string; deleted: boolean }>(
      '/api/v1/test-cases/' + test.json.data.id,
      teacher,
      'DELETE',
    );
    assert.equal(deleted.res.status, 200);
    assert.equal(deleted.json.data.deleted, true);

    for (const problemId of ids) {
      const testCase = await request<{ id: string }>(
        '/api/v1/test-cases',
        teacher,
        'POST',
        { problemId, inputData: '2 3', expectedOutput: '5', isHidden: true },
      );
      assert.equal(testCase.res.status, 201);
    }

    assert.equal(
      (await request('/api/v1/matches/current', teacher)).res.status,
      403,
    );
    const waiting = await request<{ state: string }>(
      '/api/v1/matches/queue',
      student,
      'POST',
    );
    assert.equal(waiting.res.status, 201);
    assert.equal(waiting.json.data.state, 'waiting');
    const paired = await request<{
      id: string;
      state: string;
      currentRound: number | null;
    }>('/api/v1/matches/queue', secondStudent, 'POST');
    assert.equal(paired.res.status, 201);
    assert.equal(paired.json.data.state, 'matched');
    matchId = paired.json.data.id;
    const readyOne = await request<{ currentRound: number | null }>(
      `/api/v1/matches/${matchId}/ready`,
      student,
      'POST',
    );
    assert.equal(readyOne.res.status, 200);
    assert.equal(readyOne.json.data.currentRound, null);
    const readyTwo = await request<{ currentRound: number | null }>(
      `/api/v1/matches/${matchId}/ready`,
      secondStudent,
      'POST',
    );
    assert.equal(readyTwo.res.status, 200);
    assert.equal(readyTwo.json.data.currentRound, 1);

    const admin = await signCoreHubToken(key, {
      role: 'admin',
      azp: 'csmju-coding-arena',
    });
    assert.equal((await request('/api/v1/me', admin)).res.status, 403);
    const login = await fetch(base + '/auth/login?next=%2Fstudent', {
      redirect: 'manual',
    });
    assert.equal(login.status, 302);
    assert.ok(login.headers.get('set-cookie')?.includes('HttpOnly'));
    assert.equal(
      (await request('/auth/callback?access_token=invalid&state=invalid')).res
        .status,
      401,
    );
    console.log(
      'PASS: real HTTP API, RS256/JWKS fixture, role separation, validation, pagination, hidden-test denial, teacher CRUD, delete envelope, match readiness gate, unknown-role denial, SSO state protection',
    );
  } finally {
    if (matchId) await db.match.deleteMany({ where: { id: matchId } });
    await db.matchQueue.deleteMany({
      where: { player: { coreUserId: { startsWith: prefix } } },
    });
    await db.testCase.deleteMany({ where: { problemId: { in: ids } } });
    await db.problem.deleteMany({ where: { id: { in: ids } } });
    await db.playerRating.deleteMany({
      where: { coreUserId: { startsWith: prefix } },
    });
    await app.close();
    await core.stop();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
