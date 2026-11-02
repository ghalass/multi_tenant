import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { READ_ACCESS_DENIED_MESSAGE } from "@/lib/rbac/access-messages";
import type { JSX } from "react";

interface DisplayErrorProps {
    error?: string | null;
    className?: string;
}

export default function DisplayError({
    error,
    className,
}: DisplayErrorProps): JSX.Element | null {
    if (!error) return null;
    if (error === READ_ACCESS_DENIED_MESSAGE) return null;

    return (
        <div
            role="alert"
            aria-live="polite"
            className={cn(
                "flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive",
                className
            )}
        >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <p className="flex-1">{error}</p>
        </div>
    );
}