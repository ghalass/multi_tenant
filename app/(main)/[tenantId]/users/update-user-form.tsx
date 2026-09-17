"use client";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "@/lib/zod-config";
import { toast } from "sonner";
import { useState, useTransition } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { GlobalLoader } from "@/components/global-loader";
import { updateUser } from "@/server/users";
import DisplayError from "@/components/display-error";
import { Checkbox } from "@/components/ui/checkbox";
import { Role, User } from "@/lib/generated/prisma/client";

const formSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  active: z.boolean(),
  roleIds: z.array(z.string()),
});

type UserWithRoles = User & { roles?: Role[] };

export function UpdateUserForm({
  user,
  roles,
}: {
  user: UserWithRoles;
  roles: Role[];
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const [open, setOpen] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    values: {
      name: user?.name,
      active: user?.active,
      roleIds: user?.roles?.map((r) => r.id) || [],
    },
  });

  const router = useRouter();

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      console.log(values.roleIds);

      setError("");
      setIsLoading(true);
      await sleep();

      const { success, message } = await updateUser(
        user?.id,
        values.name,
        values.active,
        values.roleIds
      );

      if (!success) {
        setError(message);
        return;
      }

      startTransition(() => {
        router.refresh();
      });

      toast.success("Utilisateur modifié avec succès");
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
        <DialogTrigger className="text-primary hover:cursor-pointer">
          <PenIcon className="size-4" />
        </DialogTrigger>

        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier l'utilisateur</DialogTitle>
            <DialogDescription>
              Modifier l'utilisateur et ses rôles
            </DialogDescription>

            <DisplayError error={error} />
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              {/* Nom */}
              <Controller
                name="name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="name">Nom</FieldLabel>
                    <Input
                      {...field}
                      id="name"
                      aria-invalid={fieldState.invalid}
                      autoComplete="off"
                      type="text"
                      disabled={isLoading}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              {/* Actif */}
              <Controller
                name="active"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field
                    data-invalid={fieldState.invalid}
                    orientation="horizontal"
                    className="max-w-sm"
                  >
                    <FieldContent className="flex flex-row items-start space-x-2">
                      <FieldLabel htmlFor="active">Actif</FieldLabel>
                      <Switch
                        id="active"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        disabled={isLoading}
                        aria-invalid={fieldState.invalid}
                      />
                    </FieldContent>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              {/* Rôles */}
              <Controller
                name="roleIds"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Rôles</FieldLabel>
                    <div className="max-h-48 overflow-y-auto rounded-md border p-2 space-y-1">
                      {roles.length === 0 ? (
                        <p className="text-xs text-muted-foreground p-2">
                          Aucun rôle disponible.
                        </p>
                      ) : (
                        roles.map((role) => {
                          const checked = field.value.includes(role.id);
                          return (
                            <label
                              key={role.id}
                              className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent cursor-pointer"
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(isChecked) => {
                                  const next = isChecked
                                    ? [...field.value, role.id]
                                    : field.value.filter(
                                      (id) => id !== role.id
                                    );
                                  field.onChange(next);
                                }}
                                disabled={isLoading}
                              />
                              <span className="font-medium">{role.name}</span>
                              {role.description && (
                                <span className="text-xs text-muted-foreground">
                                  — {role.description}
                                </span>
                              )}
                            </label>
                          );
                        })
                      )}
                    </div>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </FieldGroup>

            <DialogFooter className="sm:justify-start mt-4">
              <Button variant={"outline"} type="submit" disabled={isLoading}>
                {isLoading ? <Spinner className="size-4" /> : "Modifier"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}