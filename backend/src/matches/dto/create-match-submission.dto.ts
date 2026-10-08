import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export { BrowserJudgedSubmissionDto as CreateMatchSubmissionDto } from '../browser-judge';

export class CreateMatchRoomDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  @ApiPropertyOptional({ type: String, maxLength: 60 })
  title?: string;

  /** โจทย์ 3 ข้อตามลำดับ — ไม่ส่ง = ให้ระบบสุ่ม */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(3)
  @IsUUID('4', { each: true })
  @ApiPropertyOptional({ type: [String], minItems: 3, maxItems: 3 })
  problemIds?: string[];
}

export class MatchRoomQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['WAITING', 'ACTIVE'])
  @ApiPropertyOptional({ enum: ['WAITING', 'ACTIVE'] })
  status?: 'WAITING' | 'ACTIVE';
}
