// components/CanAccess.tsx
"use client";

import { usePermissionCheck } from "@/hooks/usePermissions";

interface CanAccessProps {
  action: string;
  resource: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showAdminInfo?: boolean; // Optionnel : afficher un badge admin
}

export function CanAccess({
  action,
  resource,
  children,
  fallback = null,
  showAdminInfo = false,
}: CanAccessProps) {
  const { hasPermission, isLoading, isAdminOrSuperAdmin } =
    usePermissionCheck();

  if (isLoading) {
    return (
      <div className="animate-pulse bg-muted rounded-md p-4">
        <div className="h-4 bg-muted-foreground/20 rounded w-1/2"></div>
      </div>
    );
  }

  // ✅ Les administrateurs et super-administrateurs ont accès à tout
  if (isAdminOrSuperAdmin) {
    return (
      <>
        {children}
        {showAdminInfo && (
          <div className="text-xs text-muted-foreground mt-1">
            🔐 Accès administrateur
          </div>
        )}
      </>
    );
  }

  // Vérification des permissions pour les utilisateurs normaux
  if (!hasPermission(action, resource)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
