import { READ_ACCESS_DENIED_MESSAGE } from "@/lib/rbac/access-messages";

export default function AccessDeniedCard(): import("react").JSX.Element {
    return (
        <div
            role="alert"
            aria-live="polite"
            className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
        >
            {READ_ACCESS_DENIED_MESSAGE}
        </div>
    );
}
