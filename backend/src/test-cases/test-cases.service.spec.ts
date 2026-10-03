import { Test, TestingModule } from '@nestjs/testing';
import { TestCasesService } from './test-cases.service';
import { PrismaService } from '../prisma/prisma.service';

describe('TestCasesService', () => {
  let service: TestCasesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TestCasesService,
        {
          provide: PrismaService,
          useValue: { testCase: { create: jest.fn(), findMany: jest.fn() } },
        },
      ],
    }).compile();

    service = module.get<TestCasesService>(TestCasesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
