import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
}
