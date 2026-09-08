-- CreateTable
CREATE TABLE "AssistantKbEntry" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'help',
    "hitCount" INTEGER NOT NULL DEFAULT 0,
    "householdId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssistantKbEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssistantKbEntry_householdId_idx" ON "AssistantKbEntry"("householdId");

-- CreateIndex
CREATE UNIQUE INDEX "AssistantKbEntry_householdId_normalized_key" ON "AssistantKbEntry"("householdId", "normalized");

-- AddForeignKey
ALTER TABLE "AssistantKbEntry" ADD CONSTRAINT "AssistantKbEntry_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistantKbEntry" ADD CONSTRAINT "AssistantKbEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
