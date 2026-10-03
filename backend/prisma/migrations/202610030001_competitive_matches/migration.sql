-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'DRAW');

-- CreateEnum
CREATE TYPE "MatchRoundStatus" AS ENUM ('PENDING', 'ACTIVE', 'WON', 'DRAW');

-- AlterTable
ALTER TABLE "users" DROP COLUMN "role",
ADD COLUMN     "core_user_id" TEXT;

UPDATE "users" SET "core_user_id" = 'legacy-' || "id";

ALTER TABLE "users"
ALTER COLUMN "core_user_id" SET NOT NULL,
ADD COLUMN     "has_competitive_rating" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "users" RENAME COLUMN "username" TO "display_name";
ALTER INDEX "users_username_key" RENAME TO "users_display_name_key";

-- AlterTable
ALTER TABLE "submissions" ADD COLUMN     "evaluated_at" TIMESTAMP(3),
ADD COLUMN     "match_round_id" TEXT;

-- DropEnum
DROP TYPE "Role";

-- CreateTable
CREATE TABLE "match_queue" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" TEXT NOT NULL,
    "player_one_id" TEXT NOT NULL,
    "player_two_id" TEXT NOT NULL,
    "winner_id" TEXT,
    "status" "MatchStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_rounds" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "problem_id" TEXT NOT NULL,
    "round_number" INTEGER NOT NULL,
    "status" "MatchRoundStatus" NOT NULL DEFAULT 'PENDING',
    "winner_id" TEXT,
    "ends_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "match_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "match_queue_player_id_key" ON "match_queue"("player_id");

-- CreateIndex
CREATE INDEX "match_queue_created_at_idx" ON "match_queue"("created_at");

-- CreateIndex
CREATE INDEX "matches_player_one_id_status_idx" ON "matches"("player_one_id", "status");

-- CreateIndex
CREATE INDEX "matches_player_two_id_status_idx" ON "matches"("player_two_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "match_rounds_match_id_round_number_key" ON "match_rounds"("match_id", "round_number");

-- CreateIndex
CREATE UNIQUE INDEX "users_core_user_id_key" ON "users"("core_user_id");

-- CreateIndex
CREATE INDEX "submissions_match_round_id_status_evaluated_at_idx" ON "submissions"("match_round_id", "status", "evaluated_at");

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_match_round_id_fkey" FOREIGN KEY ("match_round_id") REFERENCES "match_rounds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_queue" ADD CONSTRAINT "match_queue_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_player_one_id_fkey" FOREIGN KEY ("player_one_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_player_two_id_fkey" FOREIGN KEY ("player_two_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_rounds" ADD CONSTRAINT "match_rounds_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_rounds" ADD CONSTRAINT "match_rounds_problem_id_fkey" FOREIGN KEY ("problem_id") REFERENCES "problems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_rounds" ADD CONSTRAINT "match_rounds_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
