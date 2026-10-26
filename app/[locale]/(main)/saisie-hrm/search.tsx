"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search as SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GlobalLoader } from "@/components/global-loader";

 type Option = { id: string; name: string };
 type ParcOption = Option & { typeparcId: string };
 type EnginOption = Option & { parcId: string; siteId: string };

type Props = {
  mode: "list" | "day";
  typeparcs: Option[];
  parcs: ParcOption[];
  engins: EnginOption[];
};

export default function Search({ mode, typeparcs, parcs, engins }: Props) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [typeparcId, setTypeparcId] = useState(searchParams.get("typeparcId") ?? "all");
  const [parcId, setParcId] = useState(searchParams.get("parcId") ?? "all");
  const [enginId, setEnginId] = useState(searchParams.get("enginId") ?? "all");
  const [du, setDu] = useState(searchParams.get("du") ?? "");
  const [dateDu, setDateDu] = useState(searchParams.get("dateDu") ?? "");
  const [dateAu, setDateAu] = useState(searchParams.get("dateAu") ?? "");
  const [error, setError] = useState("");

  useEffect(() => {
    setTypeparcId(searchParams.get("typeparcId") ?? "all");
    setParcId(searchParams.get("parcId") ?? "all");
    setEnginId(searchParams.get("enginId") ?? "all");
    setDu(searchParams.get("du") ?? "");
    setDateDu(searchParams.get("dateDu") ?? "");
    setDateAu(searchParams.get("dateAu") ?? "");
  }, [searchParams]);

  // Les parcs sont filtrés par le type choisi.
  const filteredParcs = typeparcId === "all"
    ? []
    : parcs.filter((parc) => parc.typeparcId === typeparcId);

  // Les engins sont filtrés par le type, puis éventuellement par le parc choisi.
  const filteredEngins = engins.filter((engin) => {
    const parc = parcs.find((item) => item.id === engin.parcId);
    const matchesType = typeparcId !== "all" && parc?.typeparcId === typeparcId;
    const matchesParc = parcId === "all" || engin.parcId === parcId;
    return matchesType && matchesParc;
  });

  function applySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (mode === "day" && !du) {
      setError("Sélectionnez une date précise avant d'afficher les saisies.");
      return;
    }

    if (mode === "list" && dateDu && dateAu && dateDu > dateAu) {
      setError("La date de début doit être antérieure ou égale à la date de fin.");
      return;
    }

    const params = new URLSearchParams();
    params.set("search", "1");

    if (typeparcId !== "all") params.set("typeparcId", typeparcId);
    if (parcId !== "all") params.set("parcId", parcId);
    if (enginId !== "all") params.set("enginId", enginId);

    if (mode === "day") {
      params.set("du", du);
    } else {
      if (dateDu) params.set("dateDu", dateDu);
      if (dateAu) params.set("dateAu", dateAu);
    }

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <>
      <GlobalLoader show={pending} />
      <form onSubmit={applySearch} className="my-4 space-y-4 rounded-md border p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <label htmlFor={`${mode}-typeparc`} className="text-sm font-medium">Type de parc</label>
            <Select
              value={typeparcId}
              onValueChange={(value) => {
                setTypeparcId(value);
                setParcId("all");
                setEnginId("all");
              }}
              disabled={pending}
            >
              <SelectTrigger id={`${mode}-typeparc`} className="w-full">
                <SelectValue placeholder="Sélectionner un type de parc" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types de parc</SelectItem>
                {typeparcs.map((item) => (
                  <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label htmlFor={`${mode}-parc`} className="text-sm font-medium">Parc</label>
            <Select
              value={parcId}
              onValueChange={(value) => {
                setParcId(value);
                setEnginId("all");
              }}
              disabled={pending || typeparcId === "all" || filteredParcs.length === 0}
            >
              <SelectTrigger id={`${mode}-parc`} className="w-full">
                <SelectValue placeholder="Sélectionner un parc" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les parcs de ce type</SelectItem>
                {filteredParcs.map((item) => (
                  <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label htmlFor={`${mode}-engin`} className="text-sm font-medium">Engin</label>
            <Select
              value={enginId}
              onValueChange={setEnginId}
              disabled={pending || typeparcId === "all" || filteredEngins.length === 0}
            >
              <SelectTrigger id={`${mode}-engin`} className="w-full">
                <SelectValue placeholder="Sélectionner un engin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les engins correspondants</SelectItem>
                {filteredEngins.map((item) => (
                  <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {mode === "day" ? (
          <div className="max-w-sm space-y-1">
            <label htmlFor="hrm-day" className="text-sm font-medium">Date précise</label>
            <Input
              id="hrm-day"
              type="date"
              required
              value={du}
              onChange={(event) => setDu(event.target.value)}
              disabled={pending}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="hrm-date-du" className="text-sm font-medium">Date de début</label>
              <Input
                id="hrm-date-du"
                type="date"
                value={dateDu}
                max={dateAu || undefined}
                onChange={(event) => setDateDu(event.target.value)}
                disabled={pending}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="hrm-date-au" className="text-sm font-medium">Date de fin</label>
              <Input
                id="hrm-date-au"
                type="date"
                min={dateDu || undefined}
                value={dateAu}
                onChange={(event) => setDateAu(event.target.value)}
                disabled={pending}
              />
            </div>
          </div>
        )}

        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending}>
            <SearchIcon className="size-4" />
            {mode === "day" ? "Afficher les saisies du jour" : "Afficher les saisies"}
          </Button>
        </div>
      </form>
    </>
  );
}
