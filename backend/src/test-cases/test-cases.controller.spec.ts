import { Test, TestingModule } from '@nestjs/testing';
import { TestCasesController } from './test-cases.controller';
import { TestCasesService } from './test-cases.service';

import { PermissionsGuard as RolesGuard } from '../auth/guards/permissions.guard';
import { CoreHubJwtGuard as JwtAuthGuard } from '../auth/guards/core-hub-jwt.guard';

describe('TestCasesController', () => {
  let controller: TestCasesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TestCasesController],
      providers: [
        {
          provide: TestCasesService,
          useValue: {
            create: jest.fn(),
            findByProblemId: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<TestCasesController>(TestCasesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
