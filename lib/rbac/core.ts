// lib/rbac/core.ts
import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/server/tenants";
import { cache } from "react";
import { ACTION } from "../enums";
import { getSession } from "../auth";

// Types pour les permissions
export interface PermissionCheck {
  action: string;
  resource: string;
}

export interface PermissionResult {
  [permissionString: string]: boolean;
}

export interface UserWithPermissions {
  id: string;
  email: string;
  name: string;
  active: boolean;
  roles: Array<{
    id: string;
    name: string;
    permissions: Array<{
      id: string;
      resource: string;
      action: string | null;
    }>;
  }>;
}

export async function hasPermission(
  action: ACTION,
  resourceName: string
): Promise<boolean> {
  // get currentUser
  const { userId } = await getSession()
  if (userId === "") return false
  // check if super-admin
  const is_super_admin = await isSuperAdmin(userId)
  if (is_super_admin) return true
  // check permissions
  const userPermissions = await getUserPermissions(userId);
  const requiredPermission = `${action}:${resourceName}`;
  return userPermissions.includes(requiredPermission);
}

export async function getUserPermissions(
  userId?: string
): Promise<string[]> {
  const tenant = await getCurrentTenant();

  if (!userId || !tenant?.id) {
    return [];
  }

  const membership = await prisma.userTenant.findUnique({
    where: {
      userId_tenantId: {
        userId,
        tenantId: tenant.id,
      },
    },
    include: {
      roleAssignments: {
        include: {
          role: {
            include: {
              permissions: true,
            },
          },
        },
      },
    },
  });

  if (!membership) {
    return [];
  }

  const permissionsSet = new Set<string>();

  for (const assignment of membership.roleAssignments) {
    for (const permission of assignment.role.permissions) {
      if (permission.action && permission.resource) {
        permissionsSet.add(
          `${permission.action}:${permission.resource}`
        );
      }
    }
  }

  return Array.from(permissionsSet);
}

export const isSuperAdmin = cache(async (userId?: string): Promise<boolean> => {
  if (!userId) return false;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isSuperAdmin: true },
  });

  return user?.isSuperAdmin ?? false;
});
