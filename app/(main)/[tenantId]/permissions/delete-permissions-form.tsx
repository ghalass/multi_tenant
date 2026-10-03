"use client";

import { Button } from "@/components/ui/button";

import { toast } from "sonner";
import { useState, useTransition } from "react";
import { Trash2Icon } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { sleep } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Permission } from "@/lib/generated/prisma/client";
import { Spinner } from "@/components/ui/spinner";
import { GlobalLoader } from "@/components/global-loader";
import { deletePermission } from "@/server/permissions";
import DisplayError from "@/components/display-error";


export function DeletePermissionForm({ permission }: { permission: Permission }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  const router = useRouter();

  async function onSubmit() {
    try {
      setError("");
      setIsLoading(true);
      await sleep();

      const { success, message } = await deletePermission(permission?.id);

      if (!success) {
        setError(message);
        return;
      }

      startTransition(() => {
        router.refresh();
      });
      toast.success("Permission supprimé avec succès");
      setOpen(false);
    } catch (error) {
      toast.error(error as string);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <GlobalLoader show={isPending} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger className="text-destructive hover:cursor-pointer">
          <Trash2Icon className="size-4" />
        </DialogTrigger>

        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Suppression</DialogTitle>
            <DialogDescription className="flex flex-col">
              <span>Voulez-vous vraiment supprimer l'utilisateur ?</span>
              <span className="text-destructive italic">{permission?.name}</span>
            </DialogDescription>

            <DisplayError error={error} />
          </DialogHeader>

          <DialogFooter className="sm:justify-start mt-4">
            <Button onClick={onSubmit} variant={"outline"} className="" type="button" disabled={isLoading}>
              {isLoading ? (<Spinner className="size-4" />) : ("Supprimer")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>  </>
  );
}
