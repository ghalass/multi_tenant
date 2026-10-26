"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import yup from "@/lib/yupFr";
import { createPanne, updatePanne } from "@/server/pannes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
    Field, FieldError, FieldGroup, FieldLabel,
} from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { GlobalLoader } from "@/components/global-loader";
import DisplayError from "@/components/display-error";

const schema = yup.object({
    name: yup.string().trim().min(2).max(100).required().label("Le nom"),
    description: yup.string().max(500).nullable().defined().label("La description"),
    typepanneId: yup.string().required("Sélectionnez un type de panne."),
    parcIds: yup.array().of(yup.string().required()).min(1, "Sélectionnez au moins un parc.").required(),
});

type FormValues = yup.InferType<typeof schema>;
type Option = { id: string; name: string };
type PanneItem = {
    id: string;
    name: string;
    description: string | null;
    typepanneId: string;
    parcs: Option[];
};

export function PanneForm({
    panne,
    typepannes,
    parcs,
}: {
    panne?: PanneItem;
    typepannes: Option[];
    parcs: Option[];
}) {
    const isEdit = Boolean(panne);
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState("");
    const router = useRouter();

    const form = useForm<FormValues>({
        resolver: yupResolver(schema),
        defaultValues: {
            name: panne?.name ?? "",
            description: panne?.description ?? "",
            typepanneId: panne?.typepanneId ?? "",
            parcIds: panne?.parcs.map((p) => p.id) ?? [],
        },
    });

    useEffect(() => {
        if (open) {
            form.reset({
                name: panne?.name ?? "",
                description: panne?.description ?? "",
                typepanneId: panne?.typepanneId ?? "",
                parcIds: panne?.parcs.map((p) => p.id) ?? [],
            });
            setError("");
        }
    }, [open, panne, form]);

    async function onSubmit(values: FormValues) {
        try {
            setIsLoading(true);
            setError("");

            const payload = {
                name: values.name,
                description: values.description,
                typepanneId: values.typepanneId,
                parcIds: values.parcIds,
            };

            const result = panne
                ? await updatePanne({ id: panne.id, ...payload })
                : await createPanne(payload);

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
                        title={isEdit ? "Modifier" : "Ajouter"}
                        aria-label={isEdit ? "Modifier la panne" : "Ajouter une panne"}
                    >
                        {isEdit ? <Pencil className="size-4" /> : <Plus className="size-4" />}
                        {!isEdit && <span>Ajouter</span>}
                    </Button>
                </DialogTrigger>

                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{isEdit ? "Modifier une panne" : "Créer une panne"}</DialogTitle>
                        <DialogDescription>
                            Renseignez les informations et les parcs concernés.
                        </DialogDescription>
                    </DialogHeader>

                    <DisplayError error={error} />

                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <FieldGroup>
                            <Field data-invalid={Boolean(form.formState.errors.name)}>
                                <FieldLabel htmlFor="panne-name">Nom</FieldLabel>
                                <Input id="panne-name" {...form.register("name")} maxLength={100} disabled={isLoading} />
                                {form.formState.errors.name && <FieldError errors={[form.formState.errors.name]} />}
                            </Field>

                            <Field data-invalid={Boolean(form.formState.errors.description)}>
                                <FieldLabel htmlFor="panne-description">Description</FieldLabel>
                                <Textarea id="panne-description" {...form.register("description")} maxLength={500} rows={3} disabled={isLoading} />
                                {form.formState.errors.description && <FieldError errors={[form.formState.errors.description]} />}
                            </Field>

                            <Field data-invalid={Boolean(form.formState.errors.typepanneId)}>
                                <FieldLabel htmlFor="panne-type">Type de panne</FieldLabel>
                                <select
                                    id="panne-type"
                                    {...form.register("typepanneId")}
                                    disabled={isLoading}
                                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                >
                                    <option value="">Sélectionner un type</option>
                                    {typepannes.map((type) => (
                                        <option key={type.id} value={type.id}>{type.name}</option>
                                    ))}
                                </select>
                                {form.formState.errors.typepanneId && <FieldError errors={[form.formState.errors.typepanneId]} />}
                            </Field>

                            <Field data-invalid={Boolean(form.formState.errors.parcIds)}>
                                <FieldLabel htmlFor="panne-parcs">Parcs concernés</FieldLabel>
                                <select
                                    id="panne-parcs"
                                    multiple
                                    {...form.register("parcIds")}
                                    disabled={isLoading}
                                    className="min-h-28 w-full rounded-md border border-input bg-background p-2 text-sm"
                                >
                                    {parcs.map((parc) => (
                                        <option key={parc.id} value={parc.id}>{parc.name}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-muted-foreground">
                                    Maintenez Ctrl (Windows) ou Cmd (Mac) pour sélectionner plusieurs parcs.
                                </p>
                                {form.formState.errors.parcIds && <FieldError errors={[form.formState.errors.parcIds]} />}
                            </Field>
                        </FieldGroup>

                        <DialogFooter className="mt-4">
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? <Spinner className="size-4" /> : isEdit ? "Modifier" : "Créer"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}