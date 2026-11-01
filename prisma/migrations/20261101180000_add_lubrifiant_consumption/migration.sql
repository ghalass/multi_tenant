CREATE TABLE "type_lubrifiant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    CONSTRAINT "type_lubrifiant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lubrifiant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "unite" TEXT NOT NULL,
    "typeLubrifiantId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    CONSTRAINT "lubrifiant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lubrifiant_parc" (
    "parcId" TEXT NOT NULL,
    "lubrifiantId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    CONSTRAINT "lubrifiant_parc_pkey" PRIMARY KEY ("parcId", "lubrifiantId")
);

CREATE TABLE "saisie_lubrifiant" (
    "id" TEXT NOT NULL,
    "du" DATE NOT NULL,
    "au" DATE NOT NULL,
    "section" TEXT NOT NULL,
    "imputation" TEXT NOT NULL,
    "qte" DOUBLE PRECISION NOT NULL,
    "enginId" TEXT NOT NULL,
    "lubrifiantId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    CONSTRAINT "saisie_lubrifiant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "type_lubrifiant_name_tenantId_key"
    ON "type_lubrifiant"("name", "tenantId");
CREATE UNIQUE INDEX "lubrifiant_name_tenantId_key"
    ON "lubrifiant"("name", "tenantId");
CREATE INDEX "lubrifiant_parc_tenantId_idx"
    ON "lubrifiant_parc"("tenantId");
CREATE UNIQUE INDEX "saisie_lubrifiant_dedupe_key"
    ON "saisie_lubrifiant"("du", "au", "enginId", "lubrifiantId", "section", "imputation", "tenantId");
CREATE INDEX "saisie_lubrifiant_tenant_dates_idx"
    ON "saisie_lubrifiant"("tenantId", "du", "au");
CREATE INDEX "saisie_lubrifiant_engine_dates_idx"
    ON "saisie_lubrifiant"("tenantId", "enginId", "lubrifiantId", "du", "au");

ALTER TABLE "type_lubrifiant"
    ADD CONSTRAINT "type_lubrifiant_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenant"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lubrifiant"
    ADD CONSTRAINT "lubrifiant_typeLubrifiantId_fkey"
    FOREIGN KEY ("typeLubrifiantId") REFERENCES "type_lubrifiant"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lubrifiant"
    ADD CONSTRAINT "lubrifiant_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenant"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lubrifiant_parc"
    ADD CONSTRAINT "lubrifiant_parc_parcId_fkey"
    FOREIGN KEY ("parcId") REFERENCES "parc"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lubrifiant_parc"
    ADD CONSTRAINT "lubrifiant_parc_lubrifiantId_fkey"
    FOREIGN KEY ("lubrifiantId") REFERENCES "lubrifiant"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lubrifiant_parc"
    ADD CONSTRAINT "lubrifiant_parc_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenant"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "saisie_lubrifiant"
    ADD CONSTRAINT "saisie_lubrifiant_enginId_fkey"
    FOREIGN KEY ("enginId") REFERENCES "engin"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "saisie_lubrifiant"
    ADD CONSTRAINT "saisie_lubrifiant_lubrifiantId_fkey"
    FOREIGN KEY ("lubrifiantId") REFERENCES "lubrifiant"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "saisie_lubrifiant"
    ADD CONSTRAINT "saisie_lubrifiant_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenant"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "permission" ("id", "name", "resource", "action", "description")
VALUES
    ('permission_lubrifiant_type_create', 'type_lubrifiants:create', 'type_lubrifiant', 'create', 'Créer des types de lubrifiants'),
    ('permission_lubrifiant_type_read', 'type_lubrifiants:read', 'type_lubrifiant', 'read', 'Consulter les types de lubrifiants'),
    ('permission_lubrifiant_type_update', 'type_lubrifiants:update', 'type_lubrifiant', 'update', 'Modifier les types de lubrifiants'),
    ('permission_lubrifiant_type_delete', 'type_lubrifiants:delete', 'type_lubrifiant', 'delete', 'Supprimer les types de lubrifiants'),
    ('permission_lubrifiant_type_export', 'type_lubrifiants:export', 'type_lubrifiant', 'export', 'Exporter les types de lubrifiants'),
    ('permission_lubrifiant_type_import', 'type_lubrifiants:import', 'type_lubrifiant', 'import', 'Importer les types de lubrifiants en lot'),
    ('permission_lubrifiant_create', 'lubrifiants:create', 'lubrifiant', 'create', 'Créer des lubrifiants'),
    ('permission_lubrifiant_read', 'lubrifiants:read', 'lubrifiant', 'read', 'Consulter les lubrifiants'),
    ('permission_lubrifiant_update', 'lubrifiants:update', 'lubrifiant', 'update', 'Modifier les lubrifiants'),
    ('permission_lubrifiant_delete', 'lubrifiants:delete', 'lubrifiant', 'delete', 'Supprimer les lubrifiants'),
    ('permission_lubrifiant_export', 'lubrifiants:export', 'lubrifiant', 'export', 'Exporter les lubrifiants'),
    ('permission_lubrifiant_import', 'lubrifiants:import', 'lubrifiant', 'import', 'Importer les lubrifiants en lot'),
    ('permission_saisie_lubrifiant_create', 'saisie_lubrifiants:create', 'saisie_lubrifiant', 'create', 'Créer des saisies lubrifiants'),
    ('permission_saisie_lubrifiant_read', 'saisie_lubrifiants:read', 'saisie_lubrifiant', 'read', 'Consulter les saisies lubrifiants'),
    ('permission_saisie_lubrifiant_update', 'saisie_lubrifiants:update', 'saisie_lubrifiant', 'update', 'Modifier les saisies lubrifiants'),
    ('permission_saisie_lubrifiant_delete', 'saisie_lubrifiants:delete', 'saisie_lubrifiant', 'delete', 'Supprimer les saisies lubrifiants'),
    ('permission_saisie_lubrifiant_export', 'saisie_lubrifiants:export', 'saisie_lubrifiant', 'export', 'Exporter les saisies lubrifiants'),
    ('permission_saisie_lubrifiant_import', 'saisie_lubrifiants:import', 'saisie_lubrifiant', 'import', 'Importer les saisies lubrifiants en lot')
ON CONFLICT DO NOTHING;
