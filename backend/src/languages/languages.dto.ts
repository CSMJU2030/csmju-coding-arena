import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LanguageDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({
    enum: [
      'popular',
      'systems',
      'jvm',
      'dotnet',
      'scripting',
      'shell',
      'functional',
      'lisp',
      'logic',
      'classic',
      'esoteric',
      'web',
      'data',
    ],
  })
  category!: string;
  @ApiProperty() file!: string;
  @ApiProperty() extension!: string;
  @ApiProperty({ enum: ['sandbox', 'browser'] }) runtime!: string;
  @ApiProperty() compiled!: boolean;
  @ApiProperty() template!: string;
  @ApiProperty() stdin!: string;
}

export class CodeRunDto {
  @ApiProperty() language!: string;
  @ApiProperty({
    enum: [
      'OK',
      'COMPILE_ERROR',
      'RUNTIME_ERROR',
      'TIME_LIMIT_EXCEEDED',
      'OUTPUT_LIMIT_EXCEEDED',
      'MEMORY_LIMIT_EXCEEDED',
    ],
  })
  status!: string;
  @ApiProperty({ type: Number, nullable: true }) exitCode!: number | null;
  @ApiProperty() stdout!: string;
  @ApiProperty() stderr!: string;
  @ApiProperty() compileOutput!: string;
  @ApiProperty() timeMs!: number;
  @ApiPropertyOptional() truncated?: boolean;
}
