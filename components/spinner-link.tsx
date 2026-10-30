// components/ui/link-spinner.tsx

"use client";
import { cn } from "@/lib/utils";
import { useLinkStatus } from "next/link";
import { Spinner } from "./ui/spinner";
import { JSX } from "react/jsx-runtime";

export function SpinnerLink({
    className,
}: {
    className?: string;
}): JSX.Element | null {
    const { pending } = useLinkStatus();
    return pending ? <div className={cn("flex justify-center items-center", className)}>
        <Spinner className=" h-8 w-8 text-primary" />
    </div> : null;

}

