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
import { deleteSaisieHrm } from "@/server/saisie_hrm";

export function DeleteSaisieHrmForm({
    saisie,
}: {
    saisie: { id: string; du: string; engin: string };
}) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState("");
    const router = useRouter();

    async function onSubmit() {
        try {
            setLoading(true);
            setError("");

            const result = await deleteSaisieHrm(saisie.id);

            if (!result.success) {
                setError(result.message ?? "La suppression a échoué.");
                return;
            }

            toast.success(result.message ?? "Saisie supprimée.");
            setOpen(false);
            startTransition(() => router.refresh());
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
                        title="Supprimer la saisie HRM"
                        aria-label="Supprimer la saisie HRM"
                    >
                        <Trash2 className="size-4 text-destructive" />
                    </Button>
                </DialogTrigger>

                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Supprimer la saisie HRM</DialogTitle>
                        <DialogDescription>
                            Confirmez-vous la suppression de la saisie du{" "}
                            {saisie.du} pour l'engin {saisie.engin} ?
                            Si elle est liée à des saisies HIM, la suppression sera refusée.
                        </DialogDescription>
                    </DialogHeader>

                    <DisplayError error={error} />

                    <DialogFooter>
                        <Button
                            variant="destructive"
                            onClick={onSubmit}
                            disabled={loading}
                        >
                            {loading ? <Spinner className="size-4" /> : "Supprimer"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}