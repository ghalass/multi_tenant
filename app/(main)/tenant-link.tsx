"use client";

import { Button } from '@/components/ui/button';
import { switchCurrentTenant } from '@/lib/auth';

async function switchTenant({ tenantId }: { tenantId: string }) {
    await switchCurrentTenant({ currentTenantId: tenantId });
}

export default function TenantSwitcher({ tenantName, tenantId }: { tenantName: string, tenantId: string }) {
    return (
        <Button onClick={() => { switchTenant({ tenantId }); }} variant="outline" size="sm" >
            {tenantName}
        </Button>
    )
}
