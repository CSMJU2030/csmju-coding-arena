import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TestInputsDto } from '../matches/browser-judge';

export const PROBLEM_CATEGORIES = [
  'BASICS',
  'CONDITIONS',
  'LOOPS',
  'STRINGS',
  'LISTS',
  'MATH',
  'ALGORITHMS',
] as const;
export const PROBLEM_DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'] as const;
export class ProblemSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() timeLimitMs!: number;
  @ApiProperty({ enum: PROBLEM_CATEGORIES }) category!: string;
  @ApiProperty({ enum: PROBLEM_DIFFICULTIES }) difficulty!: string;
  /** true = โจทย์ในคลังที่มากับระบบ */
  @ApiProperty() isBuiltIn!: boolean;
}
export class ProblemDto extends ProblemSummaryDto {
  @ApiProperty() description!: string;
}
export class TestCountDto {
  @ApiProperty() testCases!: number;
}
export class ProblemManagementDto extends ProblemDto {
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ type: TestCountDto }) _count!: TestCountDto;
}
export class TestCaseDto {
  @ApiProperty() id!: string;
  @ApiProperty() problemId!: string;
  @ApiProperty() inputData!: string;
  @ApiProperty() expectedOutput!: string;
  @ApiProperty() isHidden!: boolean;
}
export class SubmissionDto {
  @ApiProperty() id!: string;
  @ApiProperty({
    enum: [
      'PENDING',
      'EVALUATING',
      'ACCEPTED',
      'WRONG_ANSWER',
      'TIME_LIMIT_EXCEEDED',
      'RUNTIME_ERROR',
      'COMPILATION_ERROR',
    ],
  })
  status!: string;
  @ApiPropertyOptional({ enum: ['PYTHON', 'JAVASCRIPT', 'TYPESCRIPT'] })
  language?: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' })
  evaluatedAt!: string | null;
}
export class JudgedSubmissionDto extends SubmissionDto {
  /** ชุดทดสอบแรกที่ไม่ผ่าน (นับจาก 1) · null เมื่อผ่านทุกชุด */
  @ApiProperty({ type: Number, nullable: true }) failedTest!: number | null;
}
export class ParticipantDto {
  @ApiProperty() id!: string;
  @ApiProperty() displayName!: string;
  @ApiProperty() eloRating!: number;
}
export class MatchRoundDto {
  @ApiProperty() id!: string;
  @ApiProperty() roundNumber!: number;
  @ApiProperty({ enum: ['PENDING', 'ACTIVE', 'WON', 'DRAW'] }) status!: string;
  @ApiProperty({ type: String, nullable: true }) winnerId!: string | null;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' }) endsAt!:
    string | null;
  @ApiProperty({ type: ProblemDto }) problem!: ProblemDto;
  @ApiProperty({ type: [SubmissionDto] }) submissions!: SubmissionDto[];
}
export class MatchDto {
  @ApiProperty({ enum: ['matched'] }) state!: string;
  @ApiProperty() id!: string;
  @ApiProperty({ type: String, nullable: true }) title!: string | null;
  @ApiProperty({ enum: ['WAITING', 'ACTIVE', 'COMPLETED', 'DRAW'] })
  status!: string;
  @ApiProperty({ type: String, nullable: true }) winnerId!: string | null;
  @ApiProperty() myPlayerId!: string;
  @ApiProperty({ type: ParticipantDto }) playerOne!: ParticipantDto;
  @ApiProperty({ type: ParticipantDto, nullable: true })
  playerTwo!: ParticipantDto | null;
  @ApiProperty({ type: Number, nullable: true }) currentRound!: number | null;
  @ApiProperty({ type: [MatchRoundDto] }) rounds!: MatchRoundDto[];
}
export class MatchRoomDto {
  @ApiProperty() id!: string;
  @ApiProperty({ type: String, nullable: true }) title!: string | null;
  @ApiProperty({ enum: ['WAITING', 'ACTIVE'] }) status!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ type: ParticipantDto }) playerOne!: ParticipantDto;
  @ApiProperty({ type: ParticipantDto, nullable: true })
  playerTwo!: ParticipantDto | null;
  @ApiProperty() isMine!: boolean;
  @ApiProperty({ type: Number, nullable: true }) currentRound!: number | null;
  @ApiProperty() playerOneWins!: number;
  @ApiProperty() playerTwoWins!: number;
}
export class QueueStateDto {
  @ApiProperty({ enum: ['idle', 'waiting', 'hosting', 'matched'] })
  state!: string;
  @ApiPropertyOptional() id?: string;
  @ApiPropertyOptional() position?: number;
}
export class LeaderboardEntryDto {
  @ApiProperty() rank!: number;
  @ApiProperty() displayName!: string;
  @ApiProperty() eloRating!: number;
}
export class RatingDto {
  @ApiProperty() displayName!: string;
  @ApiProperty() eloRating!: number;
}
export class SessionDto {
  @ApiProperty({ type: String, nullable: true, format: 'date-time' })
  expiresAt!: string | null;
}
export class MeDto {
  @ApiProperty() id!: string;
  @ApiProperty() email!: string;
  @ApiProperty({ enum: ['student', 'lecturer'] }) coreRole!: string;
  @ApiProperty({ enum: ['STUDENT', 'STAFF'] }) subsystemRole!: string;
  @ApiProperty({ type: SessionDto }) session!: SessionDto;
}
export class DeletedDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: [true] }) deleted!: boolean;
}
export class HealthDto {
  @ApiProperty() status!: string;
  @ApiProperty() service!: string;
}
export const API_MODELS = [
  ProblemDto,
  ProblemSummaryDto,
  ProblemManagementDto,
  TestCaseDto,
  SubmissionDto,
  JudgedSubmissionDto,
  ParticipantDto,
  MatchRoomDto,
  TestInputsDto,
  MatchRoundDto,
  MatchDto,
  QueueStateDto,
  LeaderboardEntryDto,
  RatingDto,
  MeDto,
  DeletedDto,
  HealthDto,
];
