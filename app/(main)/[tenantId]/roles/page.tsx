// app/roles/page.tsx
"use client";

import { useState, useMemo, useRef } from "react";
import { useRoles } from "@/hooks/useRoles";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Shield,
  AlertCircle,
  Search,
  ChevronUp,
  ChevronDown,
  Filter,
  X,
  Download,
} from "lucide-react";
import { DeleteRoleModal } from "@/components/roles/DeleteRoleModal";
import { Role } from "@/lib/types";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { exportExcel } from "@/lib/xlsxFn";

type SortField = "name" | "permissions";
type SortDirection = "asc" | "desc";

interface ColumnFilters {
  name: string;
  permissions: string;
}

export default function RolesPage() {
  const { rolesQuery, deleteRole } = useRoles();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);

  // États pour les nouvelles fonctionnalités
  const [globalSearch, setGlobalSearch] = useState<string>("");
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>({
    name: "",
    permissions: "",
  });
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  // Références pour garder le focus
  const columnFilterRefs = useRef<{
    name: HTMLInputElement | null;
    permissions: HTMLInputElement | null;
  }>({
    name: null,
    permissions: null,
  });

  const handleDelete = (role: Role): void => {
    setSelectedRole(role);
    setError(null);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = (): void => {
    setIsDeleteModalOpen(false);
    setError(null);
    setSelectedRole(null);
  };

  // Gestion du tri
  const handleSort = (field: SortField): void => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  // Gestion des filtres de colonnes avec conservation du focus
  const handleColumnFilter = (
    column: keyof ColumnFilters,
    value: string
  ): void => {
    const activeElement = document.activeElement as HTMLInputElement;

    setColumnFilters((prev) => ({
      ...prev,
      [column]: value,
    }));
    setCurrentPage(1);

    setTimeout(() => {
      if (activeElement && columnFilterRefs.current[column]) {
        columnFilterRefs.current[column]?.focus();
        if (columnFilterRefs.current[column]) {
          const input = columnFilterRefs.current[column] as HTMLInputElement;
          input.setSelectionRange(input.value.length, input.value.length);
        }
      }
    }, 0);
  };

  // Réinitialiser tous les filtres
  const handleClearFilters = (): void => {
    setGlobalSearch("");
    setColumnFilters({
      name: "",
      permissions: "",
    });
    setCurrentPage(1);
  };

  // Filtrage et tri des données
  const filteredAndSortedRoles = useMemo((): Role[] => {
    if (!rolesQuery.data) return [];

    const filtered = rolesQuery.data.filter((role: Role) => {
      // Filtre global
      const globalMatch =
        globalSearch === "" ||
        role.name.toLowerCase().includes(globalSearch.toLowerCase()) ||
        role.description?.toLowerCase().includes(globalSearch.toLowerCase()) ||
        Boolean(
          role.permissions?.some(
            (permission) =>
              permission.name
                ?.toLowerCase()
                .includes(globalSearch.toLowerCase()) ||
              permission.resource
                ?.toLowerCase()
                .includes(globalSearch.toLowerCase()) ||
              permission.action
                ?.toLowerCase()
                .includes(globalSearch.toLowerCase())
          )
        );

      // Filtres par colonne
      const nameMatch =
        columnFilters.name === "" ||
        role.name.toLowerCase().includes(columnFilters.name.toLowerCase()) ||
        role.description
          ?.toLowerCase()
          .includes(columnFilters.name.toLowerCase());

      const permissionsMatch =
        columnFilters.permissions === "" ||
        Boolean(
          role.permissions?.some(
            (permission) =>
              permission.name
                ?.toLowerCase()
                .includes(columnFilters.permissions.toLowerCase()) ||
              permission.resource
                ?.toLowerCase()
                .includes(columnFilters.permissions.toLowerCase())
          )
        );

      return Boolean(globalMatch && nameMatch && permissionsMatch);
    });

    // Tri
    filtered.sort((a: Role, b: Role) => {
      let aValue: string | number = "";
      let bValue: string | number = "";

      switch (sortField) {
        case "name":
          aValue = a.name;
          bValue = b.name;
          break;

        case "permissions":
          // Trier par le nom de la première permission ou par nombre de permissions
          aValue = a.permissions?.[0]?.name || "";
          bValue = b.permissions?.[0]?.name || "";
          break;
        default:
          aValue = a.name;
          bValue = b.name;
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }
      return 0;
    });

    return filtered;
  }, [rolesQuery.data, globalSearch, columnFilters, sortField, sortDirection]);

  // Pagination améliorée avec option "Tout afficher"
  const totalItems: number = filteredAndSortedRoles.length;
  const showAll: boolean = itemsPerPage === -1;
  const totalPages: number = showAll ? 1 : Math.ceil(totalItems / itemsPerPage);
  const startIndex: number = showAll ? 0 : (currentPage - 1) * itemsPerPage;
  const paginatedRoles: Role[] = showAll
    ? filteredAndSortedRoles
    : filteredAndSortedRoles.slice(startIndex, startIndex + itemsPerPage);

  const displayError: string | null =
    error || rolesQuery.error?.message || null;

  // Vérifier s'il y a des filtres actifs
  const hasActiveFilters: boolean =
    globalSearch !== "" ||
    Object.values(columnFilters).some((filter) => filter !== "");

  // Fonction d'export Excel
  const handleExport = () => {
    if (paginatedRoles.length === 0) {
      console.warn("Aucune donnée à exporter");
      return;
    }
    exportExcel("roles-table", "Roles");
  };

  // Composant d'en-tête de colonne avec tri amélioré
  const SortableHeader = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => (
    <TableHead
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1 group">
        {children}
        <div className="flex flex-col">
          <ChevronUp
            className={`h-3 w-3 -mb-1 ${
              sortField === field && sortDirection === "asc"
                ? "text-primary"
                : "text-muted-foreground opacity-40"
            }`}
          />
          <ChevronDown
            className={`h-3 w-3 -mt-1 ${
              sortField === field && sortDirection === "desc"
                ? "text-primary"
                : "text-muted-foreground opacity-40"
            }`}
          />
        </div>
      </div>
    </TableHead>
  );

  if (rolesQuery.isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Gestion des rôles
          </h1>
          <p className="text-muted-foreground mt-1">
            Gérez les rôles et leurs permissions
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Bouton d'export Excel */}
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={filteredAndSortedRoles.length === 0}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Exporter
          </Button>
          <Button asChild>
            <Link href="/roles/create">
              <Plus className="h-4 w-4 mr-2" />
              Nouveau rôle
            </Link>
          </Button>
        </div>
      </div>

      {displayError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{displayError}</AlertDescription>
        </Alert>
      )}

      {/* Barre de recherche globale améliorée */}
      <div className="mb-6 space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, description ou permissions..."
              value={globalSearch}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setGlobalSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10"
            />
          </div>

          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Effacer les filtres
            </Button>
          )}
        </div>

        {hasActiveFilters && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span>Filtres actifs</span>
            {globalSearch && (
              <Badge variant="secondary" className="text-xs">
                Recherche: {globalSearch}
              </Badge>
            )}
            {Object.entries(columnFilters).map(
              ([key, value]) =>
                value && (
                  <Badge key={key} variant="secondary" className="text-xs">
                    {key}: {value}
                  </Badge>
                )
            )}
          </div>
        )}
      </div>

      {/* Contrôles de pagination en haut améliorés */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Afficher</span>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value: string) => {
                const newItemsPerPage = value === "all" ? -1 : Number(value);
                setItemsPerPage(newItemsPerPage);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="all">Tout afficher</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              {showAll ? "éléments" : "éléments par page"}
            </span>
          </div>
          <span className="text-sm text-muted-foreground">
            {totalItems} rôle(s) trouvé(s)
            {!showAll &&
              totalPages > 1 &&
              ` • Page ${currentPage}/${totalPages}`}
          </span>
        </div>

        {/* Info d'export */}
        {filteredAndSortedRoles.length > 0 && (
          <div className="text-sm text-muted-foreground">
            {filteredAndSortedRoles.length} ligne(s) exportable(s)
          </div>
        )}
      </div>

      <div className="border rounded-lg bg-card">
        <Table id="roles-table">
          <TableHeader>
            <TableRow>
              <TableCell className="w-12">#</TableCell>
              <SortableHeader field="name">
                <div className="space-y-2">
                  <div className="font-medium">Nom</div>
                  <Input
                    ref={(el: HTMLInputElement | null) => {
                      columnFilterRefs.current.name = el;
                    }}
                    placeholder="Filtrer..."
                    value={columnFilters.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleColumnFilter("name", e.target.value)
                    }
                    className="h-7 text-xs"
                    onClick={(e: React.MouseEvent<HTMLInputElement>) =>
                      e.stopPropagation()
                    }
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                      }
                    }}
                  />
                </div>
              </SortableHeader>

              <TableCell>
                <div className="space-y-2">
                  <div className="font-medium">Description</div>
                </div>
              </TableCell>

              <SortableHeader field="permissions">
                <div className="space-y-2">
                  <div className="font-medium">Permissions</div>
                  <Input
                    ref={(el: HTMLInputElement | null) => {
                      columnFilterRefs.current.permissions = el;
                    }}
                    placeholder="Filtrer..."
                    value={columnFilters.permissions}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleColumnFilter("permissions", e.target.value)
                    }
                    className="h-7 text-xs"
                    onClick={(e: React.MouseEvent<HTMLInputElement>) =>
                      e.stopPropagation()
                    }
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                      }
                    }}
                  />
                </div>
              </SortableHeader>

              <TableHead className="text-right">
                <span className="font-medium">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedRoles.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-10 text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Shield className="h-12 w-12 opacity-20" />
                    {rolesQuery.data?.length === 0
                      ? "Aucun rôle trouvé"
                      : "Aucun résultat correspondant aux filtres"}
                    {filteredAndSortedRoles.length === 0 &&
                      rolesQuery.data &&
                      rolesQuery.data.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleClearFilters}
                          className="mt-2"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Effacer les filtres
                        </Button>
                      )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedRoles.map((role: Role, index: number) => (
                <TableRow key={role.id} className="hover:bg-muted/50">
                  <TableCell className="text-muted-foreground">
                    {startIndex + index + 1}
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link
                      href={`/roles/${role.id}/edit`}
                      className="hover:text-primary hover:underline"
                    >
                      {role.name}
                    </Link>
                  </TableCell>

                  <TableCell>
                    <div className="max-w-xs truncate">
                      {role.description || (
                        <span className="text-muted-foreground/50 text-sm">
                          Aucune description
                        </span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {role.permissions?.slice(0, 3).map((permission, key) => (
                        <Badge
                          key={key}
                          variant="outline"
                          className="text-xs"
                          title={`${permission.name} (${
                            permission.resource
                          } - ${permission.action || "tous"})`}
                        >
                          {permission.name}
                        </Badge>
                      ))}
                      {role.permissions && role.permissions.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{role.permissions.length - 3}
                        </Badge>
                      )}
                      {(!role.permissions || role.permissions.length === 0) && (
                        <span className="text-muted-foreground/50 text-xs">
                          Aucune permission
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                      >
                        <Link href={`/roles/${role.id}/edit`}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(role)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        disabled={
                          deleteRole.isPending && selectedRole?.id === role.id
                        }
                      >
                        {deleteRole.isPending &&
                        selectedRole?.id === role.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination en bas améliorée */}
      {!showAll && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6">
          <div className="text-sm text-muted-foreground">
            Affichage de <strong>{startIndex + 1}</strong> à{" "}
            <strong>{Math.min(startIndex + itemsPerPage, totalItems)}</strong>{" "}
            sur <strong>{totalItems}</strong> rôles
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage((prev: number) => Math.max(prev - 1, 1))
              }
              disabled={currentPage === 1}
              className="flex items-center gap-1"
            >
              <ChevronDown className="h-4 w-4 rotate-90" />
              Précédent
            </Button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 7) {
                  pageNum = i + 1;
                } else if (currentPage <= 4) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 3) {
                  pageNum = totalPages - 6 + i;
                } else {
                  pageNum = currentPage - 3 + i;
                }

                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className="w-8 h-8 p-0"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage((prev: number) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="flex items-center gap-1"
            >
              Suivant
              <ChevronUp className="h-4 w-4 rotate-90" />
            </Button>
          </div>
        </div>
      )}

      <DeleteRoleModal
        open={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        role={selectedRole}
        deleteRole={deleteRole}
      />
    </div>
  );
}
