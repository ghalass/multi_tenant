"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Droplet, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { ExportExcel } from "@/components/export-excel";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createLubrifiant,
  deleteLubrifiant,
  updateLubrifiant,
  type LubrifiantInput,
  type LubrifiantItem,
  type LubrifiantOptions,
} from "@/server/lubrifiants";

type Props = {
  items: LubrifiantItem[];
  options: LubrifiantOptions;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canExport: boolean;
  error?: string;
};

const EMPTY_FORM: LubrifiantInput = {
  name: "",
  code: "",
  unite: "",
  typeLubrifiantId: "",
  parcIds: [],
};

export default function LubrifiantClient({
  items,
  options,
  canCreate,
  canUpdate,
  canDelete,
  canExport,
  error,
}: Props): React.JSX.Element {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<LubrifiantItem | null>(null);
  const [form, setForm] = useState<LubrifiantInput>(EMPTY_FORM);
  const [message, setMessage] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return items.filter((item) =>
      !query ||
      item.name.toLocaleLowerCase().includes(query) ||
      item.code.toLocaleLowerCase().includes(query) ||
      item.typeLubrifiant.name.toLocaleLowerCase().includes(query) ||
      item.parcs.some(({ parc }) => parc.name.toLocaleLowerCase().includes(query)),
    );
  }, [items, search]);

  function openForm(item?: LubrifiantItem): void {
    setSelected(item ?? null);
    setForm(item ? {
      name: item.name,
      code: item.code,
      unite: item.unite,
      typeLubrifiantId: item.typeLubrifiant.id,
      parcIds: item.parcs.map(({ parc }) => parc.id),
    } : EMPTY_FORM);
    setMessage("");
    setOpen(true);
  }

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    startTransition(async () => {
      const result = selected
        ? await updateLubrifiant(selected.id, form)
        : await createLubrifiant(form);
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
      const result = await deleteLubrifiant(selected.id);
      setMessage(result.message);
      setDeleteOpen(false);
      setSelected(null);
      router.refresh();
    });
  }

  function toggleParc(parcId: string): void {
    setForm((current) => ({
      ...current,
      parcIds: current.parcIds.includes(parcId)
        ? current.parcIds.filter((id) => id !== parcId)
        : [...current.parcIds, parcId],
    }));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Droplet className="size-8" />
            Gestion des lubrifiants
          </h1>
          <p className="mt-1 text-muted-foreground">
            Gérez les codes, unités, désignations et parcs consommateurs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canExport && <ExportExcel tableName="lubrifiants-table" fileName="Lubrifiants" />}
          {canCreate && (
            <Button type="button" onClick={() => openForm()}>
              <Plus aria-hidden="true" />
              Ajouter un lubrifiant
            </Button>
          )}
        </div>
      </div>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {message && <Alert><AlertDescription>{message}</AlertDescription></Alert>}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher par nom, code, type ou parc…" className="pl-9" />
      </div>

      <div className="rounded-md border">
        <Table id="lubrifiants-table">
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Lubrifiant</TableHead>
              <TableHead>Désignation</TableHead>
              <TableHead>Unité</TableHead>
              <TableHead>Parcs</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="h-24 text-center">Aucun lubrifiant trouvé.</TableCell></TableRow>
            ) : filtered.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.code}</TableCell>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{item.typeLubrifiant.name}</TableCell>
                <TableCell>{item.unite}</TableCell>
                <TableCell className="whitespace-normal">
                  {item.parcs.map(({ parc }) => parc.name).join(", ")}
                </TableCell>
                <TableCell className="flex justify-end gap-2">
                  {canUpdate && (
                    <Button type="button" variant="ghost" size="icon" aria-label={`Modifier ${item.name}`} onClick={() => openForm(item)}>
                      <Pencil aria-hidden="true" className="size-4" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button type="button" variant="ghost" size="icon" aria-label={`Supprimer ${item.name}`} onClick={() => { setSelected(item); setDeleteOpen(true); }}>
                      <Trash2 aria-hidden="true" className="size-4 text-destructive" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{selected ? "Modifier un lubrifiant" : "Créer un lubrifiant"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <label className="grid gap-2 text-sm font-medium">
              Nom unique
              <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} maxLength={120} required disabled={pending} />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                Code
                <Input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} maxLength={80} required disabled={pending} />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Unité de quantification
                <Input value={form.unite} onChange={(event) => setForm({ ...form, unite: event.target.value })} maxLength={40} placeholder="L, kg, unité…" required disabled={pending} />
              </label>
            </div>
            <label className="grid gap-2 text-sm font-medium">
              Type / désignation
              <select className="h-10 rounded-md border bg-background px-3 text-sm" value={form.typeLubrifiantId} onChange={(event) => setForm({ ...form, typeLubrifiantId: event.target.value })} required disabled={pending}>
                <option value="">Choisir un type</option>
                {options.types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
              </select>
            </label>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Parcs pouvant utiliser ce lubrifiant</legend>
              {options.parcs.length === 0 ? (
                <p className="text-sm text-destructive">Créez d’abord un parc.</p>
              ) : (
                <div className="max-h-44 space-y-2 overflow-auto rounded-md border p-3">
                  {options.parcs.map((parc) => (
                    <label key={parc.id} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={form.parcIds.includes(parc.id)} onChange={() => toggleParc(parc.id)} disabled={pending} />
                      {parc.name} <span className="text-muted-foreground">({parc.typeparc.name})</span>
                    </label>
                  ))}
                </div>
              )}
            </fieldset>
            <DialogFooter>
              <Button type="submit" disabled={pending || !options.types.length || !options.parcs.length}>
                {selected ? "Enregistrer" : "Créer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce lubrifiant ?</AlertDialogTitle>
            <AlertDialogDescription>
              Un lubrifiant déjà utilisé dans une saisie ne peut pas être supprimé.
            </AlertDialogDescription>
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
