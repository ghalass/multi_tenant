"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { GlobalLoader } from "@/components/global-loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TypeParcParetoOption } from "@/server/rapports/rapport_pareto";
import type { EvolutionSpecificiteLubrifiantOptions } from "@/server/rapports/rapport-evolution-specificite-lubrifiants";

export default function SelectParams({
  typeParcs,
  typeLubrifiants,
}: {
  typeParcs: TypeParcParetoOption[];
  typeLubrifiants: EvolutionSpecificiteLubrifiantOptions;
}): React.JSX.Element {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [generating, startGenerateTransition] = useTransition();
  const [annee, setAnnee] = useState(
    searchParams.get("annee") ?? String(new Date().getFullYear()),
  );
  const [typeParcId, setTypeParcId] = useState(searchParams.get("typeParcId") ?? "");
  const [parcId, setParcId] = useState(searchParams.get("parcId") ?? "");
  const [siteId, setSiteId] = useState(searchParams.get("siteId") ?? "");
  const [enginId, setEnginId] = useState(searchParams.get("enginId") ?? "");
  const [typeLubrifiantId, setTypeLubrifiantId] = useState(searchParams.get("typeLubrifiantId") ?? "");
  const [lubrifiantId, setLubrifiantId] = useState(searchParams.get("lubrifiantId") ?? "");

  const parcs = typeParcs.find((item) => item.id === typeParcId)?.parcs ?? [];
  const selectedParc = parcs.find((item) => item.id === parcId);
  const sites = selectedParc
    ? Array.from(new Map(selectedParc.engins.map((engin) => [
        engin.siteId,
        { id: engin.siteId, name: engin.siteName },
      ])).values()).sort((a, b) => a.name.localeCompare(b.name, "fr", { numeric: true }))
    : [];
  const engins = selectedParc && siteId
    ? selectedParc.engins
        .filter((engin) => engin.siteId === siteId)
        .sort((a, b) => a.name.localeCompare(b.name, "fr", { numeric: true }))
    : [];
  const lubrifiants = typeLubrifiants.find((item) => item.id === typeLubrifiantId)?.lubrifiants ?? [];

  function clearReport(): void {
    const params = new URLSearchParams(searchParams.toString());
    ["annee", "typeParcId", "parcId", "siteId", "enginId", "typeLubrifiantId", "lubrifiantId"].forEach((key) => params.delete(key));
    const query = params.toString();
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }));
  }

  function generate(): void {
    const year = Number(annee);
    if (!Number.isInteger(year) || year < 2000 || year > 9999 || !typeParcId || !parcId) return;
    if (enginId && (!siteId || !engins.some((item) => item.id === enginId))) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("annee", String(year));
    params.set("typeParcId", typeParcId);
    params.set("parcId", parcId);
    if (siteId) params.set("siteId", siteId);
    else params.delete("siteId");
    if (enginId) params.set("enginId", enginId);
    else params.delete("enginId");
    if (typeLubrifiantId) params.set("typeLubrifiantId", typeLubrifiantId);
    else params.delete("typeLubrifiantId");
    if (lubrifiantId) params.set("lubrifiantId", lubrifiantId);
    else params.delete("lubrifiantId");
    startGenerateTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
  }

  return (
    <>
      <GlobalLoader show={generating} />
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div className="grid w-full gap-2 sm:w-36">
          <Label htmlFor="evolution-specificite-annee">Année</Label>
          <Input
            id="evolution-specificite-annee"
            type="number"
            min={2000}
            max={9999}
            value={annee}
            onChange={(event) => setAnnee(event.target.value)}
            disabled={pending}
          />
        </div>
        <div className="grid w-full gap-2 sm:w-56">
          <Label>Type de parc</Label>
          <Select
            value={typeParcId}
            onValueChange={(value) => {
              setTypeParcId(value);
              setParcId("");
              setSiteId("");
              setEnginId("");
              clearReport();
            }}
            disabled={pending || typeParcs.length === 0}
          >
            <SelectTrigger><SelectValue placeholder="Choisir un type de parc" /></SelectTrigger>
            <SelectContent>
              {typeParcs.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid w-full gap-2 sm:w-56">
          <Label>Parc</Label>
          <Select
            value={parcId}
            onValueChange={(value) => {
              setParcId(value);
              setSiteId("");
              setEnginId("");
              clearReport();
            }}
            disabled={pending || !typeParcId || parcs.length === 0}
          >
            <SelectTrigger><SelectValue placeholder="Choisir un parc" /></SelectTrigger>
            <SelectContent>
              {parcs.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid w-full gap-2 sm:w-56">
          <Label>Site</Label>
          <Select
            value={siteId || "all"}
            onValueChange={(value) => {
              setSiteId(value === "all" ? "" : value);
              setEnginId("");
              clearReport();
            }}
            disabled={pending || !selectedParc || sites.length === 0}
          >
            <SelectTrigger><SelectValue placeholder="Tous les sites" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les sites</SelectItem>
              {sites.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid w-full gap-2 sm:w-56">
          <Label>Engin</Label>
          <Select
            value={enginId || "all"}
            onValueChange={(value) => {
              setEnginId(value === "all" ? "" : value);
              clearReport();
            }}
            disabled={pending || !siteId || engins.length === 0}
          >
            <SelectTrigger><SelectValue placeholder="Tous les engins" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les engins</SelectItem>
              {engins.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid w-full gap-2 sm:w-56">
          <Label>Type de lubrifiant</Label>
          <Select
            value={typeLubrifiantId || "all"}
            onValueChange={(value) => {
              setTypeLubrifiantId(value === "all" ? "" : value);
              setLubrifiantId("");
              clearReport();
            }}
            disabled={pending || typeLubrifiants.length === 0}
          >
            <SelectTrigger><SelectValue placeholder="Tous les types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              {typeLubrifiants.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid w-full gap-2 sm:w-56">
          <Label>Lubrifiant</Label>
          <Select
            value={lubrifiantId || "all"}
            onValueChange={(value) => {
              setLubrifiantId(value === "all" ? "" : value);
              clearReport();
            }}
            disabled={pending || !typeLubrifiantId || lubrifiants.length === 0}
          >
            <SelectTrigger><SelectValue placeholder="Tous les lubrifiants" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les lubrifiants</SelectItem>
              {lubrifiants.map((item) => (
                <SelectItem key={item.id} value={item.id}>{item.code} — {item.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          onClick={generate}
          disabled={pending || generating || !Number.isInteger(Number(annee)) || Number(annee) < 2000 || Number(annee) > 9999 || !typeParcId || !parcId}
        >
          Générer le rapport
        </Button>
      </div>
    </>
  );
}
