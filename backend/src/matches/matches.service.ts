import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MatchRoundStatus,
  MatchStatus,
  Prisma,
  SubmissionStatus,
} from '../generated/prisma/client';
import { randomInt } from 'node:crypto';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

const ROUND_DURATION_MS = 10 * 60 * 1000;
const ELO_K_FACTOR = 32;
const MATCH_QUEUE_LOCK_ID = 81372041;

@Injectable()
export class MatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async joinQueue(coreUserId: string) {
    const user = await this.usersService.ensureUser(coreUserId);

    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(${MATCH_QUEUE_LOCK_ID})`;

      const activeMatch = await tx.match.findFirst({
        where: {
          status: MatchStatus.ACTIVE,
          OR: [{ playerOneId: user.id }, { playerTwoId: user.id }],
        },
      });
      if (activeMatch) return;

      const problems = await tx.problem.findMany({
        where: { isActive: true, testCases: { some: {} } },
        select: { id: true },
      });
      if (problems.length < 3) {
        throw new BadRequestException(
          'At least three active problems with test cases are required to start a match',
        );
      }

      const opponent = await tx.matchQueue.findFirst({
        where: { playerId: { not: user.id } },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      });
      if (!opponent) {
        await tx.matchQueue.upsert({
          where: { playerId: user.id },
          create: { playerId: user.id },
          update: {},
        });
        return;
      }

      const selectedProblems = this.randomSample(problems, 3);
      const now = new Date();
      const match = await tx.match.create({
        data: {
          playerOneId: opponent.playerId,
          playerTwoId: user.id,
          rounds: {
            create: selectedProblems.map((problem, index) => ({
              problemId: problem.id,
              roundNumber: index + 1,
              status:
                index === 0
                  ? MatchRoundStatus.ACTIVE
                  : MatchRoundStatus.PENDING,
              endsAt:
                index === 0
                  ? new Date(now.getTime() + ROUND_DURATION_MS)
                  : null,
            })),
          },
        },
      });

      await tx.matchQueue.deleteMany({
        where: { playerId: { in: [opponent.playerId, user.id] } },
      });
      return match;
    });

    return this.getCurrent(coreUserId);
  }

  async leaveQueue(coreUserId: string) {
    const user = await this.usersService.ensureUser(coreUserId);
    await this.prisma.matchQueue.deleteMany({ where: { playerId: user.id } });
    return { state: 'not_queued' as const };
  }

  async getCurrent(coreUserId: string) {
    const user = await this.usersService.ensureUser(coreUserId);
    const activeMatch = await this.prisma.match.findFirst({
      where: {
        status: MatchStatus.ACTIVE,
        OR: [{ playerOneId: user.id }, { playerTwoId: user.id }],
      },
      select: { id: true },
    });
    if (activeMatch) return this.getMatch(activeMatch.id, coreUserId);

    const queueEntry = await this.prisma.matchQueue.findUnique({
      where: { playerId: user.id },
    });
    if (!queueEntry) return { state: 'idle' as const };

    const ahead = await this.prisma.matchQueue.count({
      where: {
        OR: [
          { createdAt: { lt: queueEntry.createdAt } },
          { createdAt: queueEntry.createdAt, id: { lt: queueEntry.id } },
        ],
      },
    });
    return {
      state: 'waiting' as const,
      position: ahead + 1,
      queuedAt: queueEntry.createdAt,
    };
  }

  async getMatch(matchId: string, coreUserId: string) {
    const user = await this.usersService.ensureUser(coreUserId);
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        playerOne: { select: { id: true, displayName: true, eloRating: true } },
        playerTwo: { select: { id: true, displayName: true, eloRating: true } },
        rounds: {
          orderBy: { roundNumber: 'asc' },
          include: {
            submissions: {
              where: { studentId: user.id },
              select: {
                id: true,
                status: true,
                createdAt: true,
                evaluatedAt: true,
              },
              orderBy: { createdAt: 'desc' },
              take: 5,
            },
            problem: {
              select: {
                id: true,
                title: true,
                description: true,
                timeLimitMs: true,
              },
            },
          },
        },
      },
    });
    if (!match) throw new NotFoundException('Match not found');
    if (match.playerOneId !== user.id && match.playerTwoId !== user.id) {
      throw new ForbiddenException('You are not a participant in this match');
    }

    const activeRound = match.rounds.find(
      (round) => round.status === MatchRoundStatus.ACTIVE,
    );
    const visibleRounds =
      match.status === MatchStatus.ACTIVE
        ? match.rounds.filter(
            (round) => round.roundNumber <= (activeRound?.roundNumber ?? 0),
          )
        : match.rounds;

    return {
      state: 'matched' as const,
      id: match.id,
      status: match.status,
      winnerId: match.winnerId,
      myPlayerId: user.id,
      playerOne: match.playerOne,
      playerTwo: match.playerTwo,
      currentRound: activeRound?.roundNumber ?? null,
      rounds: visibleRounds,
    };
  }

  async submit(
    matchId: string,
    coreUserId: string,
    problemId: string,
    sourceCode: string,
  ) {
    const user = await this.usersService.ensureUser(coreUserId);
    const round = await this.prisma.matchRound.findFirst({
      where: {
        matchId,
        status: MatchRoundStatus.ACTIVE,
        match: {
          status: MatchStatus.ACTIVE,
          OR: [{ playerOneId: user.id }, { playerTwoId: user.id }],
        },
      },
      include: { problem: { select: { id: true } } },
    });
    if (!round) {
      throw new ConflictException('There is no active round for this match');
    }
    if (round.problemId !== problemId) {
      throw new BadRequestException(
        'Submission problem does not match the active round',
      );
    }
    if (!round.endsAt || round.endsAt.getTime() <= Date.now()) {
      throw new ConflictException('The active round has expired');
    }

    return this.prisma.submission.create({
      data: {
        studentId: user.id,
        problemId,
        matchRoundId: round.id,
        sourceCode,
      },
    });
  }

  async recordEvaluation(submissionId: string, evaluatedAt: Date) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      select: { matchRoundId: true, status: true },
    });
    if (
      !submission?.matchRoundId ||
      submission.status !== SubmissionStatus.ACCEPTED
    ) {
      return;
    }
    await this.finalizeRound(submission.matchRoundId, evaluatedAt);
  }

  @Cron(CronExpression.EVERY_5_SECONDS)
  async closeExpiredRounds() {
    const expiredRounds = await this.prisma.matchRound.findMany({
      where: {
        status: MatchRoundStatus.ACTIVE,
        endsAt: { lte: new Date() },
      },
      select: { id: true },
    });
    for (const round of expiredRounds) {
      await this.finalizeRound(round.id, new Date());
    }
  }

  private async finalizeRound(roundId: string, evaluatedAt: Date) {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM match_rounds WHERE id = ${roundId} FOR UPDATE`;
      const round = await tx.matchRound.findUnique({
        where: { id: roundId },
        include: { match: true },
      });
      if (!round || round.status !== MatchRoundStatus.ACTIVE || !round.endsAt) {
        return;
      }

      const acceptedBeforeDeadline = await tx.submission.findFirst({
        where: {
          matchRoundId: round.id,
          status: SubmissionStatus.ACCEPTED,
          evaluatedAt: { lte: round.endsAt },
        },
        orderBy: [{ evaluatedAt: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      });
      if (!acceptedBeforeDeadline && evaluatedAt < round.endsAt) return;
      if (!acceptedBeforeDeadline) {
        const outstandingEvaluations = await tx.submission.count({
          where: {
            matchRoundId: round.id,
            status: SubmissionStatus.EVALUATING,
            createdAt: { lte: round.endsAt },
          },
        });
        if (outstandingEvaluations > 0) return;
      }

      const winnerId = acceptedBeforeDeadline?.studentId ?? null;
      await tx.matchRound.update({
        where: { id: round.id },
        data: {
          status: winnerId ? MatchRoundStatus.WON : MatchRoundStatus.DRAW,
          winnerId,
          completedAt: winnerId
            ? acceptedBeforeDeadline.evaluatedAt
            : round.endsAt,
        },
      });

      const wins = winnerId
        ? await tx.matchRound.count({
            where: {
              matchId: round.matchId,
              status: MatchRoundStatus.WON,
              winnerId,
            },
          })
        : 0;
      const roundsResolved = await tx.matchRound.count({
        where: {
          matchId: round.matchId,
          status: { in: [MatchRoundStatus.WON, MatchRoundStatus.DRAW] },
        },
      });

      if (wins >= 2) {
        await this.completeMatch(tx, round.match, winnerId);
        return;
      }
      if (roundsResolved === 3) {
        await this.completeMatch(tx, round.match, null);
        return;
      }

      const nextRound = await tx.matchRound.findFirst({
        where: {
          matchId: round.matchId,
          roundNumber: round.roundNumber + 1,
          status: MatchRoundStatus.PENDING,
        },
      });
      if (nextRound) {
        await tx.matchRound.update({
          where: { id: nextRound.id },
          data: {
            status: MatchRoundStatus.ACTIVE,
            endsAt: new Date(Date.now() + ROUND_DURATION_MS),
          },
        });
      }
    });
  }

  private async completeMatch(
    tx: Prisma.TransactionClient,
    match: { id: string; playerOneId: string; playerTwoId: string },
    winnerId: string | null,
  ) {
    const players = await tx.user.findMany({
      where: { id: { in: [match.playerOneId, match.playerTwoId] } },
      select: { id: true, eloRating: true },
    });
    const playerOne = players.find((player) => player.id === match.playerOneId);
    const playerTwo = players.find((player) => player.id === match.playerTwoId);
    if (!playerOne || !playerTwo) {
      throw new NotFoundException('Match participant not found');
    }

    const oneExpected =
      1 / (1 + 10 ** ((playerTwo.eloRating - playerOne.eloRating) / 400));
    const oneRatingDelta =
      winnerId === null
        ? Math.round(ELO_K_FACTOR * (0.5 - oneExpected))
        : winnerId === playerOne.id
          ? Math.max(1, Math.round(ELO_K_FACTOR * (1 - oneExpected)))
          : -Math.max(1, Math.round(ELO_K_FACTOR * oneExpected));
    const twoRatingDelta = -oneRatingDelta;
    const oneRating = playerOne.eloRating + oneRatingDelta;
    const twoRating = playerTwo.eloRating + twoRatingDelta;

    await tx.user.update({
      where: { id: playerOne.id },
      data: { eloRating: oneRating, hasCompetitiveRating: true },
    });
    await tx.user.update({
      where: { id: playerTwo.id },
      data: { eloRating: twoRating, hasCompetitiveRating: true },
    });
    await tx.match.update({
      where: { id: match.id },
      data: {
        status: winnerId ? MatchStatus.COMPLETED : MatchStatus.DRAW,
        winnerId,
        completedAt: new Date(),
      },
    });
  }

  private randomSample<T>(items: T[], count: number): T[] {
    const shuffled = [...items];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = randomInt(index + 1);
      [shuffled[index], shuffled[swapIndex]] = [
        shuffled[swapIndex],
        shuffled[index],
      ];
    }
    return shuffled.slice(0, count);
  }
}
