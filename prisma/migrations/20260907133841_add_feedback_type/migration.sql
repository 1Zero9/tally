-- CreateEnum
CREATE TYPE "FeedbackType" AS ENUM ('IDEA', 'FEATURE', 'BUG');

-- AlterTable
ALTER TABLE "BugReport" ADD COLUMN     "type" "FeedbackType" NOT NULL DEFAULT 'BUG';
