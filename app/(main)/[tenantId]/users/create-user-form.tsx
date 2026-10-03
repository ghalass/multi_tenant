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

import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useEffect, useState, useTransition } from "react";
import { PlusIcon } from "lucide-react";

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
import DisplayError from "@/components/display-error";
import { Checkbox } from "@/components/ui/checkbox";
import { Role } from "@/lib/generated/prisma/client";
import yup from "@/lib/yupFr";
import { yupResolver } from "@hookform/resolvers/yup";

const formSchema = yup.object({
  name: yup.string().min(2).required(),
  email: yup.string().email().required(),
  password: yup.string().min(6).required(),
  active: yup.boolean().default(true),
  roleIds: yup.array().of(yup.string()).default([]),
});

export function CreateUserForm({ tenantId, roles }: { tenantId: string; roles: Role[] }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const form = useForm<yup.InferType<typeof formSchema>>({
    resolver: yupResolver(formSchema),
    defaultValues: {
      name: "",
      active: true,
      email: "",
      password: "",
      roleIds: [],
    },
  });

  const router = useRouter();

  async function onSubmit(values: yup.InferType<typeof formSchema>) {
    try {
      setError("");
      setIsLoading(true);
      await sleep();

      const roleIds = (values.roleIds ?? []).filter(
        (id): id is string => typeof id === "string" && id.length > 0
      );

      const { success, message } = await createUser(
        values.name,
        values.active,
        values.email,
        values.password,
        tenantId,
        roleIds
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

        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Créer un utilisateur</DialogTitle>
            <DialogDescription>
              Créez un nouvel utilisateur et affectez-lui des rôles
            </DialogDescription>

            <DisplayError error={error} />
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup className="gap-2">
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

              {/* Email */}
              <Controller
                name="email"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input
                      {...field}
                      id="email"
                      aria-invalid={fieldState.invalid}
                      autoComplete="off"
                      type="email"
                      disabled={isLoading}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              {/* Password */}
              <Controller
                name="password"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
                    <Input
                      {...field}
                      id="password"
                      aria-invalid={fieldState.invalid}
                      autoComplete="off"
                      type="password"
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
                {isLoading ? <Spinner className="size-4" /> : "Créer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}