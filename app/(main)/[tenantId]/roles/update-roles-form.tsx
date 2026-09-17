"use client";

import { Button } from "@/components/ui/button";
import {
    Field,
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
import { Spinner } from "@/components/ui/spinner";
import { GlobalLoader } from "@/components/global-loader";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Permission, Role } from "@/lib/generated/prisma/client";
import { updateRole } from "@/server/roles";
import DisplayError from "@/components/display-error";

type RoleWithPermissions = Role & { permissions?: Permission[] };

export function UpdateRoleForm({
    role,
    permissions,
}: {
    role: RoleWithPermissions;
    permissions: Permission[];
}) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [isPending, startTransition] = useTransition();

    const formSchema = z.object({
        name: z.string().min(1, "Le nom est requis"),
        description: z.string().optional(),
        permissionIds: z.array(z.string()),
    });

    const [open, setOpen] = useState(false);
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        values: {
            name: role?.name || "",
            description: role?.description || "",
            permissionIds: role?.permissions?.map((p) => p.id) || [],
        },
    });

    const router = useRouter();

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            setError("");
            setIsLoading(true);
            await sleep();

            const { success, message } = await updateRole(
                role.id,
                values.name,
                values.description || "",
                values.permissionIds
            );

            if (!success) {
                setError(message);
                return;
            }

            startTransition(() => {
                router.refresh();
            });

            toast.success("Rôle modifié avec succès");
            setOpen(false);
            form.reset();
        } catch (err) {
            toast.error(err as string);
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

                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Modifier le rôle</DialogTitle>
                        <DialogDescription>Modifier le rôle</DialogDescription>
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
                                            disabled={isLoading}
                                        />
                                        {fieldState.invalid && (
                                            <FieldError errors={[fieldState.error]} />
                                        )}
                                    </Field>
                                )}
                            />

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
                                            autoComplete="off"
                                            disabled={isLoading}
                                        />
                                        {fieldState.invalid && (
                                            <FieldError errors={[fieldState.error]} />
                                        )}
                                    </Field>
                                )}
                            />

                            {/* Permissions */}
                            <Controller
                                name="permissionIds"
                                control={form.control}
                                render={({ field, fieldState }) => {
                                    const allSelected =
                                        permissions.length > 0 &&
                                        permissions.every((p) => field.value.includes(p.id));
                                    const someSelected =
                                        permissions.some((p) => field.value.includes(p.id)) && !allSelected;

                                    return (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel>Permissions</FieldLabel>

                                            <div className="rounded-md border">
                                                {/* Tout sélectionner — HORS du scroll */}
                                                <label className="flex items-center gap-2 border-b bg-muted/50 px-2 py-2 text-sm font-semibold hover:bg-accent cursor-pointer">
                                                    <Checkbox
                                                        checked={
                                                            allSelected
                                                                ? true
                                                                : someSelected
                                                                    ? "indeterminate"
                                                                    : false
                                                        }
                                                        onCheckedChange={(isChecked) => {
                                                            field.onChange(
                                                                isChecked ? permissions.map((p) => p.id) : []
                                                            );
                                                        }}
                                                        disabled={isLoading}
                                                    />
                                                    <span>Tout sélectionner</span>
                                                </label>

                                                {/* Liste scrollable — le scroll ne concerne QUE cette zone */}
                                                <div className="max-h-48 overflow-y-auto p-2 space-y-1">
                                                    {permissions.length === 0 ? (
                                                        <p className="text-xs text-muted-foreground p-2">
                                                            Aucune permission disponible.
                                                        </p>
                                                    ) : (
                                                        permissions.map((perm) => {
                                                            const checked = field.value.includes(perm.id);
                                                            return (
                                                                <label
                                                                    key={perm.id}
                                                                    className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent cursor-pointer"
                                                                >
                                                                    <Checkbox
                                                                        checked={checked}
                                                                        onCheckedChange={(isChecked) => {
                                                                            const next = isChecked
                                                                                ? [...field.value, perm.id]
                                                                                : field.value.filter(
                                                                                    (id) => id !== perm.id
                                                                                );
                                                                            field.onChange(next);
                                                                        }}
                                                                        disabled={isLoading}
                                                                    />
                                                                    <span className="font-medium">
                                                                        {perm.name}
                                                                    </span>
                                                                    <span className="text-xs text-muted-foreground">
                                                                        ({perm.resource} · {perm.action})
                                                                    </span>
                                                                </label>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            </div>

                                            {fieldState.invalid && (
                                                <FieldError errors={[fieldState.error]} />
                                            )}
                                        </Field>
                                    );
                                }}
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