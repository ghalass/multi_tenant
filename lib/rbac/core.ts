// lib/rbac/core.ts (version corrigée)
import { prisma } from "@/lib/prisma";
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

export async function getUserWithPermissions(
  userId: string
): Promise<UserWithPermissions | null> {
  const tenantId = (await getSession()).tenant.id!;
  return prisma.user.findUnique({
    where: { id: userId, tenantId },
    include: {
      roles: {
        include: {
          permissions: true, // Relation directe avec Permission
        },
      },
    },
  }) as Promise<UserWithPermissions | null>;
}

export async function getUserPermissions(userId: string): Promise<string[]> {
  const tenantId = (await getSession()).tenant.id!;
  const user = await prisma.user.findUnique({
    where: { id: userId, tenantId },
    include: {
      roles: {
        include: {
          permissions: true, // Pas besoin de `permission: true`, c'est direct
        },
      },
    },
  });

  if (!user) {
    return [];
  }

  const permissionsSet = new Set<string>();

  user.roles.forEach((role) => {
    role.permissions.forEach((permission) => {
      const permissionString = `${permission.action || ""}:${
        permission.resource
      }`;
      if (permission.action && permission.resource) {
        permissionsSet.add(permissionString);
      }
    });
  });

  return Array.from(permissionsSet);
}

export async function hasPermission(
  userId: string,
  action: string,
  resourceName: string
): Promise<boolean> {
  const userPermissions = await getUserPermissions(userId);
  const requiredPermission = `${action}:${resourceName}`;
  return userPermissions.includes(requiredPermission);
}

export async function hasRole(
  userId: string,
  roleName: string
): Promise<boolean> {
  const tenantId = (await getSession()).tenant.id!;
  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId },
    include: {
      roles: {
        // Relation directe, pas besoin d'inclure `role` car `roles` sont déjà des objets Role
        select: {
          name: true,
        },
      },
    },
  });

  if (!user) {
    return false;
  }

  return user.roles.some((role) => role.name === roleName);
}

export async function assignRoleToUser(
  userId: string,
  roleId: string
): Promise<any> {
  const tenantId = (await getSession()).tenant.id!;
  return await prisma.user.update({
    where: { id: userId, tenantId },
    data: {
      roles: {
        connect: { id: roleId },
      },
    },
  });
}

export async function removeRoleFromUser(
  userId: string,
  roleId: string
): Promise<any> {
  const tenantId = (await getSession()).tenant.id!;
  return await prisma.user.update({
    where: { id: userId, tenantId },
    data: {
      roles: {
        disconnect: { id: roleId },
      },
    },
  });
}

export async function assignPermissionToRole(
  roleId: string,
  permissionId: string
): Promise<any> {
  const tenantId = (await getSession()).tenant.id!;
  return await prisma.role.update({
    where: { id: roleId, tenantId },
    data: {
      permissions: {
        connect: { id: permissionId },
      },
    },
  });
}

export async function removePermissionFromRole(
  roleId: string,
  permissionId: string
): Promise<any> {
  const tenantId = (await getSession()).tenant.id!;
  return await prisma.role.update({
    where: { id: roleId, tenantId },
    data: {
      permissions: {
        disconnect: { id: permissionId },
      },
    },
  });
}

export async function checkMultiplePermissions(
  userId: string,
  permissions: PermissionCheck[]
): Promise<PermissionResult> {
  const userPermissions = await getUserPermissions(userId);
  const result: PermissionResult = {};

  permissions.forEach(({ action, resource }) => {
    const permissionString = `${action}:${resource}`;
    result[permissionString] = userPermissions.includes(permissionString);
  });

  return result;
}

export async function hasAllPermissions(
  userId: string,
  permissions: PermissionCheck[]
): Promise<boolean> {
  const results = await checkMultiplePermissions(userId, permissions);
  return Object.values(results).every(Boolean);
}

export async function hasAnyPermission(
  userId: string,
  permissions: PermissionCheck[]
): Promise<boolean> {
  const results = await checkMultiplePermissions(userId, permissions);
  return Object.values(results).some(Boolean);
}

export async function getUserRoles(userId: string): Promise<string[]> {
  const tenantId = (await getSession()).tenant.id!;
  const user = await prisma.user.findUnique({
    where: { id: userId, tenantId },
    include: {
      roles: {
        select: {
          name: true,
        },
      },
    },
  });

  return user?.roles.map((role) => role.name) ?? [];
}

export async function isAdmin(userId: string): Promise<boolean> {
  return await hasRole(userId, "admin");
}

export async function isSuperAdmin(userId: string): Promise<boolean> {
  return await hasRole(userId, "super admin");
}
