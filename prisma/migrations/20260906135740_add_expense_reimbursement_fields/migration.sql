-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "reimbursementExpected" DOUBLE PRECISION,
ADD COLUMN     "reimbursementReceived" DOUBLE PRECISION,
ADD COLUMN     "reimbursementReceivedDate" TEXT;
