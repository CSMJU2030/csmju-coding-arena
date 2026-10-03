import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateMatchSubmissionDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID('4')
  @ApiProperty({ type: String })
  problemId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  @ApiProperty({ type: String })
  sourceCode!: string;
}
