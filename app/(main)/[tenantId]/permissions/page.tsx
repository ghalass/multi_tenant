// app/(main)/[tenantId]/permissions/page.tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MapPin } from "lucide-react";
import { PermissionsSearchParams } from "@/server/permissions";
import { CreatePermissionForm } from "./create-permissions-form";
import { DeletePermissionForm } from "./delete-permissions-form";
import Search from "@/app/(main)/[tenantId]/permissions/search";
import Pagination from "@/components/pagination";
import { getAllPermission, getTables } from "@/server/permissions";
import { UpdatePermissionForm } from "./update-permissions-form";
import DisplayError from "@/components/display-error";

export default async function Permissions2Page({ params, PermissionsSearchParams }: {
  params: Promise<{ tenantId: string }>;
  PermissionsSearchParams: Promise<PermissionsSearchParams>;
}) {
  const filters = await PermissionsSearchParams;

  // Récupération de l'objet contenant { data, meta }
  const result = await getAllPermission(filters);
  const permissions = result?.data || [];
  const meta = result?.meta;

  const tables = await getTables()

  return (
    <div className="container mx-auto py-2">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <div className="flex items-center">
            <MapPin className="h-8 w-8" />
            Gestion des permissions
            <div id="global-loader-slot" />
          </div>
        </h1>
        <CreatePermissionForm tables={tables} />
      </div>

      <p className="text-muted-foreground mt-1">
        Créez et gérez les permissions de votre application
      </p>

      <div className="my-4">
        <Search />
      </div>

      {!result?.success && <DisplayError error={result?.message} />}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Ressource</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {permissions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  Aucune permission trouvé.
                </TableCell>
              </TableRow>
            ) : (
              permissions.map((permission) => (
                <TableRow key={permission.id}>

                  <TableCell className="font-medium">{permission.name}</TableCell>

                  <TableCell>{permission?.resource}</TableCell>
                  <TableCell>{permission?.action}</TableCell>
                  <TableCell>{permission?.description}</TableCell>

                  <TableCell className="flex gap-4 justify-end text-center">
                    <UpdatePermissionForm key={permission.id} permission={permission} tables={tables} />
                    <DeletePermissionForm permission={permission} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 3. Ajout de la barre de contrôle sous le tableau */}
      {meta && (
        <Pagination
          totalPages={meta.totalPages}
          currentPage={meta.currentPage}
          totalItems={meta.totalItems}
          itemsPerPage={meta.itemsPerPage}
        />
      )}

      {/* <DisplayData data={permissions} /> */}
    </div>
  );
}
