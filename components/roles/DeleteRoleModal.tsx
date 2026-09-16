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
import { Loader2 } from "lucide-react";
import { Role } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";

interface DeleteRoleModalProps {
  open: boolean;
  onClose: () => void;
  role: Role | null;
  deleteRole: any;
}

export function DeleteRoleModal({
  open,
  onClose,
  role,
  deleteRole,
}: DeleteRoleModalProps) {
  const handleDelete = async () => {
    if (!role) return;
    try {
      await deleteRole.mutateAsync({ id: role.id });
      onClose();
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Êtes-vous absolument sûr ?</DialogTitle>
          <DialogDescription>
            Cette action est irréversible. Cela supprimera définitivement le
            rôle{" "}
            <span className="font-semibold text-foreground">{role?.name}</span>{" "}
            et toutes ses données associées.
            {role?.description && (
              <span className="block mt-2 text-sm">
                Description : {role.description}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex space-x-2 sm:space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={deleteRole.isPending}
          >
            Annuler
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteRole.isPending}
          >
            {deleteRole.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Supprimer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
