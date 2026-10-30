"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteTypePanne } from "@/server/typepannes";
import { sleep } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { GlobalLoader } from "@/components/global-loader";
import DisplayError from "@/components/display-error";
import type { JSX } from "react";

export function DeleteTypePanneForm({
    typePanne,
}: {
    typePanne: { id: string; name: string };
}): JSX.Element {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState("");
    const router = useRouter();

    async function onDelete(): Promise<void> {
        try {
            setIsLoading(true);
            setError("");
            await sleep();

            const result = await deleteTypePanne(typePanne.id);

            if (!result.success) {
                setError(result.message ?? "Suppression impossible.");
                return;
            }

            toast.success(result.message ?? "Type de panne supprimé.");
            setOpen(false);
            startTransition(() => router.refresh());
        } catch {
            toast.error("Une erreur inattendue est survenue.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <>
            <GlobalLoader show={isPending} />

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Supprimer le type de panne"
                        title="Supprimer"
                    >
                        <Trash2 className="size-4 text-destructive" />
                    </Button>
                </DialogTrigger>

                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Supprimer le type de panne</DialogTitle>
                        <DialogDescription>
                            Confirmez-vous la suppression de « {typePanne.name} » ? Cette
                            opération est impossible si le type est utilisé par une panne.
                        </DialogDescription>
                    </DialogHeader>

                    <DisplayError error={error} />

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={onDelete}
                            disabled={isLoading}
                        >
                            {isLoading ? <Spinner className="size-4" /> : "Supprimer"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}