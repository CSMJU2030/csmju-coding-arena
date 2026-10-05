ALTER TABLE "matches"
  ADD COLUMN "ready_player_one_at" TIMESTAMP(3),
  ADD COLUMN "ready_player_two_at" TIMESTAMP(3);

-- Do not restart clocks for matches that were already active before this migration.
UPDATE "matches"
SET
  "ready_player_one_at" = "created_at",
  "ready_player_two_at" = "created_at"
WHERE "status" = 'ACTIVE';
