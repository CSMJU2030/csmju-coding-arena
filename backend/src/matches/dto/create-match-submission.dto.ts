import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateMatchSubmissionDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID('4')
  problemId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  sourceCode!: string;
}
