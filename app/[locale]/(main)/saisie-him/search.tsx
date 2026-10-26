"use client";

import {
    useEffect,
    useState,
    useTransition,
    type FormEvent,
} from "react";
import {
    usePathname,
    useRouter,
    useSearchParams,
} from "next/navigation";
import {
    Search as SearchIcon,
    RotateCcw,
} from "lucide-react";

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
    siteId: string;
    parcId: string;
    active: boolean;
};

type PanneOption = Option & {
    parcs: Option[];
};

type Props = {
    typeParcs: Option[];
    parcs: ParcOption[];
    engins: EnginOption[];
    sites: Option[];
    pannes: PanneOption[];
};

export default function Search({
    typeParcs,
    parcs,
    engins,
    sites,
    pannes,
}: Props) {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const router = useRouter();

    const [pending, startTransition] = useTransition();

    const [name, setName] = useState(
        searchParams.get("name") ?? "",
    );

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

    const [panneId, setPanneId] = useState(
        searchParams.get("panneId") ?? "all",
    );

    const [dateDu, setDateDu] = useState(
        searchParams.get("dateDu") ?? "",
    );

    const [dateAu, setDateAu] = useState(
        searchParams.get("dateAu") ?? "",
    );

    const [error, setError] = useState("");

    useEffect(() => {
        setName(searchParams.get("name") ?? "");
        setSiteId(searchParams.get("siteId") ?? "all");
        setTypeparcId(searchParams.get("typeparcId") ?? "all");
        setParcId(searchParams.get("parcId") ?? "all");
        setEnginId(searchParams.get("enginId") ?? "all");
        setPanneId(searchParams.get("panneId") ?? "all");
        setDateDu(searchParams.get("dateDu") ?? "");
        setDateAu(searchParams.get("dateAu") ?? "");
    }, [searchParams]);

    // Filtrer les parcs par type et par site.
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

    // Filtrer les engins par site, type de parc et parc.
    const filteredEngins = engins.filter((engin) => {
        const parc = parcs.find(
            (item) => item.id === engin.parcId,
        );

        const matchesSite =
            siteId === "all" ||
            engin.siteId === siteId;

        const matchesType =
            typeparcId === "all" ||
            parc?.typeparcId === typeparcId;

        const matchesParc =
            parcId === "all" ||
            engin.parcId === parcId;

        return matchesSite && matchesType && matchesParc;
    });

    // Si un parc est choisi, proposer uniquement ses pannes.
    const filteredPannes =
        parcId === "all"
            ? pannes
            : pannes.filter((panne) =>
                panne.parcs.some(
                    (parc) => parc.id === parcId,
                ),
            );

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

        if (name.trim()) {
            params.set("name", name.trim());
        }

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

        if (panneId !== "all") {
            params.set("panneId", panneId);
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
        setName("");
        setSiteId("all");
        setTypeparcId("all");
        setParcId("all");
        setEnginId("all");
        setPanneId("all");
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
                className="my-3 space-y-3 rounded-md border p-3 md:p-4"
            >
                {/* Filtres : même disposition flexible que la page HRM */}
                <div className="flex flex-wrap items-end gap-x-3 gap-y-3 gap-2">
                    {/* Site */}
                    <div className="min-w-45 max-w-65 flex-[1_1_180px] space-y-1">
                        <label htmlFor="him-site" className="text-sm font-medium">
                            Site
                        </label>

                        <Select
                            value={siteId}
                            onValueChange={(value) => {
                                setSiteId(value);
                                setParcId("all");
                                setEnginId("all");
                                setPanneId("all");
                            }}
                            disabled={pending}
                        >
                            <SelectTrigger
                                id="him-site"
                                size="sm"
                                className="w-full min-w-0"
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

                    {/* Type de parc */}
                    <div className="min-w-45 max-w-65 flex-[1_1_180px] space-y-1">
                        <label htmlFor="him-typeparc" className="text-sm font-medium">
                            Type de parc
                        </label>

                        <Select
                            value={typeparcId}
                            onValueChange={(value) => {
                                setTypeparcId(value);
                                setParcId("all");
                                setEnginId("all");
                                setPanneId("all");
                            }}
                            disabled={pending}
                        >
                            <SelectTrigger
                                id="him-typeparc"
                                size="sm"
                                className="w-full min-w-0"
                            >
                                <SelectValue placeholder="Tous les types de parc" />
                            </SelectTrigger>

                            <SelectContent>
                                <SelectItem value="all">Tous les types de parc</SelectItem>

                                {typeParcs.map((typeParc) => (
                                    <SelectItem key={typeParc.id} value={typeParc.id}>
                                        {typeParc.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Parc */}
                    <div className="min-w-45 max-w-65 flex-[1_1_180px] space-y-1">
                        <label htmlFor="him-parc" className="text-sm font-medium">
                            Parc
                        </label>

                        <Select
                            value={parcId}
                            onValueChange={(value) => {
                                setParcId(value);
                                setEnginId("all");
                                setPanneId("all");
                            }}
                            disabled={pending}
                        >
                            <SelectTrigger
                                id="him-parc"
                                size="sm"
                                className="w-full min-w-0"
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

                    {/* Engin */}
                    <div className="min-w-45 max-w-65 flex-[1_1_180px] space-y-1">
                        <label htmlFor="him-engin" className="text-sm font-medium">
                            Engin
                        </label>

                        <Select
                            value={enginId}
                            onValueChange={setEnginId}
                            disabled={pending || filteredEngins.length === 0}
                        >
                            <SelectTrigger
                                id="him-engin"
                                size="sm"
                                className="w-full min-w-0"
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

                    {/* Panne */}
                    <div className="min-w-45 max-w-65 flex-[1_1_180px] space-y-1">
                        <label htmlFor="him-panne" className="text-sm font-medium">
                            Panne
                        </label>

                        <Select
                            value={panneId}
                            onValueChange={setPanneId}
                            disabled={pending || filteredPannes.length === 0}
                        >
                            <SelectTrigger
                                id="him-panne"
                                size="sm"
                                className="w-full min-w-0"
                            >
                                <SelectValue placeholder="Toutes les pannes" />
                            </SelectTrigger>

                            <SelectContent>
                                <SelectItem value="all">Toutes les pannes</SelectItem>

                                {filteredPannes.map((panne) => (
                                    <SelectItem key={panne.id} value={panne.id}>
                                        {panne.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Recherche par panne ou engin */}
                    <div className="min-w-45 max-w-65 flex-[1_1_180px] space-y-1">
                        <label htmlFor="him-name" className="text-sm font-medium">
                            Recherche
                        </label>

                        <Input
                            id="him-name"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            placeholder="Panne ou engin..."
                            className="h-8 w-full"
                            disabled={pending}
                        />
                    </div>
                </div>

                {/* Dates : retour à la ligne et espacement identiques à HRM */}
                <div className="flex flex-wrap items-end gap-x-4 gap-y-3 gap-2">
                    <div className="min-w-45 max-w-65 flex-[1_1_180px] space-y-1">
                        <label htmlFor="him-date-du" className="text-sm font-medium">
                            Date de début
                        </label>

                        <Input
                            id="him-date-du"
                            type="date"
                            value={dateDu}
                            max={dateAu || undefined}
                            onChange={(event) => setDateDu(event.target.value)}
                            disabled={pending}
                        />
                    </div>

                    <div className="min-w-45 max-w-65 flex-[1_1_180px] space-y-1">
                        <label htmlFor="him-date-au" className="text-sm font-medium">
                            Date de fin
                        </label>

                        <Input
                            id="him-date-au"
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

                {/* Boutons : wrap identique à HRM */}
                <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={pending}>
                        <SearchIcon className="size-4" />
                        Afficher les saisies HIM
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