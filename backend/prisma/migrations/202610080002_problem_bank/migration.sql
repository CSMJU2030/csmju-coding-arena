-- CreateEnum
CREATE TYPE "ProblemCategory" AS ENUM ('BASICS', 'CONDITIONS', 'LOOPS', 'STRINGS', 'LISTS', 'MATH', 'ALGORITHMS');

-- CreateEnum
CREATE TYPE "ProblemDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- AlterTable
ALTER TABLE "problems" ADD COLUMN "category" "ProblemCategory" NOT NULL DEFAULT 'BASICS',
ADD COLUMN "difficulty" "ProblemDifficulty" NOT NULL DEFAULT 'EASY',
ADD COLUMN "is_built_in" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "author_id" DROP NOT NULL;
