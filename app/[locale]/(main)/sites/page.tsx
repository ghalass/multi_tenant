// app/(main)/sites/page.tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MapPin, SaveIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getAllSites, searchParams } from "@/server/sites";
import { CreateSiteForm } from "./create-site-form";
import { UpdateSiteForm } from "./update-site-form";
import { DeleteSiteForm } from "./delete-site-form";
import Search from "./search";
import Pagination from "@/components/pagination";
import DisplayError from "@/components/display-error";
import CanAccess from "@/components/can-access";
import { ACTION } from "@/lib/enums";
import { ACTIVE, RESOURCE } from "@/lib/constantes";
import { ExportExcel } from "@/components/export-excel";

export default async function SitesPage({ searchParams }: { searchParams: Promise<searchParams> }) {
  const filters = await searchParams;

  const response = await getAllSites(filters);

  const sites = response?.data || [];
  const meta = response?.meta;

  return (
    <div className="container mx-auto py-2">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <div className="flex items-center">
            <MapPin className="h-8 w-8" />
            Gestion des sites
          </div>
        </h1>

        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 items-center">
          <CanAccess resource={RESOURCE.SITE} action={ACTION.CREATE}>
            <CreateSiteForm />
          </CanAccess>
          <CanAccess resource={RESOURCE.SITE} action={ACTION.EXPORT}>
            <ExportExcel tableName="sites-table" fileName="Sites" />
          </CanAccess>
        </div>

      </div>

      <p className="text-muted-foreground mt-1">
        Créez et gérez les sites de votre application
      </p>

      {!response?.success && <DisplayError className="mt-4" error={response?.message} />}
      <CanAccess resource={RESOURCE.SITE} action={ACTION.READ}>
        <div className="my-4">
          <Search />
        </div>

        <div className="rounded-md border">
          <div id="global-loader-slot" className="relative w-full">
            <Table id="sites-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Site</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sites.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      Aucun site trouvé.
                    </TableCell>
                  </TableRow>
                ) : (
                  sites.map((site) => (
                    <TableRow key={site.id}>
                      <TableCell className="font-medium">{site.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant={site.active ? "default" : "secondary"}
                          className={site.active ? "bg-green-100 text-green-800" : ""}
                        >
                          {site.active ? ACTIVE.YES : ACTIVE.NO}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {site.tenant?.name || "N/A"}
                      </TableCell>
                      <TableCell className="flex gap-4 justify-end text-center">
                        <CanAccess resource={RESOURCE.SITE} action={ACTION.UPDATE}>
                          <UpdateSiteForm site={site} />
                        </CanAccess>
                        <CanAccess resource={RESOURCE.SITE} action={ACTION.DELETE}>
                          <DeleteSiteForm site={site} />
                        </CanAccess>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
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
      </CanAccess>
    </div>
  );
}
