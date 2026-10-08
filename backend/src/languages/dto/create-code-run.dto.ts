import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCodeRunDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  @ApiProperty({ type: String, example: 'python' })
  language!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(65536)
  @ApiProperty({ type: String })
  code!: string;

  @IsOptional()
  @IsString()
  @MaxLength(65536)
  @ApiPropertyOptional({ type: String })
  stdin?: string;
}
