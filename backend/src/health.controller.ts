import { ApiResult } from './contracts/api-result.decorator';
import { HealthDto } from './contracts/api.dto';
import { Controller, Get } from '@nestjs/common';
import { Public } from './auth/decorators/public.decorator';
import { ConfigService } from '@nestjs/config';

@Controller('health')
export class HealthController {
  constructor(private readonly config: ConfigService) {}
  @Get()
  @Public()
  @ApiResult(HealthDto)
  getHealth() {
    return {
      status: 'ok',
      service: this.config.get<string>('subsystemId') ?? 'csmju-coding-arena',
    };
  }
}
