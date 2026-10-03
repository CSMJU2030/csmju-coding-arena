import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // 🛡️ นำเข้า JwtAuthGuard
import { RolesGuard, Roles } from '../auth/roles.guard';
import {
  CreateTestCaseDto,
  UpdateTestCaseDto,
} from './dto/create-test-case.dto';
import { TestCasesService } from './test-cases.service';

@Controller('v1/test-cases')
// 🎯 ต้องล็อกอิน (JwtAuthGuard) และต้องมีสิทธิ์ (RolesGuard) ถึงจะผ่านได้
@UseGuards(JwtAuthGuard, RolesGuard)
export class TestCasesController {
  constructor(private readonly testCasesService: TestCasesService) {}

  // 🎯 ให้เฉพาะอาจารย์ (teacher) สร้าง Test Case ได้
  @Post()
  @Roles('TEACHER')
  async createTestCase(@Body() createTestCaseDto: CreateTestCaseDto) {
    return this.testCasesService.create(createTestCaseDto);
  }

  // 🎯 ให้เฉพาะอาจารย์ (teacher) ดึงข้อมูล Test Case ไปดูได้
  // (นักศึกษาไม่ควรดึง API เส้นนี้ได้ เพื่อป้องกันการขโมยเฉลย)
  @Get('problem/:problemId')
  @Roles('TEACHER')
  async getTestCasesByProblem(
    @Param('problemId', new ParseUUIDPipe({ version: '4' })) problemId: string,
  ) {
    return this.testCasesService.findByProblemId(problemId);
  }

  @Patch(':id')
  @Roles('TEACHER')
  async updateTestCase(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateTestCaseDto,
  ) {
    return this.testCasesService.update(id, dto);
  }

  @Delete(':id')
  @Roles('TEACHER')
  async deleteTestCase(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.testCasesService.remove(id);
  }
}
