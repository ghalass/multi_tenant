"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

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
import { deleteSaisieHim } from "@/server/saisie_him";
import type { JSX } from "react";

export function DeleteSaisieHimForm({
    saisie,
}: {
    saisie: {
        id: string;
        du: string;
        engin: string;
        panne: string;
    };
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

            const result = await deleteSaisieHim(saisie.id);

            if (!result.success) {
                setError(result.message ?? "La suppression a échoué.");
                return;
            }

            toast.success(result.message ?? "Saisie HIM supprimée.");
            setOpen(false);

            startTransition(() => {
                router.refresh();
            });
        } catch {
            setError("Une erreur inattendue est survenue.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <GlobalLoader show={pending} />

            <Dialog
                open={open}
                onOpenChange={(value) => {
                    setOpen(value);
                    if (value) setError("");
                }}
            >
                <DialogTrigger asChild>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="Supprimer la saisie HIM"
                        aria-label="Supprimer la saisie HIM"
                    >
                        <Trash2 className="size-4 text-destructive" />
                    </Button>
                </DialogTrigger>

                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Supprimer la saisie HIM</DialogTitle>
                        <DialogDescription>
                            Confirmez-vous la suppression de la saisie HIM pour
                            l'engin {saisie.engin}, le {saisie.du}, concernant
                            la panne « {saisie.panne} » ?
                        </DialogDescription>
                    </DialogHeader>

                    <DisplayError error={error} />

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={onSubmit}
                            disabled={loading}
                        >
                            {loading ? (
                                <Spinner className="size-4" />
                            ) : (
                                "Supprimer"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}