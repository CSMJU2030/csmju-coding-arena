import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

interface UserUpsertArgs {
  where: { coreUserId: string };
  create: { coreUserId: string; displayName: string };
  update: Record<string, never>;
}

interface UserRecord {
  id: string;
  coreUserId: string;
  displayName: string;
  eloRating: number;
}

describe('UsersService', () => {
  let service: UsersService;
  let prismaMock: {
    user: {
      upsert: jest.Mock<Promise<UserRecord>, [UserUpsertArgs]>;
      findMany: jest.Mock<
        Promise<Array<{ displayName: string; eloRating: number }>>,
        [unknown]
      >;
    };
  };

  beforeEach(async () => {
    prismaMock = {
      user: {
        upsert: jest.fn<Promise<UserRecord>, [UserUpsertArgs]>(),
        findMany: jest.fn<
          Promise<Array<{ displayName: string; eloRating: number }>>,
          [unknown]
        >(),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a stable anonymous player profile from Core identity', async () => {
    const user: UserRecord = {
      id: 'user-id',
      coreUserId: 'core-user-1',
      displayName: 'Player-123456789abc',
      eloRating: 1200,
    };
    prismaMock.user.upsert.mockResolvedValue(user);

    await expect(service.ensureUser('core-user-1')).resolves.toBe(user);
    const firstCall = prismaMock.user.upsert.mock.calls[0]?.[0];
    if (!firstCall) throw new Error('User upsert was not called');
    expect(firstCall.where).toEqual({ coreUserId: 'core-user-1' });
    expect(firstCall.create.coreUserId).toBe('core-user-1');
    expect(firstCall.create.displayName).toMatch(/^Player-[a-f0-9]{12}$/);
  });

  it('returns only the top five competitive ratings', async () => {
    prismaMock.user.findMany.mockResolvedValue([
      { displayName: 'Player-A', eloRating: 1400 },
    ]);

    await expect(service.getLeaderboard()).resolves.toEqual([
      { rank: 1, displayName: 'Player-A', eloRating: 1400 },
    ]);
    expect(prismaMock.user.findMany).toHaveBeenCalledWith({
      where: { hasCompetitiveRating: true },
      orderBy: [{ eloRating: 'desc' }, { id: 'asc' }],
      select: { displayName: true, eloRating: true },
      take: 5,
    });
  });
});
