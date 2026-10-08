import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { PaginationQueryDto } from '../common/dto/pagination.dto';

export const CSS_GAMES = ['FLEXBOX', 'GRID'] as const;
export type CssGameName = (typeof CSS_GAMES)[number];

/** จำนวนด่านของแต่ละเกม — ต้องตรงกับ frontend/src/lib/css-games/*-levels.ts */
export const LEVEL_COUNTS: Record<CssGameName, number> = {
  FLEXBOX: 24,
  GRID: 20,
};

export class CreateLevelClearDto {
  @IsIn(CSS_GAMES)
  @ApiProperty({ enum: CSS_GAMES })
  game!: CssGameName;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @ApiProperty({ type: Number, minimum: 1 })
  level!: number;
}

export class LevelClearQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(CSS_GAMES)
  @ApiPropertyOptional({ enum: CSS_GAMES })
  game?: CssGameName;
}

export class LevelClearDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: CSS_GAMES }) game!: string;
  @ApiProperty() level!: number;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}
