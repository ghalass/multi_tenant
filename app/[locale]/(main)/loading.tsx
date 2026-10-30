// app/(main)/loading.tsx
import { SpinnerPage } from "@/components/spinner-page";

export default function Loading(): import("react").JSX.Element {
    return (
        <SpinnerPage className="size-8" />
    );
}