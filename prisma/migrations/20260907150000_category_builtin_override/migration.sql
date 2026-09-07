-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "builtinKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Category_householdId_builtinKey_key" ON "Category"("householdId", "builtinKey");
