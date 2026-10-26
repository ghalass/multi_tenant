import Link from "next/link";
import { ArrowLeft, Gauge } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  getAllSaisieHrm,
  getSaisieHrmOptions,
  type SaisieHrmSearchParams,
} from "@/server/saisie_hrm";
import { SaisieHrmForm } from "../saisie-hrm-form";
import { DeleteSaisieHrmForm } from "../delete-saisie-hrm-form";
import Search from "../search";
import DisplayError from "@/components/display-error";
import CanAccess from "@/components/can-access";
import { ACTION } from "@/lib/enums";
import { RESOURCE } from "@/lib/constantes";

type Options = {
  typeparcs: { id: string; name: string }[];
  parcs: { id: string; name: string; typeparcId: string }[];
  engins: { id: string; name: string; parcId: string; siteId: string }[];
  sites: { id: string; name: string }[];
};

const EMPTY_OPTIONS: Options = { typeparcs: [], parcs: [], engins: [], sites: [] };

function isValidDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export default async function SaisieHrmJourPage({
  searchParams,
}: {
  searchParams: Promise<SaisieHrmSearchParams>;
}) {
  const filters = await searchParams;
  const du = typeof filters.du === "string" ? filters.du : "";
  const hasSearched = filters.search === "1" && isValidDateOnly(du);

  const [optionsResponse, response] = await Promise.all([
    getSaisieHrmOptions(),
    hasSearched
      ? getAllSaisieHrm({
        dateDu: du,
        dateAu: du,
        typeparcId: filters.typeparcId,
        parcId: filters.parcId,
        enginId: filters.enginId,
        currentPage: 1,
        itemsPerPage: 0,
      })
      : Promise.resolve(null),
  ]);

  const options: Options = optionsResponse.success
    ? (optionsResponse.data as Options)
    : EMPTY_OPTIONS;
  const saisies = response?.data ?? [];

  const enginsPourAjout = options.engins.filter((engin) => {
    const parc = options.parcs.find((item) => item.id === engin.parcId);
    return (
      (!filters.typeparcId || parc?.typeparcId === filters.typeparcId) &&
      (!filters.parcId || engin.parcId === filters.parcId) &&
      (!filters.enginId || engin.id === filters.enginId)
    );
  });

  return (
    <div className="container mx-auto py-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Gauge className="h-8 w-8" />
          Saisie journalière HRM
        </h1>
        <Button asChild variant="outline">
          <Link href="/saisie-hrm">
            <ArrowLeft className="size-4" />
            Consultation entre deux dates
          </Link>
        </Button>
      </div>

      <p className="mt-1 text-muted-foreground">
        Sélectionnez une date précise pour afficher, ajouter, modifier ou supprimer ses saisies HRM.
      </p>

      {!optionsResponse.success && (
        <DisplayError
          className="mt-4"
          error={`${optionsResponse.message} Les listes de filtres et la consultation nécessitent la permission « read:saisie_hrm » attribuée à votre rôle.`}
        />
      )}

      {filters.search === "1" && !isValidDateOnly(du) && (
        <DisplayError className="mt-4" error="La date sélectionnée est absente ou invalide." />
      )}

      {/* Les filtres et le bouton restent visibles, même avant la sélection d'une date. */}
      <Search
        mode="day"
        typeparcs={options.typeparcs}
        parcs={options.parcs}
        engins={options.engins}
      />

      {!hasSearched && (
        <p className="rounded-md border p-6 text-center text-muted-foreground">
          Choisissez une date puis cliquez sur « Afficher les saisies du jour ». Aucune saisie n'est chargée automatiquement.
        </p>
      )}

      {hasSearched && response && !response.success && (
        <DisplayError className="mt-4" error={response.message} />
      )}

      {hasSearched && response?.success && (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">
                Saisies du {new Date(`${du}T00:00:00.000Z`).toLocaleDateString("fr-FR", { timeZone: "UTC" })}
              </h2>
              <p className="text-sm text-muted-foreground">{saisies.length} saisie(s) trouvée(s).</p>
            </div>
            <CanAccess resource={RESOURCE.SAISIE_HRM} action={ACTION.CREATE}>
              <SaisieHrmForm
                engins={enginsPourAjout}
                sites={options.sites}
                fixedDate={du}
              />
            </CanAccess>
          </div>

          <div className="rounded-md border">
            <Table id="saisie-hrm-jour-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Engin</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>HRM</TableHead>
                  <TableHead>Compteur</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {saisies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      Aucune saisie pour cette journée. Vous pouvez en ajouter une.
                    </TableCell>
                  </TableRow>
                ) : (
                  saisies.map((saisie: any) => (
                    <TableRow key={saisie.id}>
                      <TableCell>{new Date(saisie.du).toLocaleDateString("fr-FR", { timeZone: "UTC" })}</TableCell>
                      <TableCell className="font-medium">{saisie.engin?.name ?? "—"}</TableCell>
                      <TableCell>{saisie.site?.name ?? "—"}</TableCell>
                      <TableCell>{saisie.hrm}</TableCell>
                      <TableCell>{saisie.compteur ?? "—"}</TableCell>
                      <TableCell className="flex justify-end gap-3">
                        <CanAccess resource={RESOURCE.SAISIE_HRM} action={ACTION.UPDATE}>
                          <SaisieHrmForm
                            saisie={{
                              id: saisie.id,
                              du: new Date(saisie.du).toISOString().slice(0, 10),
                              enginId: saisie.enginId,
                              siteId: saisie.siteId,
                              hrm: saisie.hrm,
                              compteur: saisie.compteur,
                            }}
                            engins={options.engins}
                            sites={options.sites}
                            fixedDate={du}
                          />
                        </CanAccess>
                        <CanAccess resource={RESOURCE.SAISIE_HRM} action={ACTION.DELETE}>
                          <DeleteSaisieHrmForm
                            saisie={{
                              id: saisie.id,
                              du: new Date(saisie.du).toISOString().slice(0, 10),
                              engin: saisie.engin?.name ?? "—",
                            }}
                          />
                        </CanAccess>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
