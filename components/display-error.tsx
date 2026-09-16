// import React from 'react'

// export default function DisplayError({ error }: { error: string }) {
//     return (
//         <>
//             {
//                 error && (
//                     <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
//                         <p className="text-sm text-red-600 dark:text-red-400 text-center">
//                             {error}
//                         </p>
//                     </div>
//                 )
//             }
//         </>
//     )
// }
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DisplayErrorProps {
    error?: string | null;
    className?: string;
}

export default function DisplayError({ error, className }: DisplayErrorProps) {
    if (!error) return null;

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