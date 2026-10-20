"use client";


import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";

import { yupResolver } from "@hookform/resolvers/yup";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useEffect, useState, useTransition } from "react";
import { PenIcon } from "lucide-react";

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
import { Spinner } from "@/components/ui/spinner";
import { GlobalLoader } from "@/components/global-loader";
import { updatePermission } from "@/server/permissions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Permission } from "@/lib/generated/prisma/client";
import { Action } from "@/lib/generated/prisma/enums";
import DisplayError from "@/components/display-error";
import { TABLES } from "@/lib/tables";
import yup from "@/lib/yupFr";


const formSchema = yup.object({
  resource: yup.string().oneOf(TABLES).required("Veuillez choisir une ressource"),
  action: yup.mixed<Action>().oneOf(Object.values(Action)).required("Veuillez choisir une action"),
  description: yup.string().max(255, "La description ne peut pas dépasser 255 caractères"),
});

export function UpdatePermissionForm({ permission }: { permission: Permission }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const [open, setOpen] = useState(false);
  const form = useForm<yup.InferType<typeof formSchema>>({
    resolver: yupResolver(formSchema),
    values: {
      resource: permission?.resource as (typeof TABLES)[number],
      action: permission?.action,
      description: permission?.description || "",
    },
  });

  const router = useRouter();

  async function onSubmit(values: yup.InferType<typeof formSchema>) {
    if (!permission?.id) {
      setError("Permission introuvable");
      return;
    }

    try {
      setError("");
      setIsLoading(true);
      await sleep();

      const { success, message } = await updatePermission(
        permission.id,
        values.resource,
        values.action,
        values.description ?? ""
      );

      if (!success) {
        setError(message);
        return;
      }

      // router.refresh();
      // ⚠️ On enveloppe router.refresh() dans startTransition
      startTransition(() => {
        router.refresh();
      });

      toast.success("Permission modifié avec succès");
      setOpen(false);
      form.reset();
    } catch (error) {
      toast.error(error as string);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!open) {
      setError("");
    }
  }, [open]);

  return (
    <>
      <GlobalLoader show={isPending} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger className="text-primary hover:cursor-pointer">
          <PenIcon className="size-4" />
        </DialogTrigger>

        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Modifier le site</DialogTitle>
            <DialogDescription>
              Modifier le site
            </DialogDescription>

            <DisplayError error={error} />
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup className="gap-2">
              <div className="flex gap-1">
                {/* Resource */}
                <Controller
                  name="resource"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="resource">Ressource</FieldLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isLoading}
                      >
                        <SelectTrigger
                          id="resource"
                          aria-invalid={fieldState.invalid}
                          className="w-full"
                        >
                          <SelectValue placeholder="Ressource" />
                        </SelectTrigger>
                        <SelectContent>
                          {TABLES?.map((resource, index) => (
                            <SelectItem key={index} value={resource}>{resource}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />

                {/* Action */}
                <Controller
                  name="action"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="action">Action</FieldLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isLoading}
                      >
                        <SelectTrigger
                          id="action"
                          aria-invalid={fieldState.invalid}
                          className="w-full"
                        >
                          <SelectValue placeholder="Action" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={Action.create}>Création</SelectItem>
                          <SelectItem value={Action.read}>Lecture</SelectItem>
                          <SelectItem value={Action.update}>Modification</SelectItem>
                          <SelectItem value={Action.delete}>Suppression</SelectItem>
                        </SelectContent>
                      </Select>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />

              </div>
              {/* Description */}
              <Controller
                name="description"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="description">Description</FieldLabel>
                    <Textarea
                      {...field}
                      id="description"
                      aria-invalid={fieldState.invalid}
                      placeholder=""
                      autoComplete="off"
                      disabled={isLoading}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />


            </FieldGroup>

            <DialogFooter className="sm:justify-start mt-4">
              <Button variant={"outline"} type="submit" disabled={isLoading}>
                {isLoading ? (
                  <Spinner className="size-4" />
                ) : (
                  "Modifier"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
