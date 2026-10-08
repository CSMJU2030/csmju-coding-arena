-- CreateEnum
CREATE TYPE "CssGame" AS ENUM ('FLEXBOX', 'GRID');

-- CreateTable
CREATE TABLE "level_clears" (
    "id" TEXT NOT NULL,
    "core_user_id" VARCHAR(64) NOT NULL,
    "game" "CssGame" NOT NULL,
    "level" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "level_clears_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "level_clears_core_user_id_game_level_key" ON "level_clears"("core_user_id", "game", "level");

-- CreateIndex
CREATE INDEX "level_clears_game_created_at_idx" ON "level_clears"("game", "created_at");
