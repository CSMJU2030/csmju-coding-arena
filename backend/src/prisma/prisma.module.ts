import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Module({
  providers: [PrismaService],
  exports: [PrismaService], // สำคัญมาก เพื่อให้ Module อื่นใช้ DB ได้
})
export class PrismaModule {}
