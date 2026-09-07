-- AlterTable
ALTER TABLE "Income" ADD COLUMN     "statementImportId" TEXT;

-- CreateIndex
CREATE INDEX "Income_statementImportId_idx" ON "Income"("statementImportId");

-- AddForeignKey
ALTER TABLE "Income" ADD CONSTRAINT "Income_statementImportId_fkey" FOREIGN KEY ("statementImportId") REFERENCES "StatementImport"("id") ON DELETE SET NULL ON UPDATE CASCADE;
