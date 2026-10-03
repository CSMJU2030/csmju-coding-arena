import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateTestCaseDto {
  @IsUUID()
  @IsNotEmpty()
  @ApiProperty({ type: String })
  problemId!: string;

  @IsString()
  @ApiProperty({ type: String })
  inputData!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ type: String })
  expectedOutput!: string;

  @IsBoolean()
  @ApiProperty({ type: Boolean })
  isHidden!: boolean;
}

export class UpdateTestCaseDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ type: String })
  inputData?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ApiPropertyOptional({ type: String })
  expectedOutput?: string;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ type: Boolean })
  isHidden?: boolean;
}
