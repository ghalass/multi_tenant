-- 1. Nouvelle table d'affectation des rôles par appartenance
CREATE TABLE "user_tenant_role" (
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    CONSTRAINT "user_tenant_role_pkey" PRIMARY KEY (
        "userId",
        "tenantId",
        "roleId"
    )
);

-- 2. Reprendre les anciens rôles globaux
--    et les attribuer à chaque appartenance existante
INSERT INTO
    "user_tenant_role" (
        "userId",
        "tenantId",
        "roleId"
    )
SELECT old_role."B", membership."tenantId", old_role."A"
FROM
    "_RoleToUser" AS old_role
    INNER JOIN "user_tenant" AS membership ON membership."userId" = old_role."B"
ON CONFLICT (
    "userId",
    "tenantId",
    "roleId"
) DO NOTHING;

-- 3. Index
CREATE INDEX "user_tenant_role_tenantId_idx" ON "user_tenant_role" ("tenantId");

CREATE INDEX "user_tenant_role_roleId_idx" ON "user_tenant_role" ("roleId");

-- 4. Contraintes
ALTER TABLE "user_tenant_role"
ADD CONSTRAINT "user_tenant_role_userId_tenantId_fkey" FOREIGN KEY ("userId", "tenantId") REFERENCES "user_tenant" ("userId", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_tenant_role"
ADD CONSTRAINT "user_tenant_role_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "role" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 5. Supprimer l'ancienne relation globale après la copie
DROP TABLE "_RoleToUser";