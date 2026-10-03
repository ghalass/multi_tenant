"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Spinner } from "./ui/spinner";

export function GlobalLoader({ show }: { show: boolean }) {
    const [mounted, setMounted] = useState(false);
    const [slot, setSlot] = useState<HTMLElement | null>(null);

    useEffect(() => {
        setMounted(true);
        setSlot(document.getElementById("global-loader-slot"));
    }, []);

    if (!mounted || !slot || !show) return null;

    return createPortal(
        <div className="absolute inset-0 z-50 flex h-full w-full items-center justify-center bg-background/60">
            <Spinner className="size-7 text-primary" />
        </div>,
        slot
    );
}