import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, RequestMethod } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  afterEach(async () => {
    if (app) await app.close();
  });

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api', {
      exclude: [
        { path: 'auth/login', method: RequestMethod.GET },
        { path: 'auth/callback', method: RequestMethod.GET },
        { path: 'auth/logout', method: RequestMethod.POST },
      ],
    });
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer() as never)
      .get('/api/health')
      .expect(200)
      .expect((response: { body: { status: string } }) =>
        expect(response.body.status).toBe('ok'),
      );
  });
});
