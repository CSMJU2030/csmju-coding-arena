import { Query } from '@nestjs/common';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { TestInputsDto } from '../matches/browser-judge';
import { ApiResult } from '../contracts/api-result.decorator';
import {
  ProblemDto,
  ProblemManagementDto,
  DeletedDto,
  ProblemSummaryDto,
} from '../contracts/api.dto';
import {
  Controller,
  Post,
  Get,
  Body,
  Delete,
  Patch,
  Param,
  ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import type { CoreHubIdentity } from '../auth/core-hub-identity';

import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { Permission } from '../auth/permissions';
import { CreateProblemDto, UpdateProblemDto } from './dto/create-problem.dto';
import { ProblemsService } from './problems.service';

type AuthenticatedRequest = Request & { user: CoreHubIdentity };

@Controller('v1/problems')
// 🛡️ เปิดใช้งาน Guard ทั้งตรวจสอบ Token และตรวจสอบ Role
export class ProblemsController {
  constructor(private readonly problemsService: ProblemsService) {}

  @Post()
  @RequirePermissions(Permission.PROBLEM_CREATE)
  @ApiResult(ProblemDto, false, 201)
  async createProblem(
    @Body() createProblemDto: CreateProblemDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.problemsService.create(request.user.id, createProblemDto);
  }

  @Get('manage')
  @RequirePermissions(Permission.PROBLEM_MANAGE)
  @ApiResult(ProblemManagementDto, true, 200)
  async getProblemsForManagement(@Query() query: PaginationQueryDto) {
    return this.problemsService.findAll(query);
  }

  @Patch(':id')
  @RequirePermissions(Permission.PROBLEM_UPDATE)
  @ApiResult(ProblemDto, false, 200)
  async updateProblem(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateProblemDto: UpdateProblemDto,
  ) {
    return this.problemsService.update(id, updateProblemDto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.PROBLEM_DELETE)
  @ApiResult(DeletedDto, false, 200)
  async deleteProblem(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.problemsService.deactivate(id);
  }

  @Get()
  @RequirePermissions(Permission.PROBLEM_READ)
  @ApiResult(ProblemSummaryDto, true, 200)
  async getProblems(@Query() query: PaginationQueryDto) {
    return this.problemsService.findAllActive(query);
  }

  // 🎯 อนุญาตให้ทั้งนักศึกษาและอาจารย์เรียกดูโจทย์แต่ละข้อได้
  @Get(':id')
  @RequirePermissions(Permission.PROBLEM_READ)
  @ApiResult(ProblemDto, false, 200)
  async getProblemById(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.problemsService.findOne(id);
  }

  /** input ของชุดทดสอบ ให้เบราว์เซอร์รันโค้ดฝึกซ้อม (expected output ไม่ส่งออกไป) */
  @Get(':id/test-inputs')
  @RequirePermissions(Permission.SUBMISSION_CREATE)
  @ApiResult(TestInputsDto, false, 200)
  async getTestInputs(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.problemsService.testInputs(id);
  }
}
