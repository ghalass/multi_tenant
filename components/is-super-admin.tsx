import type { JSX, ReactNode } from "react";
import { ACTION } from "@/lib/enums";
import { isSuperAdmin } from "@/lib/rbac/core";

export default async function IsSuperAdmin({
    children,
}: {
    children?: ReactNode;
}): Promise<JSX.Element> {
    const is_super_admin = await isSuperAdmin();

    return <>{is_super_admin && children}</>;
}