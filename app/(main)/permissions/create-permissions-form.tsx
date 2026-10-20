"use client";

import { cn } from "cn";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { yupResolver } from "@hookform/resolvers/yup";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useEffect, useState, useTransition } from "react";
import { Loader2, PlusIcon } from "lucide-react";

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
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { GlobalLoader } from "@/components/global-loader";
import { createUser } from "@/server/users";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createPermission } from "@/server/permissions";
import { Textarea } from "@/components/ui/textarea";
import { Action } from "@/lib/generated/prisma/enums";
import DisplayError from "@/components/display-error";
import { TABLES } from "@/lib/tables";
import yup from "@/lib/yupFr";

const formSchema = yup.object({
  resource: yup.string().oneOf(TABLES).required("Veuillez choisir une ressource"),
  action: yup.mixed<Action>().oneOf(Object.values(Action)).required("Veuillez choisir une action"),
  description: yup.string().max(255, "La description ne peut pas dépasser 255 caractères"),
});

export function CreatePermissionForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const form = useForm<yup.InferType<typeof formSchema>>({
    resolver: yupResolver(formSchema),
    defaultValues: {
      resource: TABLES[0] ?? "user",
      action: Action.read,
      description: "",
    },
  });

  const router = useRouter();

  async function onSubmit(values: yup.InferType<typeof formSchema>) {
    try {
      setError("");
      setIsLoading(true);
      await sleep();

      const { success, message } = await createPermission(
        values.resource,
        values.action,
        values.description ?? ""
      );

      if (!success) {
        setError(message);
        return;
      }

      startTransition(() => {
        router.refresh();
      });

      toast.success("Utilisateur créé avec succès");
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
      form.reset();
      setError("");
    }
  }, [open, form]);

  return (
    <div>
      <GlobalLoader show={isPending} />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger className="mx-auto inline-flex items-center justify-center rounded-full bg-primary p-1 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 hover:cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
          <PlusIcon className="size-4" />
        </DialogTrigger>

        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Créer une permission</DialogTitle>
            <DialogDescription>
              Créez un nouvelle permission
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
                        value={field.value ?? ""}
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
                          {TABLES.map((resource, index) => (
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
                        value={field.value ?? ""}
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
                      placeholder="Description optionnelle"
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
                  "Créer"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
