"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { deleteBacklog } from "@/server/backlogs";
import { GlobalLoader } from "@/components/global-loader";

export function DeleteBacklogForm({
    id,
    numeroBacklog,
}: {
    id: string;
    numeroBacklog: string;
}): import("react").JSX.Element {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [pending, startTransition] = useTransition();

    async function handleDelete(): Promise<void> {
        setLoading(true);

        try {
            const result = await deleteBacklog(id);

            if (!result.success) {
                toast.error(result.message);
                return;
            }

            toast.success(result.message);
            setOpen(false);
            startTransition(() => router.refresh());
        } catch {
            toast.error("Erreur lors de la suppression du backlog.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <GlobalLoader show={pending} />

            <AlertDialog open={open} onOpenChange={setOpen}>
                <AlertDialogTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        title="Supprimer le backlog"
                        disabled={loading || pending}
                    >
                        <Trash2 className="size-4 text-destructive" />
                    </Button>
                </AlertDialogTrigger>

                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer ce backlog ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Le backlog « {numeroBacklog} » et son historique de statuts
                            seront supprimés. Cette action est irréversible.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={loading}>
                            Annuler
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(event) => {
                                event.preventDefault();
                                void handleDelete();
                            }}
                            disabled={loading}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {loading ? "Suppression..." : "Supprimer"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}