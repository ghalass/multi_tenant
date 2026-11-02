DELETE FROM "permission" WHERE "action" = 'export';

CREATE TYPE "Action_new" AS ENUM ('create', 'read', 'update', 'delete', 'import');

ALTER TABLE "permission"
ALTER COLUMN "action" TYPE "Action_new"
USING ("action"::text::"Action_new");

DROP TYPE "Action";
ALTER TYPE "Action_new" RENAME TO "Action";
