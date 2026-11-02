import type { JSX, ReactNode } from "react";
import { ACTION } from "@/lib/enums";
import { hasPermission } from "@/lib/rbac/core";
import AccessDeniedCard from "@/components/access-denied-card";

export default async function CanAccess({
    resource,
    action,
    children,
}: {
    resource: string;
    action: ACTION;
    children?: ReactNode;
}): Promise<JSX.Element> {
    const has_permission = await hasPermission(action, resource);

    if (has_permission) {
        return <>{children}</>;
    }

    return action === ACTION.READ
        ? <AccessDeniedCard />
        : <></>;
}