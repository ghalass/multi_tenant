"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deletePanne } from "@/server/pannes";
import { Button } from "@/components/ui/button";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { GlobalLoader } from "@/components/global-loader";
import DisplayError from "@/components/display-error";

export function DeletePanneForm({
    panne,
}: {
    panne: { id: string; name: string };
}): import("react").JSX.Element {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState("");
    const router = useRouter();

    async function onDelete(): Promise<void> {
        try {
            setLoading(true);
            setError("");

            const result = await deletePanne(panne.id);

            if (!result.success) {
                setError(result.message ?? "Suppression impossible.");
                return;
            }

            toast.success(result.message ?? "Panne supprimée.");
            setOpen(false);
            startTransition(() => router.refresh());
        } catch {
            toast.error("Une erreur inattendue est survenue.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <GlobalLoader show={pending} />
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" title="Supprimer" aria-label="Supprimer la panne">
                        <Trash2 className="size-4 text-destructive" />
                    </Button>
                </DialogTrigger>

                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Supprimer la panne</DialogTitle>
                        <DialogDescription>
                            Confirmez-vous la suppression de « {panne.name} » ? La suppression
                            est impossible si cette panne est utilisée dans une saisie HIM.
                        </DialogDescription>
                    </DialogHeader>

                    <DisplayError error={error} />

                    <DialogFooter>
                        <Button variant="destructive" onClick={onDelete} disabled={loading}>
                            {loading ? <Spinner className="size-4" /> : "Supprimer"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}