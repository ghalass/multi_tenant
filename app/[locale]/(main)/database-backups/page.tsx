import AccessDeniedCard from "@/components/access-denied-card";
import { getSession } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/rbac/core";

import DatabaseBackupsClient from "./database-backups-client";

export default async function DatabaseBackupsPage(): Promise<import("react").JSX.Element> {
    const session = await getSession();
    const authorized = session.userId
        ? await isSuperAdmin(session.userId)
        : false;

    if (!authorized) {
        return <AccessDeniedCard />;
    }

    return <DatabaseBackupsClient />;
}
