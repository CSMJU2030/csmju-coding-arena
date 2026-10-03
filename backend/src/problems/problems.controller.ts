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
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import type { CoreUser } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { CreateProblemDto, UpdateProblemDto } from './dto/create-problem.dto';
import { ProblemsService } from './problems.service';

type AuthenticatedRequest = Request & { user: CoreUser };

@Controller('v1/problems')
// 🛡️ เปิดใช้งาน Guard ทั้งตรวจสอบ Token และตรวจสอบ Role
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProblemsController {
  constructor(private readonly problemsService: ProblemsService) {}

  @Post()
  @Roles('TEACHER')
  async createProblem(
    @Body() createProblemDto: CreateProblemDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.problemsService.create(
      request.user.coreUserId,
      createProblemDto,
    );
  }

  @Get('manage')
  @Roles('TEACHER')
  async getProblemsForManagement() {
    return this.problemsService.findAll();
  }

  @Patch(':id')
  @Roles('TEACHER')
  async updateProblem(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateProblemDto: UpdateProblemDto,
  ) {
    return this.problemsService.update(id, updateProblemDto);
  }

  @Delete(':id')
  @Roles('TEACHER')
  async deleteProblem(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.problemsService.deactivate(id);
  }

  @Get()
  @Roles('STUDENT', 'TEACHER')
  async getProblems() {
    return this.problemsService.findAllActive();
  }

  // 🎯 อนุญาตให้ทั้งนักศึกษาและอาจารย์เรียกดูโจทย์แต่ละข้อได้
  @Get(':id')
  @Roles('STUDENT', 'TEACHER')
  async getProblemById(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.problemsService.findOne(id);
  }
}
