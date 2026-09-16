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
        <Spinner className="size-4 text-primary mt-2 mx-2" />,
        slot
    );
}