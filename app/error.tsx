"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

type ErrorProps = {
    error: Error & { digest?: string };
    retry: () => void;
};

export default function ErrorPage({
    error,
    retry,
}: ErrorProps) {
    useEffect(() => {
        console.error("Erreur de l'application :", error);
    }, [error]);

    return (
        <main className="flex min-h-[60vh] items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-xl border bg-card p-8 text-center shadow-sm">
                <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                    <AlertTriangle className="size-7" />
                </div>

                <h1 className="text-2xl font-bold tracking-tight">
                    Une erreur est survenue
                </h1>

                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    Une erreur inattendue empêche l'affichage de cette
                    page. Vous pouvez essayer de la charger à nouveau.
                </p>

                {error.digest && (
                    <p className="mt-4 break-all text-xs text-muted-foreground">
                        Référence de l'erreur :{" "}
                        <code>{error.digest}</code>
                    </p>
                )}

                <div className="mt-6 flex justify-center">
                    <Button type="button" onClick={retry}>
                        <RotateCcw className="size-4" />
                        Réessayer
                    </Button>
                </div>
            </div>
        </main>
    );
}