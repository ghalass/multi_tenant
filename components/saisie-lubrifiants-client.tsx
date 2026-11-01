"use client";

import { useState, useTransition, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Droplet, Pencil, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import { ExportExcel } from "@/components/export-excel";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { GlobalLoader } from "@/components/global-loader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createSaisieLubrifiant,
  deleteSaisieLubrifiant,
  updateSaisieLubrifiant,
  type SaisieLubrifiantInput,
  type SaisieLubrifiantItem,
  type SaisieLubrifiantOptions,
} from "@/server/saisie-lubrifiants";

type Props = {
  items: SaisieLubrifiantItem[];
  options: SaisieLubrifiantOptions;
  hasSearched: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canExport: boolean;
  error?: string;
};

const EMPTY_FORM: SaisieLubrifiantInput = {
  du: "",
  au: "",
  section: "",
  imputation: "",
  qte: 0,
  enginId: "",
  lubrifiantId: "",
};

function dateInputValue(value: Date): string {
  return new Date(value).toISOString().slice(0, 10);
}

export default function SaisieLubrifiantsClient({
  items,
  options,
  hasSearched,
  canCreate,
  canUpdate,
  canDelete,
  canExport,
  error,
}: Props): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [siteId, setSiteId] = useState(searchParams.get("siteId") ?? "all");
  const [typeParcId, setTypeParcId] = useState(searchParams.get("typeParcId") ?? "all");
  const [parcId, setParcId] = useState(searchParams.get("parcId") ?? "all");
  const [enginId, setEnginId] = useState(searchParams.get("enginId") ?? "all");
  const [typeLubrifiantId, setTypeLubrifiantId] = useState(searchParams.get("typeLubrifiantId") ?? "all");
  const [lubrifiantId, setLubrifiantId] = useState(searchParams.get("lubrifiantId") ?? "all");
  const [dateDu, setDateDu] = useState(searchParams.get("dateDu") ?? "");
  const [dateAu, setDateAu] = useState(searchParams.get("dateAu") ?? "");
  const [section, setSection] = useState(searchParams.get("section") ?? "");
  const [imputation, setImputation] = useState(searchParams.get("imputation") ?? "");
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [filterError, setFilterError] = useState("");
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<SaisieLubrifiantItem | null>(null);
  const [form, setForm] = useState<SaisieLubrifiantInput>(EMPTY_FORM);
  const [message, setMessage] = useState("");

  const engin = options.engins.find((item) => item.id === form.enginId);
  const allowedLubrifiants = engin
    ? options.lubrifiants.filter((item) => item.parcs.some((parc) => parc.parcId === engin.parc.id))
    : [];
  function openForm(item?: SaisieLubrifiantItem): void {
    setSelected(item ?? null);
    setForm(item ? {
      du: dateInputValue(item.du),
      au: dateInputValue(item.au),
      section: item.section,
      imputation: item.imputation,
      qte: item.qte,
      enginId: item.engin.id,
      lubrifiantId: item.lubrifiant.id,
    } : EMPTY_FORM);
    setMessage("");
    setOpen(true);
  }

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    startTransition(async () => {
      const result = selected
        ? await updateSaisieLubrifiant(selected.id, form)
        : await createSaisieLubrifiant(form);
      setMessage(result.message);
      if (result.success) {
        setOpen(false);
        router.refresh();
      }
    });
  }

  function confirmDelete(): void {
    if (!selected) return;
    startTransition(async () => {
      const result = await deleteSaisieLubrifiant(selected.id);
      setMessage(result.message);
      setDeleteOpen(false);
      setSelected(null);
      router.refresh();
    });
  }

  const filteredParcs = options.parcs.filter((parc) => {
    const matchesType = typeParcId === "all" || parc.typeparcId === typeParcId;
    const matchesSite = siteId === "all" || options.engins.some(
      (item) => item.parc.id === parc.id && item.siteId === siteId,
    );
    return matchesType && matchesSite;
  });
  const filteredEngins = options.engins.filter((item) =>
    (siteId === "all" || item.siteId === siteId) &&
    (typeParcId === "all" || item.parc.typeparc.id === typeParcId) &&
    (parcId === "all" || item.parc.id === parcId),
  );
  const filteredLubrifiants = options.lubrifiants.filter((item) =>
    (typeLubrifiantId === "all" || item.typeLubrifiant.id === typeLubrifiantId) &&
    (parcId === "all" || item.parcs.some((parc) => parc.parcId === parcId)),
  );

  function applySearch(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setFilterError("");
    if (dateDu && dateAu && dateDu > dateAu) {
      setFilterError("La date de début doit être antérieure ou égale à la date de fin.");
      return;
    }

    const params = new URLSearchParams({ search: "1" });
    const selectedFilters: Record<string, string> = {
      siteId,
      typeParcId,
      parcId,
      enginId,
      typeLubrifiantId,
      lubrifiantId,
      dateDu,
      dateAu,
      section: section.trim(),
      imputation: imputation.trim(),
      q: search.trim(),
    };
    for (const [key, value] of Object.entries(selectedFilters)) {
      if (value && value !== "all") params.set(key, value);
    }

    startTransition(() => router.replace(
      `${pathname}?${params.toString()}`,
      { scroll: false },
    ));
  }

  function clearFilters(): void {
    setSiteId("all");
    setTypeParcId("all");
    setParcId("all");
    setEnginId("all");
    setTypeLubrifiantId("all");
    setLubrifiantId("all");
    setDateDu("");
    setDateAu("");
    setSection("");
    setImputation("");
    setSearch("");
    setFilterError("");
    startTransition(() => router.replace(pathname, { scroll: false }));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Droplet className="size-8" />
            Saisies des consommations de lubrifiants
          </h1>
          <p className="mt-1 text-muted-foreground">
            Les périodes sont indépendantes des saisies HRM et HIM.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasSearched && canExport && <ExportExcel tableName="saisie-lubrifiants-table" fileName="Saisies_lubrifiants" />}
          {canCreate && (
            <Button type="button" onClick={() => openForm()}>
              <Plus aria-hidden="true" />
              Nouvelle saisie
            </Button>
          )}
        </div>
      </div>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {message && <Alert><AlertDescription>{message}</AlertDescription></Alert>}

      <GlobalLoader show={pending} />
      <form onSubmit={applySearch} className="space-y-3 rounded-md border p-3 md:p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-45 max-w-65 flex-[1_1_180px] space-y-1 text-sm font-medium">
            Site
            <Select value={siteId} onValueChange={(value) => { setSiteId(value); setParcId("all"); setEnginId("all"); }} disabled={pending}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Tous les sites" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les sites</SelectItem>
                {options.sites.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </label>
          <label className="min-w-45 max-w-65 flex-[1_1_180px] space-y-1 text-sm font-medium">
            Type de parc
            <Select value={typeParcId} onValueChange={(value) => { setTypeParcId(value); setParcId("all"); setEnginId("all"); }} disabled={pending}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Tous les types de parc" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types de parc</SelectItem>
                {options.typeParcs.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </label>
          <label className="min-w-45 max-w-65 flex-[1_1_180px] space-y-1 text-sm font-medium">
            Parc
            <Select value={parcId} onValueChange={(value) => { setParcId(value); setEnginId("all"); }} disabled={pending}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Tous les parcs" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les parcs</SelectItem>
                {filteredParcs.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </label>
          <label className="min-w-45 max-w-65 flex-[1_1_180px] space-y-1 text-sm font-medium">
            Engin
            <Select value={enginId} onValueChange={setEnginId} disabled={pending}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Tous les engins" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les engins</SelectItem>
                {filteredEngins.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </label>
          <label className="min-w-45 max-w-65 flex-[1_1_180px] space-y-1 text-sm font-medium">
            Type de lubrifiant
            <Select value={typeLubrifiantId} onValueChange={(value) => { setTypeLubrifiantId(value); setLubrifiantId("all"); }} disabled={pending}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Tous les types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {[...new Map(options.lubrifiants.map((item) => [item.typeLubrifiant.id, item.typeLubrifiant])).values()]
                  .map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </label>
          <label className="min-w-45 max-w-65 flex-[1_1_180px] space-y-1 text-sm font-medium">
            Lubrifiant
            <Select value={lubrifiantId} onValueChange={setLubrifiantId} disabled={pending}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Tous les lubrifiants" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les lubrifiants</SelectItem>
                {filteredLubrifiants.map((item) => <SelectItem key={item.id} value={item.id}>{item.code} — {item.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </label>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-45 max-w-65 flex-[1_1_180px] space-y-1 text-sm font-medium">
            Date de début
            <Input type="date" value={dateDu} max={dateAu || undefined} onChange={(event) => setDateDu(event.target.value)} disabled={pending} />
          </label>
          <label className="min-w-45 max-w-65 flex-[1_1_180px] space-y-1 text-sm font-medium">
            Date de fin
            <Input type="date" value={dateAu} min={dateDu || undefined} onChange={(event) => setDateAu(event.target.value)} disabled={pending} />
          </label>
          <label className="min-w-45 max-w-65 flex-[1_1_180px] space-y-1 text-sm font-medium">
            Section
            <Input value={section} onChange={(event) => setSection(event.target.value)} placeholder="Toutes les sections" disabled={pending} />
          </label>
          <label className="min-w-45 max-w-65 flex-[1_1_180px] space-y-1 text-sm font-medium">
            Imputation
            <Input value={imputation} onChange={(event) => setImputation(event.target.value)} placeholder="Toutes les imputations" disabled={pending} />
          </label>
          <label className="min-w-45 max-w-65 flex-[1_1_180px] space-y-1 text-sm font-medium">
            Recherche
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Engin, code ou lubrifiant…" className="pl-9" disabled={pending} />
            </div>
          </label>
        </div>
        {filterError && <p role="alert" className="text-sm text-destructive">{filterError}</p>}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending}><Search className="size-4" />Afficher les saisies</Button>
          <Button type="button" variant="outline" onClick={clearFilters} disabled={pending}><RotateCcw className="size-4" />Réinitialiser</Button>
        </div>
      </form>

      {!hasSearched ? (
        <p className="rounded-md border p-6 text-center text-muted-foreground">
          Choisissez éventuellement une période et des filtres, puis cliquez sur « Afficher les saisies ».
          Aucune saisie n&apos;est chargée au premier affichage.
        </p>
      ) : (
      <div className="rounded-md border">
        <Table id="saisie-lubrifiants-table">
          <TableHeader>
            <TableRow>
              <TableHead>Période</TableHead>
              <TableHead>Section / imputation</TableHead>
              <TableHead>Code et lubrifiant</TableHead>
              <TableHead>Désignation</TableHead>
              <TableHead>Engin / parc</TableHead>
              <TableHead className="text-right">Quantité</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="h-24 text-center">Aucune saisie lubrifiant trouvée.</TableCell></TableRow>
            ) : items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{dateInputValue(item.du)} – {dateInputValue(item.au)}</TableCell>
                <TableCell>{item.section}<br /><span className="text-muted-foreground">{item.imputation}</span></TableCell>
                <TableCell>{item.lubrifiant.code}<br /><span className="font-medium">{item.lubrifiant.name}</span></TableCell>
                <TableCell>{item.lubrifiant.typeLubrifiant.name}</TableCell>
                <TableCell>{item.engin.name}<br /><span className="text-muted-foreground">{item.engin.parc.name}</span></TableCell>
                <TableCell className="text-right">{item.qte} {item.lubrifiant.unite}</TableCell>
                <TableCell className="flex justify-end gap-2">
                  {canUpdate && (
                    <Button type="button" variant="ghost" size="icon" aria-label="Modifier la saisie" onClick={() => openForm(item)}>
                      <Pencil aria-hidden="true" className="size-4" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button type="button" variant="ghost" size="icon" aria-label="Supprimer la saisie" onClick={() => { setSelected(item); setDeleteOpen(true); }}>
                      <Trash2 aria-hidden="true" className="size-4 text-destructive" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selected ? "Modifier la consommation" : "Saisir une consommation"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">Du<Input type="date" value={form.du} onChange={(event) => setForm({ ...form, du: event.target.value })} required disabled={pending} /></label>
              <label className="grid gap-2 text-sm font-medium">Au<Input type="date" value={form.au} onChange={(event) => setForm({ ...form, au: event.target.value })} required disabled={pending} /></label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">Section<Input value={form.section} onChange={(event) => setForm({ ...form, section: event.target.value })} maxLength={120} required disabled={pending} /></label>
              <label className="grid gap-2 text-sm font-medium">Imputation<Input value={form.imputation} onChange={(event) => setForm({ ...form, imputation: event.target.value })} maxLength={120} required disabled={pending} /></label>
            </div>
            <label className="grid gap-2 text-sm font-medium">
              Engin
              <select className="h-10 rounded-md border bg-background px-3 text-sm" value={form.enginId} onChange={(event) => setForm({ ...form, enginId: event.target.value, lubrifiantId: "" })} required disabled={pending}>
                <option value="">Choisir un engin</option>
                {options.engins.map((item) => <option key={item.id} value={item.id}>{item.name} — {item.parc.name}</option>)}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Lubrifiant
              <select className="h-10 rounded-md border bg-background px-3 text-sm" value={form.lubrifiantId} onChange={(event) => setForm({ ...form, lubrifiantId: event.target.value })} required disabled={pending || !engin}>
                <option value="">Choisir un lubrifiant autorisé pour le parc</option>
                {allowedLubrifiants.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name} ({item.typeLubrifiant.name})</option>)}
              </select>
            </label>
            {form.lubrifiantId && (
              <p className="text-sm text-muted-foreground">
                Unité : {allowedLubrifiants.find((item) => item.id === form.lubrifiantId)?.unite}
              </p>
            )}
            <label className="grid gap-2 text-sm font-medium">Quantité consommée<Input type="number" min="0.000001" step="any" value={form.qte || ""} onChange={(event) => setForm({ ...form, qte: Number(event.target.value) })} required disabled={pending} /></label>
            <DialogFooter>
              <Button type="submit" disabled={pending || !options.engins.length || !options.lubrifiants.length}>
                {selected ? "Enregistrer" : "Créer la saisie"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette saisie ?</AlertDialogTitle>
            <AlertDialogDescription>La consommation sera définitivement supprimée.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={pending}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
