"use client";

import { Button } from '@/components/ui/button';
import { switchCurrentTenant } from '@/lib/auth';

async function switchTenant({ tenantId }: { tenantId: string }) {
    await switchCurrentTenant({ currentTenantId: tenantId });
}

export default function TenantSwitcher({ tenantName, tenantId, currentTenantId }: { tenantName: string, tenantId: string, currentTenantId: string }) {
    return (
        <Button onClick={() => { switchTenant({ tenantId }); }} size="sm" variant={`${currentTenantId === tenantId ? "default" : "outline"}`} >
            {tenantName}
        </Button>
    )
}
