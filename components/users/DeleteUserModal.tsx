"use client";

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
import { User } from "@/lib/types";
import { AlertCircle, AlertTriangle, Loader2 } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription } from "../ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";

interface DeleteUserModalProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
  deleteUser: any;
}

export function DeleteUserModal({
  open,
  onClose,
  user,
  deleteUser,
}: DeleteUserModalProps) {
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!user) return;
    try {
      await deleteUser.mutateAsync({ id: user.id });
      onClose();
    } catch (error: any) {
      setError(
        error?.message || "Une erreur est survenue lors de la suppression"
      );
    }
  };

  const handleClode = () => {
    onClose();
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClode}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <DialogTitle>Supprimer le utilisateur</DialogTitle>
          </div>
          <DialogDescription>
            Êtes-vous sûr de vouloir supprimer cet utilisateur <br />
            Cette action est irréversible. Cela supprimera définitivement
            l'utilisateur{" "}
            <span className="font-semibold text-foreground">
              {user?.name}
            </span>{" "}
            ({user?.email}) et toutes ses données associées.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Vous allez supprimer cet utilisateur :{" "}
              <strong>
                {user?.name} -&gt; {user?.email}
              </strong>
              <div className="mt-2 flex gap-2">
                Rôle(s) :{" "}
                {user?.roles?.map((role, key) => (
                  <Badge className="border" key={key} variant="secondary">
                    {role.name}
                  </Badge>
                ))}
              </div>
            </AlertDescription>
          </Alert>

          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Attention :</strong> Toutes les données associées à cet
              utilisateur pourront être affectées.
            </p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <DialogFooter className="flex space-x-2 sm:space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClode}
            disabled={deleteUser.isPending}
          >
            Annuler
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteUser.isPending}
          >
            {deleteUser.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Supprimer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
