import { Query } from '@nestjs/common';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { ApiResult } from '../contracts/api-result.decorator';
import { TestCaseDto, DeletedDto } from '../contracts/api.dto';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';

import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { Permission } from '../auth/permissions';
import {
  CreateTestCaseDto,
  UpdateTestCaseDto,
} from './dto/create-test-case.dto';
import { TestCasesService } from './test-cases.service';

@Controller('v1/test-cases')
// 🎯 ต้องล็อกอิน (JwtAuthGuard) และต้องมีสิทธิ์ (RolesGuard) ถึงจะผ่านได้
export class TestCasesController {
  constructor(private readonly testCasesService: TestCasesService) {}

  // 🎯 ให้เฉพาะอาจารย์ (teacher) สร้าง Test Case ได้
  @Post()
  @RequirePermissions(Permission.TEST_CASE_CREATE)
  @ApiResult(TestCaseDto, false, 201)
  async createTestCase(@Body() createTestCaseDto: CreateTestCaseDto) {
    return this.testCasesService.create(createTestCaseDto);
  }

  // 🎯 ให้เฉพาะอาจารย์ (teacher) ดึงข้อมูล Test Case ไปดูได้
  // (นักศึกษาไม่ควรดึง API เส้นนี้ได้ เพื่อป้องกันการขโมยเฉลย)
  @Get('problem/:problemId')
  @RequirePermissions(Permission.TEST_CASE_READ)
  @ApiResult(TestCaseDto, true, 200)
  async getTestCasesByProblem(
    @Param('problemId', new ParseUUIDPipe({ version: '4' })) problemId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.testCasesService.findByProblemId(problemId, query);
  }

  @Patch(':id')
  @RequirePermissions(Permission.TEST_CASE_UPDATE)
  @ApiResult(TestCaseDto, false, 200)
  async updateTestCase(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateTestCaseDto,
  ) {
    return this.testCasesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.TEST_CASE_DELETE)
  @ApiResult(DeletedDto, false, 200)
  async deleteTestCase(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.testCasesService.remove(id);
  }
}
