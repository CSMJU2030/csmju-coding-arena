import { AppException } from '../common/errors';
import { PrismaService } from '../prisma/prisma.service';
import { LevelClearsService } from './level-clears.service';

describe('LevelClearsService', () => {
  const upsert = jest.fn().mockResolvedValue({
    id: 'x',
    game: 'GRID',
    level: 3,
    createdAt: new Date(0),
  });
  const service = new LevelClearsService({
    levelClear: { upsert },
  } as unknown as PrismaService);

  it('บันทึกด่านที่ผ่านแบบไม่ซ้ำ (upsert ด้วยผู้ใช้+เกม+ด่าน)', async () => {
    await service.create('user-1', 'GRID', 3);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          coreUserId_game_level: {
            coreUserId: 'user-1',
            game: 'GRID',
            level: 3,
          },
        },
        update: {},
      }),
    );
  });

  it('ด่านเกินจำนวนของเกม = 400', async () => {
    await expect(
      service.create('user-1', 'FLEXBOX', 25),
    ).rejects.toBeInstanceOf(AppException);
    await expect(service.create('user-1', 'GRID', 21)).rejects.toBeInstanceOf(
      AppException,
    );
  });
});
