// app/(main)/[tenantId]/sites/pagination.tsx
'use client';

import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
    totalPages: number;
    currentPage: number;
    totalItems?: number;      // 👈 optionnel mais utile pour l'affichage
    itemsPerPage?: number;    // 👈 valeur actuelle
    perPageOptions?: number[]; // 👈 options proposées
}

export default function Pagination({
    totalPages,
    currentPage,
    totalItems,
    itemsPerPage = 10,
    perPageOptions = [5, 10, 20, 50, 100],
}: PaginationProps) {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { replace } = useRouter();

    const handlePageChange = (pageNumber: number) => {
        const params = new URLSearchParams(searchParams);
        params.set('page', pageNumber.toString());
        replace(`${pathname}?${params.toString()}`);
    };

    const handlePerPageChange = (value: string) => {
        const params = new URLSearchParams(searchParams);
        params.set('perPage', value);
        params.set('page', '1'); // 👈 reset à la page 1 quand on change le nombre
        replace(`${pathname}?${params.toString()}`);
    };

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
            {/* Sélecteur items par page */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Lignes par page</span>
                <Select
                    value={itemsPerPage.toString()}
                    onValueChange={handlePerPageChange}
                >
                    <SelectTrigger className="h-8 w-20 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {perPageOptions.map((option) => (
                            <SelectItem key={option} value={option.toString()} className="text-xs">
                                {option}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {typeof totalItems === 'number' && (
                    <span className="text-xs">({totalItems} résultats)</span>
                )}
            </div>

            {/* Navigation pages */}
            <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                    Page {currentPage} sur {Math.max(totalPages, 1)}
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-9 px-2.5 text-xs"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage <= 1}
                    >
                        <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                        Précédent
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-9 px-2.5 text-xs"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                    >
                        Suivant
                        <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                </div>
            </div>
        </div>
    );
}