// server/database-backup-actions.ts


"use server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
    createDatabaseBackup,
    deleteDatabaseBackup,
    importDatabaseBackup,
    listDatabaseBackups,
    restoreDatabaseBackup,
} from "@/services/database-backup";

async function authorizeDatabaseAdmin(): Promise<boolean> {
    const session = await getSession();

    if (!session?.userId) {
        return false;
    }

    const user = await prisma.user.findUnique({
        where: {
            id: session.userId,
        },
        select: {
            active: true,
            isSuperAdmin: true,
        },
    });

    return user?.active === true && user.isSuperAdmin === true;
}

export async function getDatabaseBackupsAction(): Promise<{ success: boolean; message: string; data: { createdAt: string; fileName: string; sizeBytes: number; }[]; }> {
    try {
        if (!(await authorizeDatabaseAdmin())) {
            return {
                success: false,
                message: "Accès réservé au super-administrateur.",
                data: [],
            };
        }

        const backups = await listDatabaseBackups();

        return {
            success: true,
            message: "Sauvegardes récupérées.",
            data: backups.map((backup) => ({
                ...backup,
                createdAt: backup.createdAt.toISOString(),
            })),
        };
    } catch (error) {
        console.error("Database backup listing failed:", error);

        return {
            success: false,
            message: "Impossible de consulter les sauvegardes.",
            data: [],
        };
    }
}

export async function createDatabaseBackupAction(): Promise<{ success: boolean; message: string; data?: undefined; } | { success: boolean; message: string; data: { createdAt: string; fileName: string; sizeBytes: number; }; }> {
    try {
        if (!(await authorizeDatabaseAdmin())) {
            return {
                success: false,
                message: "Accès réservé au super-administrateur.",
            };
        }

        const backup = await createDatabaseBackup("manual");

        return {
            success: true,
            message: "Sauvegarde créée et archive vérifiée.",
            data: {
                ...backup,
                createdAt: backup.createdAt.toISOString(),
            },
        };
    } catch (error) {
        console.error("Database backup creation failed:", error);

        return {
            success: false,
            message: "Échec de la sauvegarde. Consulte les journaux serveur.",
        };
    }
}

export async function restoreDatabaseBackupAction(
    fileName: string,
): Promise<{ success: boolean; message: string; data?: undefined; } | { success: boolean; message: string; data: { restoredFile: string; safetyBackup: { createdAt: string; fileName: string; sizeBytes: number; }; }; }> {
    try {
        if (!(await authorizeDatabaseAdmin())) {
            return {
                success: false,
                message: "Accès réservé au super-administrateur.",
            };
        }

        const result = await restoreDatabaseBackup(fileName);

        return {
            success: true,
            message: `Restauration terminée. Sauvegarde de sécurité : ${result.safetyBackup.fileName}`,
            data: {
                restoredFile: result.restoredFile,
                safetyBackup: {
                    ...result.safetyBackup,
                    createdAt: result.safetyBackup.createdAt.toISOString(),
                },
            },
        };
    } catch (error) {
        console.error("Database restore failed:", error);

        return {
            success: false,
            message:
                "La restauration a échoué. Vérifie les journaux serveur et conserve la sauvegarde de sécurité si elle a été créée.",
        };
    }
}

export async function deleteDatabaseBackupAction(
    fileName: string,
): Promise<{ success: boolean; message: string; }> {
    try {
        if (!(await authorizeDatabaseAdmin())) {
            return {
                success: false,
                message: "Accès réservé au super-administrateur.",
            };
        }

        await deleteDatabaseBackup(fileName);

        return {
            success: true,
            message: "La sauvegarde a été supprimée.",
        };
    } catch (error) {
        console.error("Database backup deletion failed:", error);

        return {
            success: false,
            message:
                "Impossible de supprimer cette sauvegarde. Vérifie qu'elle existe, qu'il reste au moins une autre sauvegarde, puis consulte les journaux serveur si le problème persiste.",
        };
    }
}

export async function uploadDatabaseBackupAction(formData: FormData): Promise<{ success: boolean; message: string; data?: undefined; } | { success: boolean; message: string; data: { createdAt: string; fileName: string; sizeBytes: number; }; }> {
    try {
        if (!(await authorizeDatabaseAdmin())) {
            return {
                success: false,
                message: "Accès réservé au super-administrateur.",
            };
        }

        const file = formData.get("file");

        if (!(file instanceof File)) {
            return {
                success: false,
                message: "Veuillez sélectionner une archive.",
            };
        }

        if (!file.name.toLowerCase().endsWith(".dump")) {
            return {
                success: false,
                message: "Seuls les fichiers .dump sont autorisés.",
            };
        }

        if (file.size === 0 || file.size > 100 * 1024 * 1024) {
            return {
                success: false,
                message:
                    "Le fichier doit avoir une taille comprise entre 1 octet et 100 Mo.",
            };
        }

        const backup = await importDatabaseBackup(file);

        return {
            success: true,
            message: "Archive importée avec succès.",
            data: {
                ...backup,
                createdAt: backup.createdAt.toISOString(),
            },
        };
    } catch (error) {
        console.error("Erreur d'importation de sauvegarde :", error);

        return {
            success: false,
            message:
                "Impossible d'importer cette archive. Vérifie le fichier et consulte les journaux serveur si le problème persiste.",
        };
    }
}