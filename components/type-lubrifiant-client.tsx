"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Droplets, Pencil, Plus, Trash2 } from "lucide-react";
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
import { ExportExcel } from "@/components/export-excel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createTypeLubrifiant,
  deleteTypeLubrifiant,
  updateTypeLubrifiant,
  type TypeLubrifiantItem,
} from "@/server/type-lubrifiants";

type Props = {
  items: TypeLubrifiantItem[];
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canExport: boolean;
  error?: string;
};

export default function TypeLubrifiantClient({
  items,
  canCreate,
  canUpdate,
  canDelete,
  canExport,
  error,
}: Props): React.JSX.Element {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<TypeLubrifiantItem | null>(null);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  function openForm(item?: TypeLubrifiantItem): void {
    setSelected(item ?? null);
    setName(item?.name ?? "");
    setMessage("");
    setDialogOpen(true);
  }

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setMessage("");
    startTransition(async () => {
      const result = selected
        ? await updateTypeLubrifiant(selected.id, name)
        : await createTypeLubrifiant(name);
      setMessage(result.message);
      if (result.success) {
        setDialogOpen(false);
        router.refresh();
      }
    });
  }

  function confirmDelete(): void {
    if (!selected) return;
    startTransition(async () => {
      const result = await deleteTypeLubrifiant(selected.id);
      setMessage(result.message);
      setDeleteOpen(false);
      setSelected(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Droplets className="size-8" />
            Gestion des types de lubrifiants
          </h1>
          <p className="mt-1 text-muted-foreground">
            Définissez les désignations utilisées pour classer les lubrifiants.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canExport && <ExportExcel tableName="type-lubrifiants-table" fileName="Types_de_lubrifiants" />}
          {canCreate && (
            <Button type="button" onClick={() => openForm()}>
              <Plus aria-hidden="true" />
              Ajouter un type
            </Button>
          )}
        </div>
      </div>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {message && <Alert><AlertDescription>{message}</AlertDescription></Alert>}

      <div className="rounded-md border">
        <Table id="type-lubrifiants-table">
          <TableHeader>
            <TableRow>
              <TableHead>Type de lubrifiant</TableHead>
              <TableHead>Lubrifiants associés</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={3} className="h-24 text-center">Aucun type de lubrifiant trouvé.</TableCell></TableRow>
            ) : items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{item._count.lubrifiants}</TableCell>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected ? "Modifier un type de lubrifiant" : "Créer un type de lubrifiant"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <label className="grid gap-2 text-sm font-medium" htmlFor="type-lubrifiant-name">
              Nom
              <Input id="type-lubrifiant-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required disabled={pending} />
            </label>
            <DialogFooter>
              <Button type="submit" disabled={pending || !name.trim()}>{selected ? "Enregistrer" : "Créer"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce type de lubrifiant ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est impossible tant que le type est utilisé par un lubrifiant.
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
