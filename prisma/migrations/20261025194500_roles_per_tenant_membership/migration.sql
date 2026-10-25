-- Les anciens rôles étaient globaux au compte.
-- On les copie vers chaque appartenance existante afin de préserver les accès actuels.
CREATE TABLE "user_tenant_role" (
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    CONSTRAINT "user_tenant_role_pkey" PRIMARY KEY ("userId", "tenantId", "roleId")
);

INSERT INTO "user_tenant_role" ("userId", "tenantId", "roleId")
SELECT rtu."B", ut."tenantId", rtu."A"
FROM "_RoleToUser" rtu
JOIN "user_tenant" ut ON ut."userId" = rtu."B"
ON CONFLICT ("userId", "tenantId", "roleId") DO NOTHING;

CREATE INDEX "user_tenant_role_roleId_idx" ON "user_tenant_role"("roleId");

ALTER TABLE "user_tenant_role"
ADD CONSTRAINT "user_tenant_role_membership_fkey"
FOREIGN KEY ("userId", "tenantId")
REFERENCES "user_tenant" ("userId", "tenantId")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_tenant_role"
ADD CONSTRAINT "user_tenant_role_roleId_fkey"
FOREIGN KEY ("roleId") REFERENCES "role"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

DROP TABLE "_RoleToUser";
