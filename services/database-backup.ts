// server/database-backup.ts

import "server-only";

import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { chmod, mkdir, readdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

type BackupType = "manual" | "pre-restore";

export interface DatabaseBackup {
    fileName: string;
    sizeBytes: number;
    createdAt: Date;
}

function getBackupDirectory(): string {
    const directory = process.env.GMAO_BACKUP_DIR?.trim();

    if (!directory) {
        throw new Error("La variable GMAO_BACKUP_DIR doit être configurée.");
    }

    return path.resolve(directory);
}

const PG_DUMP = process.env.PG_DUMP_PATH?.trim() || "pg_dump";
const PG_RESTORE = process.env.PG_RESTORE_PATH?.trim() || "pg_restore";

/**
 * Format UTC : YYYY-MM-DD-HH-mm-ss
 */
function getFileTimestamp(date = new Date()): string {
    return date
        .toISOString()
        .slice(0, 19)
        .replace("T", "-")
        .replace(/:/g, "-");
}

/**
 * Génère un nom unique pour une sauvegarde.
 *
 * Manuelle :
 * gmao_2026-10-25-13-39-35_a1b2c3d4.dump
 *
 * Avant restauration :
 * gmao_pre-restore_from_gmao_2026-10-25-13-39-35_a1b2c3d4_at_2026-10-25-14-59-34_e5f6a7b8.dump
 */
function getBackupFileName(
    type: BackupType,
    sourceFileName?: string,
): string {
    const timestamp = getFileTimestamp();
    const uniqueId = randomUUID().slice(0, 8);

    if (type === "manual") {
        return `gmao_${timestamp}_${uniqueId}.dump`;
    }

    if (!sourceFileName || !isValidBackupFileName(sourceFileName)) {
        throw new Error(
            "Le nom de la sauvegarde source est invalide.",
        );
    }

    const sourceName = sourceFileName
        .replace(/\.dump$/i, "")
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .slice(0, 100);

    return `gmao_pre-restore_before_restore_${sourceName}_at_${timestamp}_${uniqueId}.dump`;
}

/**
 * Accepte uniquement un nom de fichier .dump, jamais un chemin.
 */
function isValidBackupFileName(fileName: string): boolean {
    return (
        typeof fileName === "string" &&
        /^gmao_[\w.-]+\.dump$/i.test(fileName) &&
        !fileName.includes("..") &&
        !fileName.includes("/") &&
        !fileName.includes("\\")
    );
}

function getBackupPath(fileName: string): string {
    if (!isValidBackupFileName(fileName)) {
        throw new Error("Nom de sauvegarde invalide.");
    }

    return path.join(getBackupDirectory(), fileName);
}

function getDatabaseConfig() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        throw new Error("DATABASE_URL n'est pas configurée.");
    }

    let url: URL;

    try {
        url = new URL(connectionString);
    } catch {
        throw new Error("La chaîne de connexion PostgreSQL est invalide.");
    }

    if (!["postgresql:", "postgres:"].includes(url.protocol)) {
        throw new Error("Le type de base de données est invalide.");
    }

    const database = decodeURIComponent(url.pathname.slice(1));

    if (!database || !url.hostname) {
        throw new Error("La configuration PostgreSQL est invalide.");
    }

    return {
        host: url.hostname,
        port: url.port || "5432",
        database,
        username: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password),
        sslmode: url.searchParams.get("sslmode"),
    };
}

/**
 * Vérifie que le répertoire de sauvegarde est hors du projet.
 */
async function assertBackupDirectory(): Promise<string> {
    const projectDirectory = path.resolve(/*turbopackIgnore: true*/ process.cwd());
    const directory = getBackupDirectory();

    const relative = path.relative(projectDirectory, directory);

    const isInsideProject =
        relative === "" ||
        (
            !path.isAbsolute(relative) &&
            relative !== ".." &&
            !relative.startsWith(`..${path.sep}`)
        );

    if (isInsideProject) {
        throw new Error(
            "Le dossier de sauvegarde doit être hors du projet.",
        );
    }

    await mkdir(directory, {
        recursive: true,
        mode: 0o700,
    });

    // Sous les systèmes POSIX, restreindre les permissions du dossier.
    if (process.platform !== "win32") {
        await chmod(directory, 0o700);
    }

    return directory;
}

/**
 * Exécute pg_dump ou pg_restore sans exposer le mot de passe
 * dans les arguments de la commande.
 */
async function runPostgresTool(
    executable: string,
    args: string[],
): Promise<void> {
    const config = getDatabaseConfig();
    const env = { ...process.env };

    if (config.password) {
        env.PGPASSWORD = config.password;
    }

    if (config.sslmode) {
        env.PGSSLMODE = config.sslmode;
    }

    try {
        await execFileAsync(executable, args, {
            env,
            windowsHide: true,
            maxBuffer: 10 * 1024 * 1024,
        });
    } catch (error) {
        // Les détails ne sont pas renvoyés au navigateur.
        console.error("Échec d'une commande PostgreSQL :", error);

        throw new Error(
            "Une opération PostgreSQL a échoué. Consulte les journaux serveur.",
        );
    }
}

/**
 * Crée une sauvegarde personnalisée PostgreSQL puis vérifie
 * que pg_restore peut lire son catalogue.
 */
export async function createDatabaseBackup(
    type: BackupType = "manual",
    sourceFileName?: string,
): Promise<DatabaseBackup> {
    const directory = await assertBackupDirectory();
    const config = getDatabaseConfig();

    const fileName = getBackupFileName(type, sourceFileName);
    const backupPath = getBackupPath(fileName);
    const temporaryList = path.join(
        directory,
        `.verify_${randomUUID()}.txt`,
    );

    let backupCreated = false;

    try {
        await runPostgresTool(PG_DUMP, [
            "--host",
            config.host,
            "--port",
            config.port,
            "--username",
            config.username,
            "--dbname",
            config.database,
            "--format=custom",
            "--no-password",
            "--file",
            backupPath,
        ]);

        backupCreated = true;

        const fileInfo = await stat(backupPath);

        if (!fileInfo.isFile() || fileInfo.size === 0) {
            throw new Error("La sauvegarde produite est vide.");
        }

        await runPostgresTool(PG_RESTORE, [
            "--list",
            "--file",
            temporaryList,
            backupPath,
        ]);

        const verifiedInfo = await stat(temporaryList);

        if (!verifiedInfo.isFile() || verifiedInfo.size === 0) {
            throw new Error(
                "L'archive ne contient aucun objet vérifiable.",
            );
        }

        return {
            fileName,
            sizeBytes: fileInfo.size,
            createdAt: fileInfo.mtime,
        };
    } catch (error) {
        if (backupCreated) {
            await unlink(backupPath).catch(() => undefined);
        }

        throw error instanceof Error
            ? error
            : new Error("La sauvegarde a échoué.");
    } finally {
        await unlink(temporaryList).catch(() => undefined);
    }
}

/**
 * Retourne les sauvegardes présentes sur le disque.
 */
export async function listDatabaseBackups(): Promise<DatabaseBackup[]> {
    const directory = await assertBackupDirectory();

    const entries = await readdir(directory, {
        withFileTypes: true,
    });

    const backups: DatabaseBackup[] = [];

    for (const entry of entries) {
        if (
            !entry.isFile() ||
            !isValidBackupFileName(entry.name)
        ) {
            continue;
        }

        const filePath = getBackupPath(entry.name);
        const info = await stat(filePath);

        backups.push({
            fileName: entry.name,
            sizeBytes: info.size,
            createdAt: info.mtime,
        });
    }

    return backups.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
}

/**
 * Restaure une sauvegarde après avoir créé une sauvegarde
 * de sécurité de l'état actuel de la base.
 */
export async function restoreDatabaseBackup(
    fileName: string,
): Promise<{
    restoredFile: string;
    safetyBackup: DatabaseBackup;
}> {
    await assertBackupDirectory();

    const backupPath = getBackupPath(fileName);
    const backupInfo = await stat(backupPath);

    if (!backupInfo.isFile() || backupInfo.size === 0) {
        throw new Error("L'archive est absente ou vide.");
    }

    // Vérifier l'archive avant de modifier la base.
    await runPostgresTool(PG_RESTORE, [
        "--list",
        backupPath,
    ]);

    // Sauvegarde obligatoire de l'état courant.
    const safetyBackup = await createDatabaseBackup(
        "pre-restore",
        fileName,
    );

    const config = getDatabaseConfig();

    await runPostgresTool(PG_RESTORE, [
        "--host",
        config.host,
        "--port",
        config.port,
        "--username",
        config.username,
        "--dbname",
        config.database,
        "--clean",
        "--if-exists",
        "--no-owner",
        "--no-privileges",
        "--exit-on-error",
        "--single-transaction",
        backupPath,
    ]);

    return {
        restoredFile: fileName,
        safetyBackup,
    };
}

/**
 * Empêche les suppressions simultanées dans cette instance.
 * La protection de la dernière archive est également vérifiée
 * directement sur le serveur.
 */
let deletingBackup = false;

export async function deleteDatabaseBackup(
    fileName: string,
): Promise<void> {
    const directory = await assertBackupDirectory();
    const backupPath = getBackupPath(fileName);

    if (deletingBackup) {
        throw new Error("Une suppression est déjà en cours.");
    }

    deletingBackup = true;

    try {
        const entries = await readdir(directory, {
            withFileTypes: true,
        });

        const backups = entries.filter(
            (entry) =>
                entry.isFile() &&
                isValidBackupFileName(entry.name),
        );

        if (backups.length <= 1) {
            throw new Error(
                "Impossible de supprimer la dernière sauvegarde disponible.",
            );
        }

        if (!backups.some((backup) => backup.name === fileName)) {
            throw new Error("Sauvegarde introuvable.");
        }

        const info = await stat(backupPath);

        if (!info.isFile() || info.size === 0) {
            throw new Error("La sauvegarde est invalide ou vide.");
        }

        await unlink(backupPath);
    } finally {
        deletingBackup = false;
    }
}


export async function importDatabaseBackup(file: File) {
    const directory = await assertBackupDirectory();

    if (!file.name.toLowerCase().endsWith(".dump")) {
        throw new Error("Seuls les fichiers .dump sont autorisés.");
    }

    // Limite simple : 100 Mo
    if (file.size === 0 || file.size > 100 * 1024 * 1024) {
        throw new Error("Le fichier doit avoir une taille comprise entre 1 octet et 100 Mo.");
    }

    const fileName = `gmao_imported_${Date.now()}_${randomUUID().slice(0, 8)}.dump`;
    const filePath = path.join(directory, fileName);

    await writeFile(filePath, Buffer.from(await file.arrayBuffer()), {
        flag: "wx",
        mode: 0o600,
    });

    try {
        // Vérifie que PostgreSQL reconnaît l'archive.
        const tempFile = path.join(directory, `.verify_${randomUUID()}.txt`);

        try {
            await runPostgresTool(PG_RESTORE, [
                "--list",
                "--file",
                tempFile,
                filePath,
            ]);
        } finally {
            await unlink(tempFile).catch(() => { });
        }

        const fileInfo = await stat(filePath);

        return {
            fileName,
            sizeBytes: fileInfo.size,
            createdAt: fileInfo.mtime,
        };
    } catch (error) {
        await unlink(filePath).catch(() => { });
        throw error;
    }
}