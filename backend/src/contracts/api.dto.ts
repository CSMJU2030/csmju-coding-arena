import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProblemDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() description!: string;
  @ApiProperty() timeLimitMs!: number;
}
export class ProblemSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() timeLimitMs!: number;
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
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' })
  evaluatedAt!: string | null;
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
  @ApiProperty({ enum: ['ACTIVE', 'COMPLETED', 'DRAW'] }) status!: string;
  @ApiProperty({ type: String, nullable: true }) winnerId!: string | null;
  @ApiProperty() myPlayerId!: string;
  @ApiProperty({ type: ParticipantDto }) playerOne!: ParticipantDto;
  @ApiProperty({ type: ParticipantDto }) playerTwo!: ParticipantDto;
  @ApiProperty({ type: Number, nullable: true }) currentRound!: number | null;
  @ApiProperty({ type: [MatchRoundDto] }) rounds!: MatchRoundDto[];
}
export class QueueStateDto {
  @ApiProperty({ enum: ['idle', 'waiting', 'matched'] }) state!: string;
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
  ParticipantDto,
  MatchRoundDto,
  MatchDto,
  QueueStateDto,
  LeaderboardEntryDto,
  RatingDto,
  MeDto,
  DeletedDto,
  HealthDto,
];
