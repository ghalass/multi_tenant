// app/(main)/[tenantId]/sites2/page.tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SearchParams } from "@/server/site";
import { CreateUserForm } from "./create-user-form";
import { UpdateUserForm } from "./update-user-form";
import { DeleteUserForm } from "./delete-user-form";
import Search from "@/app/(main)/[tenantId]/users/search";
import Pagination from "@/components/pagination";
import DisplayData from "@/components/DisplayData";
import { getAllUsers } from "@/server/users";

export default async function Users2Page({ params, searchParams }: {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { tenantId } = await params;
  const filters = await searchParams;

  // Récupération de l'objet contenant { data, meta }
  const result = await getAllUsers(tenantId, filters);
  const users = result?.data || [];
  const meta = result?.meta;

  return (
    <div className="container mx-auto py-2">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <div className="flex items-center">
            <MapPin className="h-8 w-8" />
            Gestion des utilisateurs
            <div id="global-loader-slot" />
          </div>
        </h1>
        <CreateUserForm tenantId={tenantId} />
      </div>

      <p className="text-muted-foreground mt-1">
        Créez et gérez les utilisateurs de votre application
      </p>

      <div className="my-4">
        <Search />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  Aucun site trouvé.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>

                  <TableCell className="font-medium">{user.name}</TableCell>

                  <TableCell>{user?.email}</TableCell>

                  <TableCell>
                    <Badge
                      variant={user.active ? "default" : "secondary"}
                      className={user.active ? "bg-green-100 text-green-800" : ""}
                    >
                      {user.active ? "Actif" : "Inactif"}
                    </Badge>
                  </TableCell>

                  <TableCell className="flex gap-4 justify-end text-center">
                    <UpdateUserForm key={user.id} user={user} />
                    <DeleteUserForm user={user} />
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

      {/* <DisplayData data={sites} /> */}
    </div>
  );
}
