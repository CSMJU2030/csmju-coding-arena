-- AlterEnum
ALTER TYPE "MatchStatus" ADD VALUE 'WAITING';

-- CreateEnum
CREATE TYPE "CodeLanguage" AS ENUM ('PYTHON', 'JAVASCRIPT', 'TYPESCRIPT');

-- AlterTable
ALTER TABLE "matches" ADD COLUMN "title" VARCHAR(60),
ALTER COLUMN "player_two_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "submissions" ADD COLUMN "language" "CodeLanguage" NOT NULL DEFAULT 'PYTHON';

-- CreateIndex
CREATE INDEX "matches_status_created_at_idx" ON "matches"("status", "created_at");
