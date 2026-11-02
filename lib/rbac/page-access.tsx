import type { JSX } from "react";

import AccessDeniedCard from "@/components/access-denied-card";
import { ACTION } from "@/lib/enums";
import { hasPermission } from "@/lib/rbac/core";

export async function getPageAccessFallback(
    resource: string,
): Promise<JSX.Element | null> {
    const canRead = await hasPermission(ACTION.READ, resource);
    return canRead ? null : <AccessDeniedCard />;
}
