import { ACTION } from '@/lib/enums';
import { hasPermission } from '@/lib/rbac/core';

export default async function CanAccess({ resource, action, children }: {
    resource: string, action: ACTION, children?: React.ReactNode;
}) {
    let has_permission = await hasPermission(action, resource)
    return (<>{has_permission && children}</>)
}
