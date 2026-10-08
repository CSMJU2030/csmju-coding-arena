import { ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { MatchesService } from './matches.service';

const host = {
  id: 'host',
  coreUserId: 'core-host',
  displayName: 'Player-host',
  eloRating: 1200,
};
const guest = {
  id: 'guest',
  coreUserId: 'core-guest',
  displayName: 'Player-guest',
  eloRating: 1200,
};

function setup(
  room: Record<string, unknown> | null,
  busy: { id: string } | null = null,
) {
  const tx = {
    $queryRaw: jest.fn(),
    match: {
      findUnique: jest.fn().mockResolvedValue(room),
      findFirst: jest.fn().mockResolvedValue(busy),
      update: jest.fn(),
      create: jest.fn().mockResolvedValue({ id: 'room-id' }),
    },
    matchQueue: { deleteMany: jest.fn() },
    problem: {
      findMany: jest
        .fn()
        .mockResolvedValue([{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }]),
    },
  };
  const prisma = {
    $transaction: jest.fn((cb: (client: typeof tx) => Promise<unknown>) =>
      cb(tx),
    ),
    match: {
      findUnique: jest.fn().mockResolvedValue({ playerOneId: host.id }),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };
  const users = {
    ensureUser: jest.fn((coreUserId: string) =>
      Promise.resolve(coreUserId === host.coreUserId ? host : guest),
    ),
  };
  const service = new MatchesService(
    prisma as unknown as PrismaService,
    users as unknown as UsersService,
  );
  jest.spyOn(service, 'getMatch').mockResolvedValue({ id: 'room-id' } as never);
  return { service, tx, prisma };
}

describe('MatchesService rooms', () => {
  it('สร้างห้องสถานะ WAITING ด้วยโจทย์ที่เลือก 3 ข้อตามลำดับ', async () => {
    const { service, tx } = setup(null);
    await service.createRoom(host.coreUserId, '  ห้องฝึก  ', [
      'p3',
      'p1',
      'p2',
    ]);
    const [[{ data }]] = tx.match.create.mock.calls as [
      [
        {
          data: {
            playerOneId: string;
            title: string;
            status: string;
            rounds: { create: { problemId: string; roundNumber: number }[] };
          };
        },
      ],
    ];
    expect(data).toMatchObject({
      playerOneId: host.id,
      title: 'ห้องฝึก',
      status: 'WAITING',
    });
    expect(data.rounds.create.map((r) => [r.problemId, r.roundNumber])).toEqual(
      [
        ['p3', 1],
        ['p1', 2],
        ['p2', 3],
      ],
    );
  });

  it('สร้างห้องไม่ได้ถ้ายังมีห้อง/การแข่งที่ค้างอยู่', async () => {
    const { service } = setup(null, { id: 'old' });
    await expect(
      service.createRoom(host.coreUserId, undefined, undefined),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('เข้าร่วมห้องที่รออยู่ = ใส่เป็นผู้เล่นคนที่ 2 และเริ่มการแข่ง', async () => {
    const { service, tx } = setup({
      playerOneId: host.id,
      playerTwoId: null,
      status: 'WAITING',
      createdAt: new Date(),
    });
    await service.joinRoom('room-id', guest.coreUserId);
    expect(tx.match.update).toHaveBeenCalledWith({
      where: { id: 'room-id' },
      data: { playerTwoId: guest.id, status: 'ACTIVE' },
    });
    expect(tx.matchQueue.deleteMany).toHaveBeenCalledWith({
      where: { playerId: guest.id },
    });
  });

  it('เข้าห้องที่มีคู่แข่งแล้วไม่ได้', async () => {
    const { service } = setup({
      playerOneId: host.id,
      playerTwoId: 'other',
      status: 'ACTIVE',
      createdAt: new Date(),
    });
    await expect(
      service.joinRoom('room-id', guest.coreUserId),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('ปิดห้องได้เฉพาะเจ้าของ และคืน {id, deleted:true}', async () => {
    const { service, prisma } = setup(null);
    await expect(
      service.cancelRoom('room-id', host.coreUserId),
    ).resolves.toEqual({ id: 'room-id', deleted: true });
    expect(prisma.match.deleteMany).toHaveBeenCalledWith({
      where: { id: 'room-id', status: 'WAITING' },
    });
    await expect(
      service.cancelRoom('room-id', guest.coreUserId),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
