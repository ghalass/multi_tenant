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
import { getAllSites, SiteSearchParams } from "@/server/sites";
import { CreateSiteForm } from "./create-site-form";
import { UpdateSiteForm } from "./update-site-form";
import { DeleteSiteForm } from "./delete-site-form";
import Search from "@/app/(main)/[tenantId]/sites/search";
import Pagination from "@/components/pagination";
import DisplayData from "@/components/DisplayData";
import DisplayError from "@/components/display-error";

export default async function Sites2Page({ params, SiteSearchParams }: {
  params: Promise<{ tenantId: string }>;
  SiteSearchParams: Promise<SiteSearchParams>;
}) {
  const { tenantId } = await params;
  const filters = await SiteSearchParams;

  // Récupération de l'objet contenant { data, meta }
  const result = await getAllSites(tenantId, filters);
  const sites = result?.data || [];
  const meta = result?.meta;

  return (
    <div className="container mx-auto py-2">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <div className="flex items-center">
            <MapPin className="h-8 w-8" />
            Gestion des sites
            <div id="global-loader-slot" />
          </div>
        </h1>
        <CreateSiteForm tenantId={tenantId} />
      </div>

      <p className="text-muted-foreground mt-1">
        Créez et gérez les sites de votre application
      </p>

      <div className="my-4">
        <Search />
      </div>

      {!result?.success && <DisplayError error={result?.message} />}

      <div className="rounded-md border">
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
                      {site.active ? "Actif" : "Inactif"}
                    </Badge>
                  </TableCell>
                  <TableCell className="flex gap-4 justify-end text-center">
                    <UpdateSiteForm site={site} />
                    <DeleteSiteForm site={site} />
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
