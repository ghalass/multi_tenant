"use client";

import { useState, useTransition, type JSX } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import { setPlanMaintenanceActive } from "@/server/maintenance-preventive-plans";

export function PlanMaintenanceActiveToggle({
    id,
    active: initialActive,
    name,
}: {
    id: string;
    active: boolean;
    name: string;
}): JSX.Element {
    const router = useRouter();

    const [loading, setLoading] = useState(false);
    const [pending, startTransition] = useTransition();

    async function handleChange(nextActive: boolean): Promise<void> {
        if (loading || pending || nextActive === initialActive) {
            return;
        }

        setLoading(true);

        try {
            const result = await setPlanMaintenanceActive(id, nextActive);

            if (!result.success) {
                toast.error(result.message);
                return;
            }

            toast.success(result.message);

            startTransition(() => {
                router.refresh();
            });
        } catch {
            toast.error(
                "Impossible de modifier l'état du plan de maintenance.",
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex items-center justify-end gap-2">
            <Switch
                checked={initialActive}
                onCheckedChange={handleChange}
                disabled={loading || pending}
                aria-label={`${initialActive ? "Désactiver" : "Activer"} le plan ${name}`}
            />
        </div>
    );
}