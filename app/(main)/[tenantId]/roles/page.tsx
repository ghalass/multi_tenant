// app/(main)/[tenantId]/roles/page.tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ShieldCheck } from "lucide-react";
import { CreateRoleForm } from "./create-roles-form";
import { DeleteRoleForm } from "./delete-roles-form";
import { UpdateRoleForm } from "./update-roles-form";
import Search from "./search";
import Pagination from "@/components/pagination";
import {
  getAllPermissions,
  getAllRole,
  SearchParams,
} from "@/server/roles";

export default async function RolesPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const filters = await searchParams;

  const result = await getAllRole(filters);
  const roles = result?.data || [];
  const meta = result?.meta;

  const permissions = await getAllPermissions();

  return (
    <div className="container mx-auto py-2">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <div className="flex items-center">
            <ShieldCheck className="h-8 w-8" />
            Gestion des rôles
            <div id="global-loader-slot" />
          </div>
        </h1>
        <CreateRoleForm permissions={permissions} />
      </div>

      <p className="text-muted-foreground mt-1">
        Créez et gérez les rôles de votre application
      </p>

      <div className="my-4">
        <Search />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead>Utilisateurs</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  Aucun rôle trouvé.
                </TableCell>
              </TableRow>
            ) : (
              roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">{role.name}</TableCell>
                  <TableCell>{role.description || "—"}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {role._count.permissions}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">
                      {role._count.users}
                    </span>
                  </TableCell>
                  <TableCell className="flex gap-4 justify-end text-center">
                    <UpdateRoleForm
                      role={role}
                      permissions={permissions}
                    />
                    <DeleteRoleForm role={role} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {meta && (
        <Pagination
          totalPages={meta.totalPages}
          currentPage={meta.currentPage}
          totalItems={meta.totalItems}
          itemsPerPage={meta.itemsPerPage}
        />
      )}
    </div>
  );
}