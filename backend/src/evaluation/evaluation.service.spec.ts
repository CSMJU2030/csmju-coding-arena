import { Test, TestingModule } from '@nestjs/testing';
import { EvaluationService } from './evaluation.service';
import { PrismaService } from '../prisma/prisma.service';
import { MatchesService } from '../matches/matches.service';
import { SandboxRunner } from './sandbox-runner';

describe('EvaluationService', () => {
  let service: EvaluationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvaluationService,
        { provide: SandboxRunner, useValue: { run: jest.fn() } },
        {
          provide: PrismaService,
          useValue: {
            submission: {
              findFirst: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
            },
            playerRating: { update: jest.fn() },
          },
        },
        {
          provide: MatchesService,
          useValue: { recordEvaluation: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<EvaluationService>(EvaluationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
