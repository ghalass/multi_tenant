// components/ui/spinner.tsx
import { cn } from "@/lib/utils";
import { Spinner } from "./ui/spinner";

export function SpinnerPage({ className }: { className?: string }) {
    return (
        <div className={cn("mt-4 flex justify-center items-center mx-auto ", className)}>
            <Spinner className="h-8 w-8 text-primary" />
        </div>
    );
}