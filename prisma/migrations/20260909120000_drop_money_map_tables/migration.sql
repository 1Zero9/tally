-- The editable "My map" feature was removed. Its tables are no longer
-- referenced by the app or by backups. MapEdge first (it references MapNode).

-- DropTable
DROP TABLE IF EXISTS "MapEdge";

-- DropTable
DROP TABLE IF EXISTS "MapNode";
