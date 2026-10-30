"use client";

import {
    useSearchParams,
    usePathname,
    useRouter,
} from "next/navigation";

import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import {
    ChevronLeft,
    ChevronRight,
} from "lucide-react";

import { PAGINATION_SETTINGS } from "@/lib/constantes";
import { JSX } from "react/jsx-runtime";

interface PaginationProps {
    totalPages: number;
    currentPage: number;
    totalItems?: number;
    itemsPerPage?: number;
    perPageOptions?: number[];
}

export default function Pagination({
    totalPages,
    currentPage,
    totalItems,
    itemsPerPage = PAGINATION_SETTINGS.itemsPerPage,
    perPageOptions = PAGINATION_SETTINGS.perPageOptions,
}: PaginationProps): JSX.Element {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { replace } = useRouter();

    // "Tout afficher" est sélectionné lorsque la taille de page
    // couvre la totalité des résultats disponibles.
    const isShowingAll =
        typeof totalItems === "number" &&
        totalItems > 0 &&
        itemsPerPage >= totalItems;

    function handlePageChange(pageNumber: number): void {
        const params = new URLSearchParams(searchParams.toString());

        params.set("currentPage", String(pageNumber));

        replace(`${pathname}?${params.toString()}`);
    }

    function handlePerPageChange(value: string): void {
        const params = new URLSearchParams(searchParams.toString());

        if (value === "all") {
            // Utiliser le nombre réel de résultats plutôt que 0,
            // afin de rester compatible avec les actions serveur existantes.
            const pageSize = Math.max(totalItems ?? itemsPerPage, 1);

            params.set("itemsPerPage", String(pageSize));
        } else {
            params.set("itemsPerPage", value);
        }

        // Revenir à la première page après le changement.
        params.set("currentPage", "1");

        replace(`${pathname}?${params.toString()}`);
    }

    return (
        <div className="flex flex-col items-center justify-between gap-4 py-4 sm:flex-row">
            {/* Nombre de lignes par page */}
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>Lignes par page</span>

                <Select
                    value={
                        isShowingAll
                            ? "all"
                            : String(itemsPerPage)
                    }
                    onValueChange={handlePerPageChange}
                >
                    <SelectTrigger className="h-8 w-32.5 text-xs">
                        <SelectValue placeholder="Lignes par page" />
                    </SelectTrigger>

                    <SelectContent>
                        {perPageOptions.map((option) => (
                            <SelectItem
                                key={option}
                                value={String(option)}
                                className="text-xs"
                            >
                                {option}
                            </SelectItem>
                        ))}

                        {typeof totalItems === "number" && totalItems > 0 && (
                            <SelectItem value="all" className="text-xs">
                                Tout afficher
                            </SelectItem>
                        )}
                    </SelectContent>
                </Select>

                {typeof totalItems === "number" && (
                    <span className="text-xs">
                        ({totalItems} résultat{totalItems > 1 ? "s" : ""})
                    </span>
                )}
            </div>

            {/* Navigation entre les pages */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="text-sm text-muted-foreground">
                    Page {currentPage} sur {Math.max(totalPages, 1)}
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 px-2.5 text-xs"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage <= 1 || isShowingAll}
                    >
                        <ChevronLeft className="mr-1 h-3.5 w-3.5" />
                        Précédent
                    </Button>

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 px-2.5 text-xs"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={
                            currentPage >= Math.max(totalPages, 1) ||
                            isShowingAll
                        }
                    >
                        Suivant
                        <ChevronRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>
        </div>
    );
}