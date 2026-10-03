// app/(main)/[tenantId]/sites/page.tsx
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
import { getAllSites, SiteSearchParams } from "@/server/sites";
import { CreateSiteForm } from "./create-site-form";
import { UpdateSiteForm } from "./update-site-form";
import { DeleteSiteForm } from "./delete-site-form";
import Search from "@/app/(main)/[tenantId]/sites/search";
import Pagination from "@/components/pagination";
import DisplayError from "@/components/display-error";
import CanAccess from "@/components/can-access";
import { ACTION } from "@/lib/enums";

export default async function SitesPage({ params, searchParams }: {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<SiteSearchParams>;
}) {
  const { tenantId } = await params;
  const filters = await searchParams;

  const result = await getAllSites(tenantId, filters);
  const sites = result?.data || [];
  const meta = result?.meta;

  const resource = "site"

  return (
    <div className="container mx-auto py-2">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <div className="flex items-center">
            <MapPin className="h-8 w-8" />
            Gestion des sites
          </div>
        </h1>
        <CanAccess resource={resource} action={ACTION.CREATE}>
          <CreateSiteForm tenantId={tenantId} />
        </CanAccess>
      </div>

      <p className="text-muted-foreground mt-1">
        Créez et gérez les sites de votre application
      </p>

      {!result?.success && <DisplayError className="mt-4" error={result?.message} />}

      <CanAccess resource={resource} action={ACTION.READ}>
        <div className="my-4">
          <Search />
        </div>

        <div className="rounded-md border">
          <div id="global-loader-slot" className="relative w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Site</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sites.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
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
                          {site.active ? "Actif" : "Inactif"}
                        </Badge>
                      </TableCell>
                      <TableCell className="flex gap-4 justify-end text-center">
                        <CanAccess resource={resource} action={ACTION.UPDATE}>
                          <UpdateSiteForm site={site} />
                        </CanAccess>
                        <CanAccess resource={resource} action={ACTION.DELETE}>
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
