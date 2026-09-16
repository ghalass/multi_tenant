"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

// Labels custom pour les segments non triviaux
const SEGMENT_LABELS: Record<string, string> = {
    sites: "Sites",
    sites2: "Sites 2",
    users: "Utilisateurs",
    roles: "Rôles",
    permissions: "Permissions",
    settings: "Paramètres",
};

function formatSegment(segment: string) {
    return (
        SEGMENT_LABELS[segment] ??
        segment
            .replace(/-/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase())
    );
}

export function TenantBreadcrumb({ tenantName }: { tenantName: string }) {
    const pathname = usePathname();
    const params = useParams<{ tenantId: string }>();
    const tenantId = params?.tenantId;

    // Découpe : ["acme", "sites2"] par exemple
    const segments = pathname.split("/").filter(Boolean);

    // On retire le premier segment (tenantId) car on l'affiche à part
    const subSegments = segments.slice(1);

    return (
        <Breadcrumb>
            <BreadcrumbList className="text-xs sm:text-sm">
                {/* Premier item : le nom du tenant, lien vers sa racine */}
                <BreadcrumbItem>
                    {subSegments.length === 0 ? (
                        <BreadcrumbPage className="font-medium text-primary">
                            {tenantName}
                        </BreadcrumbPage>
                    ) : (
                        <BreadcrumbLink asChild>
                            <Link href={`/${tenantId}`} className="font-medium text-primary hover:text-primary/80">
                                {tenantName}
                            </Link>
                        </BreadcrumbLink>
                    )}
                </BreadcrumbItem>

                {/* Segments suivants */}
                {subSegments.map((segment, index) => {
                    const isLast = index === subSegments.length - 1;
                    const href = `/${[tenantId, ...subSegments.slice(0, index + 1)].join("/")}`;
                    const label = formatSegment(segment);

                    return (
                        <span key={href} className="contents">
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                {isLast ? (
                                    <BreadcrumbPage className="truncate max-w-[200px]">
                                        {label}
                                    </BreadcrumbPage>
                                ) : (
                                    <BreadcrumbLink asChild>
                                        <Link href={href} className="truncate max-w-[200px]">
                                            {label}
                                        </Link>
                                    </BreadcrumbLink>
                                )}
                            </BreadcrumbItem>
                        </span>
                    );
                })}
            </BreadcrumbList>
        </Breadcrumb>
    );
}