import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { MatchesService } from './matches.service';

const player = {
  id: 'student-two',
  coreUserId: 'core-student-two',
  displayName: 'Player-two',
  eloRating: 1200,
  hasCompetitiveRating: false,
};

const problems = [
  { id: 'problem-one' },
  { id: 'problem-two' },
  { id: 'problem-three' },
  { id: 'problem-four' },
];

describe('MatchesService', () => {
  async function createService(withOpponent: boolean) {
    let createdMatchData:
      | {
          playerOneId: string;
          playerTwoId: string;
          rounds: {
            create: Array<{
              problemId: string;
              roundNumber: number;
              status: string;
              endsAt: Date | null;
            }>;
          };
        }
      | undefined;

    const opponent = {
      id: 'queue-entry',
      playerId: 'student-one',
      createdAt: new Date(0),
    };
    const transactionClient = {
      $queryRaw: jest.fn(),
      match: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(({ data }: { data: typeof createdMatchData }) => {
          createdMatchData = data;
          return Promise.resolve({ id: 'match-id' });
        }),
      },
      matchQueue: {
        findFirst: jest.fn().mockResolvedValue(withOpponent ? opponent : null),
        upsert: jest.fn(),
        deleteMany: jest.fn(),
      },
      problem: { findMany: jest.fn().mockResolvedValue(problems) },
    };
    const prisma = {
      playerRating: { upsert: jest.fn().mockResolvedValue(player) },
      $transaction: jest.fn(
        (callback: (client: typeof transactionClient) => Promise<unknown>) =>
          callback(transactionClient),
      ),
      match: {
        findFirst: jest
          .fn()
          .mockResolvedValue(withOpponent ? { id: 'match-id' } : null),
        findUnique: jest.fn(() =>
          Promise.resolve({
            id: 'match-id',
            playerOneId: 'student-one',
            playerTwoId: player.id,
            winnerId: null,
            status: 'ACTIVE',
            playerOne: {
              id: 'student-one',
              displayName: 'Player-one',
              eloRating: 1200,
            },
            playerTwo: {
              id: player.id,
              displayName: player.displayName,
              eloRating: player.eloRating,
            },
            rounds: (createdMatchData?.rounds.create ?? []).map(
              (round, index) => ({
                ...round,
                id: `round-${index + 1}`,
                matchId: 'match-id',
                winnerId: null,
                completedAt: null,
                problem: {
                  id: round.problemId,
                  title: `Problem ${index + 1}`,
                  description: 'Test problem',
                  timeLimitMs: 1000,
                },
                submissions: [],
              }),
            ),
          }),
        ),
      },
      matchQueue: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'queue-entry-two',
          playerId: player.id,
          createdAt: new Date(),
        }),
        count: jest.fn().mockResolvedValue(0),
        deleteMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchesService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: UsersService,
          useValue: { ensureUser: jest.fn().mockResolvedValue(player) },
        },
      ],
    }).compile();

    return {
      service: module.get(MatchesService),
      prisma,
      transactionClient,
      getCreatedMatchData: () => createdMatchData,
    };
  }

  it('queues a student when no opponent is waiting', async () => {
    const { service, transactionClient } = await createService(false);

    await expect(service.joinQueue(player.coreUserId)).resolves.toMatchObject({
      state: 'waiting',
      position: 1,
    });
    expect(transactionClient.matchQueue.upsert).toHaveBeenCalledTimes(1);
    expect(transactionClient.match.create).not.toHaveBeenCalled();
  });

  it('creates a shared match but does not start the clock before both players are ready', async () => {
    const { service, transactionClient, getCreatedMatchData } =
      await createService(true);

    await expect(service.joinQueue(player.coreUserId)).resolves.toMatchObject({
      state: 'matched',
      id: 'match-id',
      currentRound: null,
      rounds: [],
    });
    const createdRounds = getCreatedMatchData()?.rounds.create ?? [];
    const assigned = createdRounds.map((round) => round.problemId);
    expect(assigned).toHaveLength(3);
    expect(new Set(assigned).size).toBe(3);
    expect(createdRounds.every((round) => round.status === 'PENDING')).toBe(
      true,
    );
    expect(createdRounds.every((round) => round.endsAt === null)).toBe(true);
    expect(transactionClient.matchQueue.deleteMany).toHaveBeenCalledTimes(1);
  });

  it('awards the best-of-three winner using a K=32 Elo update', async () => {
    const winner = {
      id: 'student-one',
      eloRating: 1200,
    };
    const match = {
      id: 'match-id',
      playerOneId: winner.id,
      playerTwoId: player.id,
    };
    let updatedMatch:
      | {
          where: { id: string };
          data: {
            status: string;
            winnerId: string | null;
            completedAt: Date;
          };
        }
      | undefined;
    const transactionClient = {
      $queryRaw: jest.fn(),
      matchRound: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'round-three',
          matchId: match.id,
          roundNumber: 3,
          status: 'ACTIVE',
          endsAt: new Date(Date.now() + 60_000),
          match,
        }),
        update: jest.fn(),
        count: jest.fn().mockResolvedValueOnce(2),
      },
      submission: {
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn().mockResolvedValue({
          studentId: winner.id,
          createdAt: new Date(),
          evaluatedAt: new Date(),
        }),
      },
      playerRating: {
        findMany: jest.fn().mockResolvedValue([
          { id: winner.id, eloRating: 1200 },
          { id: player.id, eloRating: 1200 },
        ]),
        update: jest.fn(),
      },
      match: {
        update: jest.fn((args: NonNullable<typeof updatedMatch>) => {
          updatedMatch = args;
        }),
      },
    };
    const prisma = {
      submission: {
        findUnique: jest.fn().mockResolvedValue({
          matchRoundId: 'round-three',
          status: 'ACCEPTED',
        }),
      },
      $transaction: jest.fn(
        (callback: (client: typeof transactionClient) => Promise<unknown>) =>
          callback(transactionClient),
      ),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchesService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: UsersService,
          useValue: { ensureUser: jest.fn().mockResolvedValue(player) },
        },
      ],
    }).compile();

    await module
      .get(MatchesService)
      .recordEvaluation('submission-id', new Date());

    expect(transactionClient.playerRating.update).toHaveBeenNthCalledWith(1, {
      where: { id: winner.id },
      data: { eloRating: 1216, hasCompetitiveRating: true },
    });
    expect(transactionClient.playerRating.update).toHaveBeenNthCalledWith(2, {
      where: { id: player.id },
      data: { eloRating: 1184, hasCompetitiveRating: true },
    });
    if (!updatedMatch) throw new Error('Match completion was not persisted');
    expect(updatedMatch.where.id).toBe(match.id);
    expect(updatedMatch.data.status).toBe('COMPLETED');
    expect(updatedMatch.data.winnerId).toBe(winner.id);
  });

  it('waits for submissions already being evaluated before finalizing a timeout', async () => {
    const roundEnd = new Date(Date.now() - 1_000);
    const transactionClient = {
      $queryRaw: jest.fn(),
      matchRound: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'round-id',
          matchId: 'match-id',
          roundNumber: 1,
          status: 'ACTIVE',
          endsAt: roundEnd,
          match: {
            id: 'match-id',
            playerOneId: 'student-one',
            playerTwoId: player.id,
          },
        }),
        update: jest.fn(),
      },
      submission: {
        findFirst: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(1),
      },
    };
    const prisma = {
      submission: {
        findUnique: jest.fn().mockResolvedValue({
          matchRoundId: 'round-id',
          status: 'ACCEPTED',
        }),
      },
      $transaction: jest.fn(
        (callback: (client: typeof transactionClient) => Promise<unknown>) =>
          callback(transactionClient),
      ),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchesService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: UsersService,
          useValue: { ensureUser: jest.fn().mockResolvedValue(player) },
        },
      ],
    }).compile();

    await module
      .get(MatchesService)
      .recordEvaluation('submission-id', new Date());

    expect(transactionClient.submission.count).toHaveBeenCalledWith({
      where: {
        matchRoundId: 'round-id',
        status: { in: ['PENDING', 'EVALUATING'] },
        createdAt: { lte: roundEnd },
      },
    });
    expect(transactionClient.matchRound.update).not.toHaveBeenCalled();
  });
});
