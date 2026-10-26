"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import yup from "@/lib/yupFr";
import {
    createTypePanne,
    updateTypePanne,
} from "@/server/typepannes";
import { sleep } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { GlobalLoader } from "@/components/global-loader";
import DisplayError from "@/components/display-error";

const schema = yup.object({
    name: yup
        .string()
        .trim()
        .min(2)
        .max(100)
        .required()
        .label("Le nom du type de panne"),
    description: yup
        .string()
        .max(500)
        .nullable()
        .defined()
        .label("La description"),
});

type FormValues = yup.InferType<typeof schema>;

type TypePanneItem = {
    id: string;
    name: string;
    description: string | null;
};

export function TypePanneForm({
    typePanne,
}: {
    typePanne?: TypePanneItem;
}) {
    const isEdit = Boolean(typePanne);
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState("");
    const router = useRouter();

    const form = useForm<FormValues>({
        resolver: yupResolver(schema),
        defaultValues: {
            name: typePanne?.name ?? "",
            description: typePanne?.description ?? "",
        },
    });

    useEffect(() => {
        if (open) {
            form.reset({
                name: typePanne?.name ?? "",
                description: typePanne?.description ?? "",
            });
            setError("");
        }
    }, [open, typePanne, form]);

    async function onSubmit(values: FormValues) {
        try {
            setIsLoading(true);
            setError("");
            await sleep();

            const result = typePanne
                ? await updateTypePanne({
                    id: typePanne.id,
                    name: values.name,
                    description: values.description,
                })
                : await createTypePanne({
                    name: values.name,
                    description: values.description,
                });

            if (!result.success) {
                setError(result.message ?? "Une erreur est survenue.");
                return;
            }

            toast.success(result.message ?? "Opération effectuée.");
            setOpen(false);
            startTransition(() => router.refresh());
        } catch {
            toast.error("Une erreur inattendue est survenue.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <>
            <GlobalLoader show={isPending} />

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button
                        type="button"
                        size={isEdit ? "icon" : "sm"}
                        variant={isEdit ? "ghost" : "default"}
                        aria-label={isEdit ? "Modifier le type de panne" : "Créer un type de panne"}
                        title={isEdit ? "Modifier" : "Créer"}
                    >
                        {isEdit ? (
                            <Pencil className="size-4" />
                        ) : (
                            <Plus className="size-4" />
                        )}
                        {!isEdit && <span>Ajouter</span>}
                    </Button>
                </DialogTrigger>

                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {isEdit ? "Modifier un type de panne" : "Créer un type de panne"}
                        </DialogTitle>
                        <DialogDescription>
                            Renseignez le nom et la description du type de panne.
                        </DialogDescription>
                    </DialogHeader>

                    <DisplayError error={error} />

                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <FieldGroup>
                            <Field data-invalid={Boolean(form.formState.errors.name)}>
                                <FieldLabel htmlFor="typepanne-name">Nom</FieldLabel>
                                <Input
                                    id="typepanne-name"
                                    {...form.register("name")}
                                    autoComplete="off"
                                    maxLength={100}
                                    disabled={isLoading}
                                    aria-invalid={Boolean(form.formState.errors.name)}
                                />
                                {form.formState.errors.name && (
                                    <FieldError errors={[form.formState.errors.name]} />
                                )}
                            </Field>

                            <Field data-invalid={Boolean(form.formState.errors.description)}>
                                <FieldLabel htmlFor="typepanne-description">
                                    Description
                                </FieldLabel>
                                <Textarea
                                    id="typepanne-description"
                                    {...form.register("description")}
                                    maxLength={500}
                                    rows={3}
                                    disabled={isLoading}
                                    aria-invalid={Boolean(form.formState.errors.description)}
                                />
                                {form.formState.errors.description && (
                                    <FieldError errors={[form.formState.errors.description]} />
                                )}
                            </Field>
                        </FieldGroup>

                        <DialogFooter className="mt-4">
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? (
                                    <Spinner className="size-4" />
                                ) : isEdit ? (
                                    "Modifier"
                                ) : (
                                    "Créer"
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}