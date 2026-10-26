"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search as SearchIcon, RotateCcw } from "lucide-react";

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

type Option = {
  id: string;
  name: string;
};

type ParcOption = Option & {
  typeparcId: string;
};

type EnginOption = Option & {
  parcId: string;
  siteId: string;
  active: boolean;
};

type Props = {
  typeParcs: Option[];
  parcs: ParcOption[];
  engins: EnginOption[];
  sites: Option[];
};

export default function Search({
  typeParcs,
  parcs,
  engins,
  sites,
}: Props) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const [pending, startTransition] = useTransition();

  const [siteId, setSiteId] = useState(
    searchParams.get("siteId") ?? "all",
  );
  const [typeparcId, setTypeparcId] = useState(
    searchParams.get("typeparcId") ?? "all",
  );
  const [parcId, setParcId] = useState(
    searchParams.get("parcId") ?? "all",
  );
  const [enginId, setEnginId] = useState(
    searchParams.get("enginId") ?? "all",
  );

  const [dateDu, setDateDu] = useState(
    searchParams.get("dateDu") ?? "",
  );
  const [dateAu, setDateAu] = useState(
    searchParams.get("dateAu") ?? "",
  );
  const [error, setError] = useState("");

  useEffect(() => {
    setSiteId(searchParams.get("siteId") ?? "all");
    setTypeparcId(searchParams.get("typeparcId") ?? "all");
    setParcId(searchParams.get("parcId") ?? "all");
    setEnginId(searchParams.get("enginId") ?? "all");
    setDateDu(searchParams.get("dateDu") ?? "");
    setDateAu(searchParams.get("dateAu") ?? "");
  }, [searchParams]);

  // Les parcs doivent correspondre au type sélectionné
  // et disposer d'engins du site choisi, s'il y en a un.
  const filteredParcs = parcs.filter((parc) => {
    const matchesType =
      typeparcId === "all" ||
      parc.typeparcId === typeparcId;

    const matchesSite =
      siteId === "all" ||
      engins.some(
        (engin) =>
          engin.parcId === parc.id &&
          engin.siteId === siteId,
      );

    return matchesType && matchesSite;
  });

  // Croisement des filtres Site, Type de parc et Parc.
  const filteredEngins = engins.filter((engin) => {
    const parc = parcs.find(
      (item) => item.id === engin.parcId,
    );

    const matchesSite =
      siteId === "all" || engin.siteId === siteId;

    const matchesType =
      typeparcId === "all" ||
      parc?.typeparcId === typeparcId;

    const matchesParc =
      parcId === "all" || engin.parcId === parcId;

    return matchesSite && matchesType && matchesParc;
  });

  function applySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (dateDu && dateAu && dateDu > dateAu) {
      setError(
        "La date de début doit être antérieure ou égale à la date de fin.",
      );
      return;
    }

    const params = new URLSearchParams();
    params.set("search", "1");

    if (siteId !== "all") {
      params.set("siteId", siteId);
    }

    if (typeparcId !== "all") {
      params.set("typeparcId", typeparcId);
    }

    if (parcId !== "all") {
      params.set("parcId", parcId);
    }

    if (enginId !== "all") {
      params.set("enginId", enginId);
    }

    if (dateDu) {
      params.set("dateDu", dateDu);
    }

    if (dateAu) {
      params.set("dateAu", dateAu);
    }

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  function clearFilters() {
    setSiteId("all");
    setTypeparcId("all");
    setParcId("all");
    setEnginId("all");
    setDateDu("");
    setDateAu("");
    setError("");

    startTransition(() => {
      router.replace(pathname);
    });
  }

  return (
    <>
      <GlobalLoader show={pending} />

      <form
        onSubmit={applySearch}
        className="my-4 space-y-4 rounded-md border p-4"
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1">
            <label
              htmlFor="hrm-site"
              className="text-sm font-medium"
            >
              Site
            </label>

            <Select
              value={siteId}
              onValueChange={(value) => {
                setSiteId(value);
                setParcId("all");
                setEnginId("all");
              }}
              disabled={pending}
            >
              <SelectTrigger
                id="hrm-site"
                className="w-full"
              >
                <SelectValue placeholder="Tous les sites" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">Tous les sites</SelectItem>

                {sites.map((site) => (
                  <SelectItem key={site.id} value={site.id}>
                    {site.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="hrm-typeparc"
              className="text-sm font-medium"
            >
              Type de parc
            </label>

            <Select
              value={typeparcId}
              onValueChange={(value) => {
                setTypeparcId(value);
                setParcId("all");
                setEnginId("all");
              }}
              disabled={pending}
            >
              <SelectTrigger
                id="hrm-typeparc"
                className="w-full"
              >
                <SelectValue placeholder="Tous les types de parc" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">
                  Tous les types de parc
                </SelectItem>

                {typeParcs.map((typeParc) => (
                  <SelectItem
                    key={typeParc.id}
                    value={typeParc.id}
                  >
                    {typeParc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="hrm-parc"
              className="text-sm font-medium"
            >
              Parc
            </label>

            <Select
              value={parcId}
              onValueChange={(value) => {
                setParcId(value);
                setEnginId("all");
              }}
              disabled={pending}
            >
              <SelectTrigger
                id="hrm-parc"
                className="w-full"
              >
                <SelectValue placeholder="Tous les parcs" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">Tous les parcs</SelectItem>

                {filteredParcs.map((parc) => (
                  <SelectItem key={parc.id} value={parc.id}>
                    {parc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="hrm-engin"
              className="text-sm font-medium"
            >
              Engin
            </label>

            <Select
              value={enginId}
              onValueChange={setEnginId}
              disabled={pending}
            >
              <SelectTrigger
                id="hrm-engin"
                className="w-full"
              >
                <SelectValue placeholder="Tous les engins" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">Tous les engins</SelectItem>

                {filteredEngins.map((engin) => (
                  <SelectItem key={engin.id} value={engin.id}>
                    {engin.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label
              htmlFor="hrm-date-du"
              className="text-sm font-medium"
            >
              Date de début
            </label>

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
            <label
              htmlFor="hrm-date-au"
              className="text-sm font-medium"
            >
              Date de fin
            </label>

            <Input
              id="hrm-date-au"
              type="date"
              value={dateAu}
              min={dateDu || undefined}
              onChange={(event) => setDateAu(event.target.value)}
              disabled={pending}
            />
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending}>
            <SearchIcon className="size-4" />
            Afficher les saisies
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={clearFilters}
            disabled={pending}
          >
            <RotateCcw className="size-4" />
            Réinitialiser
          </Button>
        </div>
      </form>
    </>
  );
}