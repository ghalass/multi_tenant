"use client";

import { Button } from "@/components/ui/button";
import { switchCurrentTenant } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

export default function TenantSwitcher({
    tenantName,
    tenantId,
    currentTenantId,
}: {
    tenantName: string;
    tenantId: string;
    currentTenantId?: string;
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    async function handleSwitch() {
        try {
            await switchCurrentTenant({
                currentTenantId: tenantId,
            });

            startTransition(() => {
                router.refresh();
            });
        } catch {
            toast.error("Impossible de sélectionner ce tenant.");
        }
    }

    return (
        <Button
            onClick={handleSwitch}
            disabled={isPending}
            size="sm"
            variant={currentTenantId === tenantId ? "default" : "outline"}
        >
            {tenantName}
        </Button>
    );
}