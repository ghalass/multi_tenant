
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2Icon } from "lucide-react";
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
import { deleteParc } from "@/server/parcs";
import { sleep } from "@/lib/utils";

export function DeleteParcForm({
    parc,
}: {
    parc: { id: string; name: string };
}): import("react").JSX.Element {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState("");
    const router = useRouter();

    async function onSubmit(): Promise<void> {
        try {
            setLoading(true);
            setError("");
            await sleep();

            const result = await deleteParc(parc.id);

            if (!result.success) {
                setError(result.message || "Suppression impossible.");
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
            <GlobalLoader show={isPending} />

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger
                    aria-label="Supprimer le parc"
                    className="text-destructive hover:cursor-pointer"
                >
                    <Trash2Icon className="size-4" />
                </DialogTrigger>

                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Suppression</DialogTitle>
                        <DialogDescription className="flex flex-col">
                            <span>Voulez-vous vraiment supprimer ce parc ?</span>
                            <span className="italic text-destructive">{parc.name}</span>
                        </DialogDescription>
                        <DisplayError error={error} />
                    </DialogHeader>

                    <DialogFooter className="mt-4 sm:justify-start">
                        <Button
                            type="button"
                            variant="outline"
                            disabled={loading}
                            onClick={onSubmit}
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
