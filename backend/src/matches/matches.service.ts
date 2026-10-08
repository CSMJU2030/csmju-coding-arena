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
} from '../../generated/prisma/client';
import { randomInt } from 'node:crypto';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { buildPaginationMeta } from '../common/dto/pagination.dto';
import { CollectionResult } from '../common/api-response';
import {
  type BrowserJudgedSubmissionDto,
  judgeOutputs,
  MAX_TEST_CASES,
} from './browser-judge';

const ROUND_DURATION_MS = 10 * 60 * 1000;
/** ห้องที่ไม่มีใครเข้าร่วมภายในเวลานี้ถูกปิดอัตโนมัติ */
const WAITING_ROOM_TTL_MS = 30 * 60 * 1000;
const ROUNDS_PER_MATCH = 3;
const ELO_K_FACTOR = 32;
const MATCH_QUEUE_LOCK_ID = 81372041;
const PARTICIPANT = {
  select: { id: true, displayName: true, eloRating: true },
} as const;

export type RoomFilter = 'WAITING' | 'ACTIVE';

@Injectable()
export class MatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async joinQueue(coreUserId: string) {
    const user = await this.usersService.ensureUser(coreUserId);

    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(${MATCH_QUEUE_LOCK_ID})::text`;

      const activeMatch = await tx.match.findFirst({
        where: {
          status: MatchStatus.ACTIVE,
          OR: [{ playerOneId: user.id }, { playerTwoId: user.id }],
        },
      });
      if (activeMatch) return;
      await this.assertNotHosting(tx, user.id);

      const selectedProblems = await this.pickProblems(tx);

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

      const match = await tx.match.create({
        data: {
          playerOneId: opponent.playerId,
          playerTwoId: user.id,
          rounds: { create: this.roundsFor(selectedProblems) },
        },
      });

      await tx.matchQueue.deleteMany({
        where: { playerId: { in: [opponent.playerId, user.id] } },
      });
      return match;
    });

    return this.getCurrent(coreUserId);
  }

  /** สร้างห้องให้คนอื่นเลือกเข้าร่วม — เลือกโจทย์เอง 3 ข้อ หรือให้ระบบสุ่ม */
  async createRoom(
    coreUserId: string,
    title: string | undefined,
    problemIds: string[] | undefined,
  ) {
    const user = await this.usersService.ensureUser(coreUserId);
    const room = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(${MATCH_QUEUE_LOCK_ID})::text`;
      await this.assertFree(tx, user.id);
      const selected = await this.pickProblems(tx, problemIds);
      await tx.matchQueue.deleteMany({ where: { playerId: user.id } });
      return tx.match.create({
        data: {
          playerOneId: user.id,
          title: title?.trim() || null,
          status: MatchStatus.WAITING,
          rounds: { create: this.roundsFor(selected) },
        },
        select: { id: true },
      });
    });
    return this.getMatch(room.id, coreUserId);
  }

  /** รายการห้อง: WAITING = ห้องที่รอคู่แข่ง · ACTIVE = กำลังแข่ง (ดูสถานะได้ เข้าร่วมไม่ได้) */
  async listRooms(
    coreUserId: string,
    status: RoomFilter,
    page: number,
    take: number,
  ) {
    const user = await this.usersService.ensureUser(coreUserId);
    const where: Prisma.MatchWhereInput = {
      status: MatchStatus[status],
      ...(status === 'WAITING'
        ? { createdAt: { gt: new Date(Date.now() - WAITING_ROOM_TTL_MS) } }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.match.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * take,
        take,
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
          playerOne: PARTICIPANT,
          playerTwo: PARTICIPANT,
          rounds: {
            select: { roundNumber: true, status: true, winnerId: true },
          },
        },
      }),
      this.prisma.match.count({ where }),
    ]);
    const data = rows.map((row) => {
      const wins = (playerId: string | undefined) =>
        row.rounds.filter(
          (round) =>
            round.status === MatchRoundStatus.WON &&
            round.winnerId === playerId,
        ).length;
      const active = row.rounds.find(
        (round) => round.status === MatchRoundStatus.ACTIVE,
      );
      return {
        id: row.id,
        title: row.title,
        status: row.status,
        createdAt: row.createdAt,
        playerOne: row.playerOne,
        playerTwo: row.playerTwo,
        isMine: row.playerOne.id === user.id || row.playerTwo?.id === user.id,
        currentRound: active?.roundNumber ?? null,
        playerOneWins: wins(row.playerOne.id),
        playerTwoWins: wins(row.playerTwo?.id),
      };
    });
    return new CollectionResult(data, buildPaginationMeta(total, page, take));
  }

  /** เข้าร่วมห้อง — คนแรกที่กดได้ห้องนั้น แล้วเข้าสู่ขั้น "พร้อม" เหมือนจับคู่ด่วน */
  async joinRoom(matchId: string, coreUserId: string) {
    const user = await this.usersService.ensureUser(coreUserId);
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(${MATCH_QUEUE_LOCK_ID})::text`;
      const room = await tx.match.findUnique({
        where: { id: matchId },
        select: {
          playerOneId: true,
          playerTwoId: true,
          status: true,
          createdAt: true,
        },
      });
      if (!room) throw new NotFoundException('ไม่พบห้องนี้');
      if (room.playerOneId === user.id || room.playerTwoId === user.id) return;
      if (
        room.status !== MatchStatus.WAITING ||
        room.createdAt.getTime() < Date.now() - WAITING_ROOM_TTL_MS
      ) {
        throw new ConflictException('ห้องนี้มีคู่แข่งแล้วหรือถูกปิดไปแล้ว');
      }
      await this.assertFree(tx, user.id);
      await tx.matchQueue.deleteMany({ where: { playerId: user.id } });
      await tx.match.update({
        where: { id: matchId },
        data: { playerTwoId: user.id, status: MatchStatus.ACTIVE },
      });
    });
    return this.getMatch(matchId, coreUserId);
  }

  /** เจ้าของห้องปิดห้องที่ยังไม่มีคู่แข่ง */
  async cancelRoom(matchId: string, coreUserId: string) {
    const user = await this.usersService.ensureUser(coreUserId);
    const room = await this.prisma.match.findUnique({
      where: { id: matchId },
      select: { playerOneId: true },
    });
    if (!room) throw new NotFoundException('ไม่พบห้องนี้');
    if (room.playerOneId !== user.id) {
      throw new ForbiddenException('ปิดได้เฉพาะห้องที่คุณสร้าง');
    }
    const deleted = await this.prisma.match.deleteMany({
      where: { id: matchId, status: MatchStatus.WAITING },
    });
    if (!deleted.count) {
      throw new ConflictException('ห้องนี้เริ่มแข่งแล้ว ปิดไม่ได้');
    }
    return { id: matchId, deleted: true as const };
  }

  @Cron(CronExpression.EVERY_MINUTE, { timeZone: 'Asia/Bangkok' })
  async closeStaleRooms() {
    await this.prisma.match.deleteMany({
      where: {
        status: MatchStatus.WAITING,
        createdAt: { lt: new Date(Date.now() - WAITING_ROOM_TTL_MS) },
      },
    });
  }

  /** input ของชุดทดสอบในข้อที่กำลังแข่ง ให้เบราว์เซอร์รันโค้ด — expected output ไม่ส่งออกไป */
  async testInputs(matchId: string, coreUserId: string) {
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
      select: {
        problem: {
          select: {
            id: true,
            timeLimitMs: true,
            testCases: { orderBy: { id: 'asc' }, select: { inputData: true } },
          },
        },
      },
    });
    if (!round) {
      throw new ConflictException('There is no active round for this match');
    }
    return {
      problemId: round.problem.id,
      timeLimitMs: round.problem.timeLimitMs,
      inputs: round.problem.testCases
        .slice(0, MAX_TEST_CASES)
        .map((testCase) => testCase.inputData),
    };
  }

  async markReady(matchId: string, coreUserId: string) {
    const user = await this.usersService.ensureUser(coreUserId);

    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM matches WHERE id = ${matchId} FOR UPDATE`;
      const match = await tx.match.findUnique({
        where: { id: matchId },
        select: {
          playerOneId: true,
          playerTwoId: true,
          readyPlayerOneAt: true,
          readyPlayerTwoAt: true,
          status: true,
        },
      });
      if (!match) throw new NotFoundException('Match not found');
      if (match.playerOneId !== user.id && match.playerTwoId !== user.id) {
        throw new ForbiddenException('You are not a participant in this match');
      }
      if (match.status !== MatchStatus.ACTIVE) return;

      const readyAt = new Date();
      const updated = await tx.match.update({
        where: { id: matchId },
        data:
          match.playerOneId === user.id
            ? { readyPlayerOneAt: match.readyPlayerOneAt ?? readyAt }
            : { readyPlayerTwoAt: match.readyPlayerTwoAt ?? readyAt },
        select: { readyPlayerOneAt: true, readyPlayerTwoAt: true },
      });

      if (updated.readyPlayerOneAt && updated.readyPlayerTwoAt) {
        const firstRound = await tx.matchRound.findFirst({
          where: {
            matchId,
            roundNumber: 1,
            status: MatchRoundStatus.PENDING,
          },
        });
        if (firstRound) {
          await tx.matchRound.update({
            where: { id: firstRound.id },
            data: {
              status: MatchRoundStatus.ACTIVE,
              endsAt: new Date(Date.now() + ROUND_DURATION_MS),
            },
          });
        }
      }
    });

    return this.getMatch(matchId, coreUserId);
  }

  async leaveQueue(coreUserId: string) {
    const user = await this.usersService.ensureUser(coreUserId);
    await this.prisma.matchQueue.deleteMany({ where: { playerId: user.id } });
    return { state: 'idle' as const };
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

    const hosted = await this.prisma.match.findFirst({
      where: {
        status: MatchStatus.WAITING,
        playerOneId: user.id,
        createdAt: { gt: new Date(Date.now() - WAITING_ROOM_TTL_MS) },
      },
      select: { id: true },
    });
    if (hosted) return { state: 'hosting' as const, id: hosted.id };

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
        playerOne: PARTICIPANT,
        playerTwo: PARTICIPANT,
        rounds: {
          orderBy: { roundNumber: 'asc' },
          include: {
            submissions: {
              where: { studentId: user.id },
              select: {
                id: true,
                status: true,
                language: true,
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
    // ห้องที่รอคู่แข่งและข้อที่ยังไม่ถึง ไม่เปิดเผยโจทย์
    const visibleRounds =
      match.status === MatchStatus.ACTIVE ||
      match.status === MatchStatus.WAITING
        ? match.rounds.filter(
            (round) => round.roundNumber <= (activeRound?.roundNumber ?? 0),
          )
        : match.rounds;

    return {
      state: 'matched' as const,
      id: match.id,
      title: match.title,
      status: match.status,
      winnerId: match.winnerId,
      myPlayerId: user.id,
      playerOne: match.playerOne,
      playerTwo: match.playerTwo,
      currentRound: activeRound?.roundNumber ?? null,
      rounds: visibleRounds,
    };
  }

  /** รับผลที่เบราว์เซอร์รันมา แล้วตัดสินทันทีจาก expected output ที่เก็บใน server */
  async submit(
    matchId: string,
    coreUserId: string,
    dto: BrowserJudgedSubmissionDto,
  ) {
    const user = await this.usersService.ensureUser(coreUserId);
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM match_rounds WHERE match_id = ${matchId} AND status = 'ACTIVE' FOR UPDATE`;
      const round = await tx.matchRound.findFirst({
        where: {
          matchId,
          status: MatchRoundStatus.ACTIVE,
          match: {
            status: MatchStatus.ACTIVE,
            OR: [{ playerOneId: user.id }, { playerTwoId: user.id }],
          },
        },
        include: {
          problem: {
            select: {
              testCases: {
                orderBy: { id: 'asc' },
                select: { expectedOutput: true },
              },
            },
          },
        },
      });
      if (!round) {
        throw new ConflictException('There is no active round for this match');
      }
      if (round.problemId !== dto.problemId) {
        throw new BadRequestException(
          'Submission problem does not match the active round',
        );
      }
      if (!round.endsAt || round.endsAt.getTime() <= Date.now()) {
        throw new ConflictException('The active round has expired');
      }

      const verdict = judgeOutputs(
        round.problem.testCases
          .slice(0, MAX_TEST_CASES)
          .map((testCase) => testCase.expectedOutput),
        dto.outcome,
        dto.outputs,
      );
      if (!verdict) {
        throw new BadRequestException(
          'จำนวนผลลัพธ์ไม่ตรงกับจำนวนชุดทดสอบ กรุณาโหลดหน้าใหม่แล้วส่งอีกครั้ง',
        );
      }
      const evaluatedAt = new Date();
      const submission = await tx.submission.create({
        data: {
          studentId: user.id,
          problemId: dto.problemId,
          matchRoundId: round.id,
          sourceCode: dto.sourceCode,
          language: dto.language,
          status: verdict.status,
          evaluationStartedAt: evaluatedAt,
          evaluatedAt,
        },
        select: {
          id: true,
          status: true,
          language: true,
          createdAt: true,
          evaluatedAt: true,
        },
      });
      return { ...submission, failedTest: verdict.failedTest };
    });
    await this.recordEvaluation(result.id, result.evaluatedAt ?? new Date());
    return result;
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

  @Cron(CronExpression.EVERY_5_SECONDS, { timeZone: 'Asia/Bangkok' })
  async closeExpiredRounds() {
    const expiredRounds = await this.prisma.matchRound.findMany({
      where: {
        status: MatchRoundStatus.ACTIVE,
        OR: [
          { endsAt: { lte: new Date() } },
          { submissions: { some: { status: SubmissionStatus.ACCEPTED } } },
        ],
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

      // ตรวจแบบทันที (ไม่มีคิวรอตรวจ) — คำตอบถูกที่ส่งก่อนหมดเวลาคนแรกชนะ
      const acceptedBeforeDeadline = await tx.submission.findFirst({
        where: {
          matchRoundId: round.id,
          status: SubmissionStatus.ACCEPTED,
          createdAt: { lte: round.endsAt },
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      });
      if (!acceptedBeforeDeadline && evaluatedAt < round.endsAt) return;

      const winnerId = acceptedBeforeDeadline?.studentId ?? null;
      await tx.matchRound.update({
        where: { id: round.id },
        data: {
          status: winnerId ? MatchRoundStatus.WON : MatchRoundStatus.DRAW,
          winnerId,
          completedAt: winnerId
            ? (acceptedBeforeDeadline?.createdAt ?? round.endsAt)
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
      if (roundsResolved === ROUNDS_PER_MATCH) {
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
    match: { id: string; playerOneId: string; playerTwoId: string | null },
    winnerId: string | null,
  ) {
    const players = await tx.playerRating.findMany({
      where: {
        id: { in: [match.playerOneId, match.playerTwoId ?? match.playerOneId] },
      },
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

    await tx.playerRating.update({
      where: { id: playerOne.id },
      data: { eloRating: oneRating, hasCompetitiveRating: true },
    });
    await tx.playerRating.update({
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

  /** เปิดห้องหรือเข้าร่วมได้ทีละห้อง — ต้องไม่มีห้องที่รออยู่หรือการแข่งที่ยังไม่จบ */
  private async assertFree(tx: Prisma.TransactionClient, playerId: string) {
    const busy = await tx.match.findFirst({
      where: {
        status: { in: [MatchStatus.WAITING, MatchStatus.ACTIVE] },
        OR: [{ playerOneId: playerId }, { playerTwoId: playerId }],
      },
      select: { id: true },
    });
    if (busy) {
      throw new ConflictException('คุณมีห้องหรือการแข่งขันที่ยังไม่จบอยู่แล้ว');
    }
  }

  private async assertNotHosting(
    tx: Prisma.TransactionClient,
    playerId: string,
  ) {
    const hosting = await tx.match.findFirst({
      where: { status: MatchStatus.WAITING, playerOneId: playerId },
      select: { id: true },
    });
    if (hosting) {
      throw new ConflictException('ปิดห้องที่คุณสร้างไว้ก่อนเข้าคิวจับคู่ด่วน');
    }
  }

  /** โจทย์ 3 ข้อของการแข่ง: ที่ผู้สร้างห้องเลือก (ต้องเปิดอยู่และมีชุดทดสอบ) หรือสุ่ม */
  private async pickProblems(
    tx: Prisma.TransactionClient,
    chosen?: string[],
  ): Promise<{ id: string }[]> {
    const problems = await tx.problem.findMany({
      where: {
        isActive: true,
        testCases: { some: {} },
        ...(chosen?.length ? { id: { in: chosen } } : {}),
      },
      select: { id: true },
    });
    if (chosen?.length) {
      if (
        new Set(chosen).size !== ROUNDS_PER_MATCH ||
        problems.length !== ROUNDS_PER_MATCH
      ) {
        throw new BadRequestException(
          'เลือกโจทย์ที่เปิดอยู่และมีชุดทดสอบให้ครบ 3 ข้อไม่ซ้ำกัน',
        );
      }
      return chosen.map((id) => ({ id }));
    }
    if (problems.length < ROUNDS_PER_MATCH) {
      throw new BadRequestException(
        'At least three active problems with test cases are required to start a match',
      );
    }
    return this.randomSample(problems, ROUNDS_PER_MATCH);
  }

  private roundsFor(problems: { id: string }[]) {
    return problems.map((problem, index) => ({
      problemId: problem.id,
      roundNumber: index + 1,
      status: MatchRoundStatus.PENDING,
      endsAt: null,
    }));
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
