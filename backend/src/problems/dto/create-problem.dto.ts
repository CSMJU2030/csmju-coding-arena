import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProblemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20000)
  description!: string;

  @IsInt()
  @Min(1)
  @Max(60000)
  timeLimitMs!: number;

  @IsBoolean()
  isActive!: boolean;
}

export class UpdateProblemDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(20000)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60000)
  timeLimitMs?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
