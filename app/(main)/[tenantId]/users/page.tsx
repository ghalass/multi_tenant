// app/(main)/[tenantId]/users/page.tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { UsersSearchParams } from "@/server/users";
import { CreateUserForm } from "./create-user-form";
import { UpdateUserForm } from "./update-user-form";
import { DeleteUserForm } from "./delete-user-form";
import Search from "@/app/(main)/[tenantId]/users/search";
import Pagination from "@/components/pagination";
import { getAllRoles, getAllUsers } from "@/server/users";
import DisplayError from "@/components/display-error";
import DisplayData from "@/components/DisplayData";
import CanAccess from "@/components/can-access";
import { ACTION } from "@/lib/enums";

export default async function UsersPage({ params, searchParams }: {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<UsersSearchParams>;
}) {
  const { tenantId } = await params;
  const filters = await searchParams;

  const result = await getAllUsers(tenantId, filters);
  const users = result?.data || [];
  const meta = result?.meta;

  const { roles } = await getAllRoles();

  const resource = "user"

  return (
    <div className="container mx-auto py-2">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <div className="flex items-center">
            <Users className="h-8 w-8" />
            Gestion des utilisateurs
            <div id="global-loader-slot" />
          </div>
        </h1>
        <CanAccess resource={resource} action={ACTION.CREATE}>
          <CreateUserForm tenantId={tenantId} roles={roles} />
        </CanAccess>
      </div>

      <p className="text-muted-foreground mt-1">
        Créez et gérez les utilisateurs de votre application
      </p>

      {!result?.success && <DisplayError className="mt-4" error={result?.message} />}

      <CanAccess resource="user" action={ACTION.READ}>
        <div className="my-4">
          <Search />
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rôles</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Aucun utilisateur trouvé.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user?.email}</TableCell>

                    {/* 🔑 Afficher les rôles */}
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles && user.roles.length > 0 ? (
                          user.roles.map((role) => (
                            <Badge
                              key={role.id}
                              variant="outline"
                              className="text-xs"
                            >
                              {role.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Aucun rôle
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={user.active ? "default" : "secondary"}
                        className={
                          user.active ? "bg-green-100 text-green-800" : ""
                        }
                      >
                        {user.active ? "Actif" : "Inactif"}
                      </Badge>
                    </TableCell>

                    <TableCell className="flex gap-4 justify-end text-center">
                      <CanAccess resource={resource} action={ACTION.UPDATE}>
                        <UpdateUserForm
                          key={user.id}
                          user={user}
                          roles={roles}
                        />
                      </CanAccess>
                      <CanAccess resource={resource} action={ACTION.DELETE}>
                        <DeleteUserForm user={user} />
                      </CanAccess>
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

      </CanAccess>

    </div>
  );
}