"use client";

import { useState, useTransition, type JSX } from "react";
import { useRouter } from "next/navigation";
import { Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { GlobalLoader } from "@/components/global-loader";
import DisplayError from "@/components/display-error";
import { deleteObjectif } from "@/server/objectifs";

export function DeleteObjectifForm({
    objectif,
}: {
    objectif: { id: string; annee: number; site: string; parc: string };
}): JSX.Element {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState("");
    const router = useRouter();

    async function onSubmit(): Promise<void> {
        try {
            setLoading(true);
            setError("");

            const result = await deleteObjectif(objectif.id);
            if (!result.success) {
                setError(result.message);
                return;
            }

            startTransition(() => router.refresh());
            toast.success(result.message);
            setOpen(false);
        } catch {
            setError("Une erreur inattendue est survenue.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <GlobalLoader show={pending} />
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger aria-label="Supprimer l'objectif" className="text-destructive hover:cursor-pointer">
                    <Trash2Icon className="size-4" />
                </DialogTrigger>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Suppression</DialogTitle>
                        <DialogDescription className="flex flex-col">
                            <span>Voulez-vous vraiment supprimer cet objectif ?</span>
                            <span className="italic text-destructive">
                                {objectif.annee} — {objectif.site} — {objectif.parc}
                            </span>
                        </DialogDescription>
                        <DisplayError error={error} />
                    </DialogHeader>
                    <DialogFooter className="mt-4 sm:justify-start">
                        <Button variant="outline" onClick={onSubmit} disabled={loading}>
                            {loading ? <Spinner className="size-4" /> : "Supprimer"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
