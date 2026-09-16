// lib/types.ts - Types corrigés basés sur le schéma

// ============ ENUMS ============
export enum Action {
  CREATE = "create",
  READ = "read",
  UPDATE = "update",
  DELETE = "delete",
}

// ============ MODELS DE BASE ============
export interface User {
  id?: string;
  name: string;
  email: string;
  password?: string;
  active?: boolean;

  roles?: UserRole[];
}

export interface Permission {
  id: string;
  resource: string;
  action?: Action;
  roles?: RolePermission[];
}

// lib/types.ts - Assurez-vous que Role a ces propriétés
export interface Role {
  id: string;
  name: string;
  description?: string;
  createdAt?: string; // Date en string
  updatedAt?: string; // Date en string
  permissions?: Array<{
    id: string;
    name: string;
    description: string;
    resource: string;
    action: string;
  }>;
  user?: [];
}

export interface UserRole {
  id?: string;
  userId: string;
  roleId: string;
  user?: User;
  role?: Role;

  // Ajouter ces propriétés si elles existent dans votre modèle
  // (selon votre schéma de base de données)
  name?: string; // Si le nom est stocké directement dans UserRole
  roleName?: string; // Alternative: nom dédié
}

export interface RolePermission {
  roleId: string;
  permissionId: string;
  role?: Role;
  permission?: Permission;
}

// ============ MODELS PRINCIPAUX ============
export interface Site {
  id: string;
  name: string;
  active: boolean;

  // Count pour les agrégations
  _count?: {
    engins?: number;
  };
}

// ============ TYPES POUR LES RÉPONSES API ============
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============ TYPES POUR LES FILTRES ============

// ============ TYPE UTILITAIRE ============

// ============ TYPES POUR LES DTO ============
export interface RoleCreateDto {
  name: string;
  description?: string;
  permissions: string[]; // IDs des permissions
}

export interface RoleUpdateDto {
  id: string;
  name?: string;
  description?: string;
  permissions?: string[];
}

// ============ TYPES POUR LES FILTRES UTILISATEURS ============
export interface UserFilter {
  name?: string;
  email?: string;
  active?: boolean;
  role?: string;
  search?: string;
}

// ============ TYPES POUR LES TABLEAUX ============
export interface ColumnFilters {
  name: string;
  email: string;
  roles: string;
}

// ============ TYPES POUR LES FONCTIONS DE FILTRE ============
export interface FilterOptions {
  globalSearch: string;
  columnFilters: ColumnFilters;
}

export interface UserDetail {
  id: string;
  name: string;
  email: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  roles: Role[];
  roleNames: string[];
  isSuperAdmin?: boolean;
  isOwner?: boolean;
  tenant: {
    tenantId?: string | null;
    tenantName: string | null;
  };
  permissions: {
    id: string;
    resource: string;
    action: string | null;
    roleId: string;
    roleName: string;
  }[];
}
