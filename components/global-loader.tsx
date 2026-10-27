"use client";

import type { JSX } from "react";

import { Spinner } from "./ui/spinner";

export function GlobalLoader({
    show,
}: {
    show: boolean;
}): JSX.Element | null {
    if (!show) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/60"
            role="status"
            aria-label="Chargement en cours"
        >
            <Spinner className="size-8 text-primary" />
        </div>
    );
}
