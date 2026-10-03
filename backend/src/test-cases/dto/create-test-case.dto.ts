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
  problemId!: string;

  @IsString()
  inputData!: string;

  @IsString()
  @IsNotEmpty()
  expectedOutput!: string;

  @IsBoolean()
  isHidden!: boolean;
}

export class UpdateTestCaseDto {
  @IsOptional()
  @IsString()
  inputData?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  expectedOutput?: string;

  @IsOptional()
  @IsBoolean()
  isHidden?: boolean;
}
