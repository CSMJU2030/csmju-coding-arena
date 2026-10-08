import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { CoreHubIdentity } from '../auth/core-hub-identity';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { Permission } from '../auth/permissions';
import { CollectionResult } from '../common/api-response';
import {
  buildPaginationMeta,
  PaginationQueryDto,
} from '../common/dto/pagination.dto';
import { ApiResult } from '../contracts/api-result.decorator';
import { CodeRunsService } from './code-runs.service';
import { CreateCodeRunDto } from './dto/create-code-run.dto';
import { ALL_LANGUAGES } from './languages';
import { CodeRunDto, LanguageDto } from './languages.dto';

type AuthenticatedRequest = Request & { user: CoreHubIdentity };

@Controller('v1/languages')
export class LanguagesController {
  @Get()
  @RequirePermissions(Permission.LANGUAGE_READ)
  @ApiResult(LanguageDto, true, 200)
  list(@Query() query: PaginationQueryDto) {
    const data = ALL_LANGUAGES.slice(query.skip, query.skip + query.take).map(
      (l) => ({
        id: l.id,
        name: l.name,
        category: l.category,
        file: l.file,
        extension: l.extension,
        runtime: l.runtime,
        compiled: Boolean(l.compile),
        template: l.template,
        stdin: l.stdin,
      }),
    );

    return new CollectionResult(
      data,
      buildPaginationMeta(ALL_LANGUAGES.length, query.page ?? 1, query.take),
    );
  }
}

@Controller('v1/code-runs')
export class CodeRunsController {
  constructor(private readonly codeRuns: CodeRunsService) {}

  @Post()
  @RequirePermissions(Permission.CODE_RUN_CREATE)
  @ApiResult(CodeRunDto, false, 201)
  create(@Body() body: CreateCodeRunDto, @Req() request: AuthenticatedRequest) {
    return this.codeRuns.create(
      request.user.id,
      body.language,
      body.code,
      body.stdin ?? '',
    );
  }
}
