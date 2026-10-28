"use client";

import { JSX, useEffect, useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import yup from "@/lib/yupFr";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

import {
    createPlanMaintenance,
    updatePlanMaintenance,
} from "@/server/maintenance-preventive-plans";

export type PlanMaintenanceItem = {
    id: string;
    code: string;
    name: string;
    description: string | null;
    intervalleHeures: number;
    seuilAlerteHeures: number;
    active: boolean;
};

const schema = yup.object({
    code: yup
        .string()
        .trim()
        .max(30, "Le code ne doit pas dépasser 30 caractères.")
        .required("Le code est obligatoire."),

    name: yup
        .string()
        .trim()
        .max(150, "Le nom ne doit pas dépasser 150 caractères.")
        .required("Le nom est obligatoire."),

    description: yup
        .string()
        .max(500, "La description ne doit pas dépasser 500 caractères.")
        .defined(),

    intervalleHeures: yup
        .number()
        .typeError("Saisissez un intervalle valide.")
        .moreThan(0, "l&apos;intervalle doit être supérieur à zéro.")
        .required("l&apos;intervalle est obligatoire."),

    seuilAlerteHeures: yup
        .number()
        .typeError("Saisissez un seuil valide.")
        .min(0, "Le seuil doit être positif ou nul.")
        .required("Le seuil d&apos;alerte est obligatoire."),
});

type FormValues = yup.InferType<typeof schema>;

export function PlanMaintenanceForm({
    plan,
}: {
    plan?: PlanMaintenanceItem;
}): JSX.Element {
    const editing = Boolean(plan);
    const formId = useId();
    const router = useRouter();

    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState("");

    const form = useForm<FormValues>({
        resolver: yupResolver(schema),
        defaultValues: {
            code: plan?.code ?? "",
            name: plan?.name ?? "",
            description: plan?.description ?? "",
            intervalleHeures: plan?.intervalleHeures ?? 0,
            seuilAlerteHeures: plan?.seuilAlerteHeures ?? 50,
        },
    });

    useEffect(() => {
        if (!open) return;

        form.reset({
            code: plan?.code ?? "",
            name: plan?.name ?? "",
            description: plan?.description ?? "",
            intervalleHeures: plan?.intervalleHeures ?? 0,
            seuilAlerteHeures: plan?.seuilAlerteHeures ?? 50,
        });

    }, [open, plan, form]);

    async function onSubmit(values: FormValues): Promise<void> {
        setError("");
        setLoading(true);

        try {
            const payload = {
                code: values.code.trim(),
                name: values.name.trim(),
                description: values.description.trim() || null,
                intervalleHeures: Number(values.intervalleHeures),
                seuilAlerteHeures: Number(values.seuilAlerteHeures),
            };

            const result = plan
                ? await updatePlanMaintenance(plan.id, payload)
                : await createPlanMaintenance(payload);

            if (!result.success) {
                setError(result.message);
                return;
            }

            toast.success(result.message);
            setOpen(false);

            startTransition(() => {
                router.refresh();
            });
        } catch {
            toast.error("Une erreur inattendue est survenue.");
        } finally {
            setLoading(false);
        }
    }

    const disabled = loading || pending;

    return (
        <>
            <GlobalLoader show={pending} />

            <Dialog
                open={open}
                onOpenChange={(nextOpen) => {
                    setOpen(nextOpen);
                    if (nextOpen) setError("");
                }}
            >
                <DialogTrigger asChild>
                    <Button
                        type="button"
                        size={editing ? "icon" : "sm"}
                        variant={editing ? "ghost" : "default"}
                        title={editing ? "Modifier le plan" : "Créer un plan"}
                        aria-label={editing ? "Modifier le plan" : "Créer un plan"}
                    >
                        {editing ? (
                            <Pencil className="size-4" />
                        ) : (
                            <>
                                <Plus className="size-4" />
                                Ajouter un plan
                            </>
                        )}
                    </Button>
                </DialogTrigger>

                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {editing
                                ? "Modifier un plan de maintenance"
                                : "Créer un plan de maintenance"}
                        </DialogTitle>

                        <DialogDescription>
                            Définissez l&apos;intervalle de maintenance en heures et le seuil
                            d&apos;alerte anticipée. Le suivi de chaque engin sera calculé
                            séparément.
                        </DialogDescription>
                    </DialogHeader>

                    <DisplayError error={error} />

                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <FieldGroup className="gap-3">
                            <Field data-invalid={Boolean(form.formState.errors.code)}>
                                <FieldLabel htmlFor={`${formId}-code`}>
                                    Code
                                </FieldLabel>

                                <Input
                                    id={`${formId}-code`}
                                    {...form.register("code")}
                                    placeholder="ENT-250"
                                    maxLength={30}
                                    autoComplete="off"
                                    disabled={disabled}
                                    aria-invalid={Boolean(form.formState.errors.code)}
                                />

                                {form.formState.errors.code && (
                                    <FieldError errors={[form.formState.errors.code]} />
                                )}
                            </Field>

                            <Field data-invalid={Boolean(form.formState.errors.name)}>
                                <FieldLabel htmlFor={`${formId}-name`}>
                                    Nom du plan
                                </FieldLabel>

                                <Input
                                    id={`${formId}-name`}
                                    {...form.register("name")}
                                    placeholder="Entretien périodique 250 h"
                                    maxLength={150}
                                    disabled={disabled}
                                    aria-invalid={Boolean(form.formState.errors.name)}
                                />

                                {form.formState.errors.name && (
                                    <FieldError errors={[form.formState.errors.name]} />
                                )}
                            </Field>

                            <Field
                                data-invalid={Boolean(form.formState.errors.description)}
                            >
                                <FieldLabel htmlFor={`${formId}-description`}>
                                    Description (facultative)
                                </FieldLabel>

                                <Input
                                    id={`${formId}-description`}
                                    {...form.register("description")}
                                    placeholder="Description du plan"
                                    maxLength={500}
                                    disabled={disabled}
                                    aria-invalid={Boolean(
                                        form.formState.errors.description,
                                    )}
                                />

                                {form.formState.errors.description && (
                                    <FieldError
                                        errors={[form.formState.errors.description]}
                                    />
                                )}
                            </Field>

                            <Field
                                data-invalid={Boolean(
                                    form.formState.errors.intervalleHeures,
                                )}
                            >
                                <FieldLabel htmlFor={`${formId}-intervalle`}>
                                    Intervalle de maintenance (heures)
                                </FieldLabel>

                                <Input
                                    id={`${formId}-intervalle`}
                                    type="number"
                                    min="0.01"
                                    step="any"
                                    {...form.register("intervalleHeures", {
                                        valueAsNumber: true,
                                    })}
                                    disabled={disabled}
                                    aria-invalid={Boolean(
                                        form.formState.errors.intervalleHeures,
                                    )}
                                />

                                {form.formState.errors.intervalleHeures && (
                                    <FieldError
                                        errors={[form.formState.errors.intervalleHeures]}
                                    />
                                )}
                            </Field>

                            <Field
                                data-invalid={Boolean(
                                    form.formState.errors.seuilAlerteHeures,
                                )}
                            >
                                <FieldLabel htmlFor={`${formId}-seuil`}>
                                    Seuil d&apos;alerte anticipée (heures)
                                </FieldLabel>

                                <Input
                                    id={`${formId}-seuil`}
                                    type="number"
                                    min="0"
                                    step="any"
                                    {...form.register("seuilAlerteHeures", {
                                        valueAsNumber: true,
                                    })}
                                    disabled={disabled}
                                    aria-invalid={Boolean(
                                        form.formState.errors.seuilAlerteHeures,
                                    )}
                                />

                                {form.formState.errors.seuilAlerteHeures && (
                                    <FieldError
                                        errors={[form.formState.errors.seuilAlerteHeures]}
                                    />
                                )}
                            </Field>
                        </FieldGroup>

                        <DialogFooter className="mt-4">
                            <Button type="submit" disabled={disabled}>
                                {loading ? (
                                    <Spinner className="size-4" />
                                ) : editing ? (
                                    "Enregistrer"
                                ) : (
                                    "Créer le plan"
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}