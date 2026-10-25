"use client";

import { useCallback, useEffect, useState } from "react";
import {
    AlertTriangle,
    Database,
    Download,
    FileArchive,
    LoaderCircle,
    RotateCcw,
    ShieldCheck,
    Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
    createDatabaseBackupAction,
    deleteDatabaseBackupAction,
    getDatabaseBackupsAction,
    restoreDatabaseBackupAction,
    uploadDatabaseBackupAction
} from "@/server/database-backup-actions";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@/components/ui/alert";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

type Backup = {
    fileName: string;
    sizeBytes: number;
    createdAt: string;
};

function getBackupType(fileName: string) {
    if (fileName.startsWith("gmao_pre-restore_")) {
        return {
            label: "Sauvegarde de sécurité",
            variant: "secondary" as const,
            icon: ShieldCheck,
        };
    }

    if (fileName.startsWith("gmao_imported_")) {
        return {
            label: "Archive importée",
            variant: "secondary" as const,
            icon: FileArchive,
        };
    }

    // Nouveau format : gmao_2026-10-25-13-39-35_a1b2c3d4.dump
    const currentFormat =
        /^gmao_\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}_[a-f0-9]{8}\.dump$/i;

    if (currentFormat.test(fileName)) {
        return {
            label: "Sauvegarde normale",
            variant: "outline" as const,
            icon: Database,
        };
    }

    // Ancien format ISO : gmao_2026-10-25T13-39-35-143Z_a1b2c3d4.dump
    const legacyFormat =
        /^gmao_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z_[a-f0-9]{8}\.dump$/i;

    if (
        legacyFormat.test(fileName) ||
        fileName.startsWith("gmao_manual_")
    ) {
        return {
            label: "Sauvegarde normale",
            variant: "outline" as const,
            icon: Database,
        };
    }

    return {
        label: "Ancienne sauvegarde",
        variant: "outline" as const,
        icon: FileArchive,
    };
}

function formatSize(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes < 0) {
        return "Taille inconnue";
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} Ko`;
    }

    if (bytes < 1024 * 1024 * 1024) {
        return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
    }

    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} Go`;
}

function formatDate(date: string): string {
    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
        return "Date inconnue";
    }

    return parsedDate.toLocaleString();
}

export default function DatabaseBackupsPage() {
    const [backups, setBackups] = useState<Backup[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);

    const [uploading, setUploading] = useState(false);

    const [backupToRestore, setBackupToRestore] =
        useState<string | null>(null);
    const [restoring, setRestoring] = useState(false);

    const [backupToDelete, setBackupToDelete] =
        useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    const isBusy = creating || restoring || deleting || uploading;

    const loadBackups = useCallback(async () => {
        setLoading(true);

        try {
            const result = await getDatabaseBackupsAction();

            if (!result.success) {
                toast.error(result.message);
                return;
            }

            setBackups(result.data as Backup[]);
        } catch {
            toast.error("Impossible de charger les sauvegardes.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadBackups();
    }, [loadBackups]);

    async function handleCreateBackup() {
        if (isBusy || loading) return;

        setCreating(true);

        try {
            const result = await createDatabaseBackupAction();

            if (!result.success) {
                toast.error(result.message);
                return;
            }

            toast.success(result.message);
            await loadBackups();
        } catch {
            toast.error("La création de la sauvegarde a échoué.");
        } finally {
            setCreating(false);
        }
    }

    async function handleRestore() {
        if (!backupToRestore || isBusy) return;

        const fileName = backupToRestore;
        setRestoring(true);

        try {
            const result = await restoreDatabaseBackupAction(fileName);

            if (!result.success) {
                toast.error(result.message);
                return;
            }

            toast.success(result.message, { duration: 10000 });
            setBackupToRestore(null);

            await loadBackups();
        } catch {
            toast.error(
                "Erreur pendant la restauration. Vérifie la base de données et les sauvegardes.",
            );
        } finally {
            setRestoring(false);
        }
    }

    async function handleDelete() {
        if (!backupToDelete || isBusy || backups.length <= 1) {
            return;
        }

        const fileName = backupToDelete;
        setDeleting(true);

        try {
            const result = await deleteDatabaseBackupAction(fileName);

            if (!result.success) {
                toast.error(result.message);
                return;
            }

            toast.success(result.message);
            setBackupToDelete(null);

            await loadBackups();
        } catch {
            toast.error("La suppression de la sauvegarde a échoué.");
        } finally {
            setDeleting(false);
        }
    }

    function handleDownload(fileName: string) {
        if (isBusy) return;

        window.location.assign(
            `/api/database-backups/${encodeURIComponent(fileName)}`,
        );
    }

    async function handleUploadBackup(
        event: React.ChangeEvent<HTMLInputElement>,
    ) {
        const file = event.target.files?.[0];

        // Permet de sélectionner à nouveau le même fichier.
        event.target.value = "";

        if (!file || isBusy || loading) return;

        setUploading(true);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const result = await uploadDatabaseBackupAction(formData);

            if (!result.success) {
                toast.error(result.message);
                return;
            }

            toast.success(result.message);
            await loadBackups();
        } catch {
            toast.error("L'importation de l'archive a échoué.");
        } finally {
            setUploading(false);
        }
    }

    return (
        <main className="space-y-6 p-4 md:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
                        <Database className="size-6" />
                        Sauvegardes de la base de données
                    </h1>

                    <p className="mt-1 text-sm text-muted-foreground">
                        Gestion des sauvegardes PostgreSQL de la GMAO.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <input
                        id="backup-upload"
                        type="file"
                        accept=".dump"
                        className="hidden"
                        disabled={isBusy || loading}
                        onChange={(event) => void handleUploadBackup(event)}
                    />

                    <Button
                        type="button"
                        variant="outline"
                        disabled={isBusy || loading}
                        onClick={() =>
                            document.getElementById("backup-upload")?.click()
                        }
                    >
                        {uploading ? (
                            <LoaderCircle className="mr-2 size-4 animate-spin" />
                        ) : (
                            <FileArchive className="mr-2 size-4" />
                        )}

                        {uploading ? "Importation en cours..." : "Importer une archive"}
                    </Button>

                    <Button
                        type="button"
                        onClick={() => void handleCreateBackup()}
                        disabled={isBusy || loading}
                    >
                        {creating ? (
                            <LoaderCircle className="mr-2 size-4 animate-spin" />
                        ) : (
                            <Database className="mr-2 size-4" />
                        )}

                        {creating ? "Création en cours..." : "Créer une sauvegarde"}
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Historique des sauvegardes</CardTitle>
                    <CardDescription>
                        Identifie les sauvegardes normales, les sauvegardes de
                        sécurité créées avant restauration et les anciennes archives.
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                            <LoaderCircle className="size-4 animate-spin" />
                            Chargement des sauvegardes...
                        </div>
                    ) : backups.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                            <FileArchive className="size-10 text-muted-foreground" />

                            <p className="font-medium">
                                Aucune sauvegarde disponible
                            </p>

                            <p className="text-sm text-muted-foreground">
                                Crée une sauvegarde pour commencer.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        {/* La colonne Fichier prend l'espace disponible, jusqu'à 300px max */}
                                        <TableHead className="w-full max-w-[300px]">Fichier</TableHead>

                                        {/* Ces colonnes se réduisent au strict minimum de leur contenu */}
                                        <TableHead className="w-[1%] whitespace-nowrap">Date</TableHead>
                                        <TableHead className="w-[1%] whitespace-nowrap">Taille</TableHead>
                                        <TableHead className="w-[1%] whitespace-nowrap text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {backups.map((backup) => {
                                        const type = getBackupType(backup.fileName);
                                        const TypeIcon = type.icon;

                                        return (
                                            <TableRow key={backup.fileName}>
                                                {/* Colonne Fichier */}
                                                <TableCell className="w-full max-w-[300px] whitespace-normal align-top">
                                                    <div className="space-y-2">
                                                        <p
                                                            className="text-sm font-medium break-all leading-tight"
                                                            title={backup.fileName}
                                                        >
                                                            {backup.fileName}
                                                        </p>

                                                        <Badge variant={type.variant}>
                                                            <TypeIcon className="mr-1 size-3" />
                                                            {type.label}
                                                        </Badge>
                                                    </div>
                                                </TableCell>

                                                {/* Colonne Date */}
                                                <TableCell className="w-[1%] whitespace-nowrap align-top">
                                                    {formatDate(backup.createdAt)}
                                                </TableCell>

                                                {/* Colonne Taille */}
                                                <TableCell className="w-[1%] whitespace-nowrap align-top">
                                                    {formatSize(backup.sizeBytes)}
                                                </TableCell>

                                                {/* Colonne Actions */}
                                                <TableCell className="w-[1%] whitespace-nowrap text-right align-top">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="icon"
                                                            aria-label="Restaurer"
                                                            title="Restaurer"
                                                            disabled={isBusy}
                                                            onClick={() => setBackupToRestore(backup.fileName)}
                                                        >
                                                            <RotateCcw className="size-4" />
                                                        </Button>

                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="icon"
                                                            aria-label="Télécharger"
                                                            title="Télécharger"
                                                            disabled={isBusy}
                                                            onClick={() => handleDownload(backup.fileName)}
                                                        >
                                                            <Download className="size-4" />
                                                        </Button>

                                                        <Button
                                                            type="button"
                                                            variant="destructive"
                                                            size="icon"
                                                            aria-label="Supprimer"
                                                            title={
                                                                backups.length <= 1
                                                                    ? "Impossible de supprimer la dernière sauvegarde"
                                                                    : "Supprimer"
                                                            }
                                                            disabled={isBusy || backups.length <= 1}
                                                            onClick={() => setBackupToDelete(backup.fileName)}
                                                        >
                                                            <Trash2 className="size-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Confirmation de restauration */}
            <Dialog
                open={backupToRestore !== null}
                onOpenChange={(open) => {
                    if (!open && !restoring) {
                        setBackupToRestore(null);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <RotateCcw className="size-5" />
                            Confirmer la restauration
                        </DialogTitle>

                        <DialogDescription>
                            La base sera restaurée à partir de la sauvegarde
                            sélectionnée. Les données actuelles peuvent être remplacées.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3">
                        <p className="text-sm font-medium">
                            Sauvegarde sélectionnée
                        </p>

                        <div className="break-all rounded-md border bg-muted p-3 text-sm">
                            {backupToRestore}
                        </div>

                        <Alert variant="destructive">
                            <AlertTriangle className="size-4" />

                            <AlertTitle>Opération sensible</AlertTitle>

                            <AlertDescription>
                                Une sauvegarde de sécurité de la base actuelle sera créée
                                avant la restauration. Il est recommandé de suspendre
                                l&apos;utilisation de l&apos;application pendant cette opération.
                            </AlertDescription>
                        </Alert>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={restoring}
                            onClick={() => setBackupToRestore(null)}
                        >
                            Annuler
                        </Button>

                        <Button
                            type="button"
                            variant="destructive"
                            disabled={restoring || !backupToRestore}
                            onClick={() => void handleRestore()}
                        >
                            {restoring ? (
                                <>
                                    <LoaderCircle className="mr-2 size-4 animate-spin" />
                                    Restauration en cours...
                                </>
                            ) : (
                                "Confirmer la restauration"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Confirmation de suppression */}
            <Dialog
                open={backupToDelete !== null}
                onOpenChange={(open) => {
                    if (!open && !deleting) {
                        setBackupToDelete(null);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Trash2 className="size-5" />
                            Supprimer cette sauvegarde ?
                        </DialogTitle>

                        <DialogDescription>
                            Le fichier sera supprimé du stockage privé du serveur.
                            Les données de la base PostgreSQL ne seront pas directement
                            supprimées.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3">
                        <div className="break-all rounded-md border bg-muted p-3 text-sm">
                            {backupToDelete}
                        </div>

                        <Alert variant="destructive">
                            <AlertTriangle className="size-4" />

                            <AlertTitle>Suppression irréversible</AlertTitle>

                            <AlertDescription>
                                Vérifie que tu disposes d&apos;une autre sauvegarde valide
                                avant de continuer. La dernière sauvegarde ne peut pas être
                                supprimée.
                            </AlertDescription>
                        </Alert>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={deleting}
                            onClick={() => setBackupToDelete(null)}
                        >
                            Annuler
                        </Button>

                        <Button
                            type="button"
                            variant="destructive"
                            disabled={
                                deleting ||
                                !backupToDelete ||
                                backups.length <= 1
                            }
                            onClick={() => void handleDelete()}
                        >
                            {deleting ? (
                                <>
                                    <LoaderCircle className="mr-2 size-4 animate-spin" />
                                    Suppression en cours...
                                </>
                            ) : (
                                "Confirmer la suppression"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </main>
    );
}