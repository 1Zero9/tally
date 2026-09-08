-- One-off expenses are incidental spend, never recurring bills. Older
-- "Add as expense" from a statement import created them with the default
-- isBill = true, so they wrongly appeared in the Bills renewal schedule
-- and counted as bills (not one-off spend) on the Overview. Bring the
-- stored flag in line with how every view already treats a `once` cycle.
UPDATE "Expense" SET "isBill" = false WHERE "billingCycle" = 'once' AND "isBill" = true;
