import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import {
  PROBLEM_CATEGORIES,
  PROBLEM_DIFFICULTIES,
} from '../../contracts/api.dto';

type Category = (typeof PROBLEM_CATEGORIES)[number];
type Difficulty = (typeof PROBLEM_DIFFICULTIES)[number];

export class CreateProblemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  @ApiProperty({ type: String })
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20000)
  @ApiProperty({ type: String })
  description!: string;

  @IsInt()
  @Min(1)
  @Max(60000)
  @ApiProperty({ type: Number })
  timeLimitMs!: number;

  @IsBoolean()
  @ApiProperty({ type: Boolean })
  isActive!: boolean;

  @IsOptional()
  @IsIn(PROBLEM_CATEGORIES)
  @ApiPropertyOptional({ enum: PROBLEM_CATEGORIES })
  category?: Category;

  @IsOptional()
  @IsIn(PROBLEM_DIFFICULTIES)
  @ApiPropertyOptional({ enum: PROBLEM_DIFFICULTIES })
  difficulty?: Difficulty;
}

export class UpdateProblemDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  @ApiPropertyOptional({ type: String })
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(20000)
  @ApiPropertyOptional({ type: String })
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60000)
  @ApiPropertyOptional({ type: Number })
  timeLimitMs?: number;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ type: Boolean })
  isActive?: boolean;

  @IsOptional()
  @IsIn(PROBLEM_CATEGORIES)
  @ApiPropertyOptional({ enum: PROBLEM_CATEGORIES })
  category?: Category;

  @IsOptional()
  @IsIn(PROBLEM_DIFFICULTIES)
  @ApiPropertyOptional({ enum: PROBLEM_DIFFICULTIES })
  difficulty?: Difficulty;
}

/** คลังโจทย์: กรองตามหมวด/ระดับ */
export class ProblemListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(PROBLEM_CATEGORIES)
  @ApiPropertyOptional({ enum: PROBLEM_CATEGORIES })
  category?: Category;

  @IsOptional()
  @IsIn(PROBLEM_DIFFICULTIES)
  @ApiPropertyOptional({ enum: PROBLEM_DIFFICULTIES })
  difficulty?: Difficulty;
}
