// components/Filters.tsx
'use client';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
import { useEffect, useState } from 'react';

export default function Filters() {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { replace } = useRouter();

    // État local pour l'input (nécessaire pour le bouton X)
    const [search, setSearch] = useState(searchParams.get('name') ?? '');

    // Sync si l'URL change (reset global, navigation retour, etc.)
    useEffect(() => {
        setSearch(searchParams.get('name') ?? '');
    }, [searchParams]);

    const handleFilterChange = useDebouncedCallback((key: string, value: string) => {
        const params = new URLSearchParams(searchParams);

        if (value) {
            params.set(key, value);
        } else {
            params.delete(key);
        }

        replace(`${pathname}?${params.toString()}`);
    }, 300);

    // Effacement immédiat (sans debounce)
    const clearSearch = () => {
        setSearch('');
        const params = new URLSearchParams(searchParams);
        params.delete('name');
        replace(`${pathname}?${params.toString()}`);
    };

    return (
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:gap-4 mb-5">
            {/* Recherche par nom */}
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    type="text"
                    placeholder="Rechercher par nom ou email..."
                    className="pl-9 pr-9"
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        handleFilterChange('name', e.target.value);
                    }}
                />
                {search && (
                    <button
                        type="button"
                        onClick={clearSearch}
                        aria-label="Effacer la recherche"
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            {/* Filtre par statut */}
            <Select
                onValueChange={(value) =>
                    handleFilterChange('active', value === 'all' ? '' : value)
                }
                defaultValue={searchParams.get('active')?.toString() || 'all'}
            >
                <SelectTrigger className="w-full sm:w-45">
                    <SelectValue placeholder="Filtrer par statut" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="active">Actif</SelectItem>
                    <SelectItem value="inactive">Inactif</SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
}