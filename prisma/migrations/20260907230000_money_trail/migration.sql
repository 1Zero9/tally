-- AlterTable
ALTER TABLE "Transfer" ADD COLUMN     "trailId" TEXT;

-- CreateTable
CREATE TABLE "MoneyTrail" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "householdId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MoneyTrail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MoneyTrail_householdId_idx" ON "MoneyTrail"("householdId");

-- CreateIndex
CREATE INDEX "Transfer_trailId_idx" ON "Transfer"("trailId");

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_trailId_fkey" FOREIGN KEY ("trailId") REFERENCES "MoneyTrail"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoneyTrail" ADD CONSTRAINT "MoneyTrail_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoneyTrail" ADD CONSTRAINT "MoneyTrail_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
