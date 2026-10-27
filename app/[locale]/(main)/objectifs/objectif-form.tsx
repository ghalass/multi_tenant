"use client";

import { useState, useTransition, type JSX } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { PenIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import yup from "@/lib/yupFr";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Field, FieldError, FieldGroup, FieldLabel,
} from "@/components/ui/field";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { GlobalLoader } from "@/components/global-loader";
import DisplayError from "@/components/display-error";
import { createObjectif, ObjectifInput, updateObjectif } from "@/server/objectifs";

type Option = { id: string; name: string };
type ParcOption = Option & { typeparcId: string };
type Objectif = ObjectifInput & { id: string };

const metricFields = [
    { name: "dispo", label: "Disponibilité (%)" },
    { name: "mtbf", label: "MTBF (h)" },
    { name: "tdm", label: "TDM (%)" },
    { name: "spe_huile", label: "Spécification huile" },
    { name: "spe_go", label: "Spécification gasoil" },
    { name: "spe_graisse", label: "Spécification graisse" },
] as const;

const schema = yup.object({
    annee: yup.number().typeError("Saisissez une année.")
        .integer("L'année doit être entière.")
        .min(1900, "L'année doit être supérieure à 1900.")
        .max(9999, "L'année est invalide.")
        .required("L'année est obligatoire."),
    siteId: yup.string().required("Sélectionnez un site."),
    typeparcId: yup.string().required("Sélectionnez un type de parc."),
    parcId: yup.string().required("Sélectionnez un parc."),
    dispo: yup.number().nullable().min(0, "La valeur doit être positive ou nulle."),
    mtbf: yup.number().nullable().min(0, "La valeur doit être positive ou nulle."),
    tdm: yup.number().nullable().min(0, "La valeur doit être positive ou nulle."),
    spe_huile: yup.number().nullable().min(0, "La valeur doit être positive ou nulle."),
    spe_go: yup.number().nullable().min(0, "La valeur doit être positive ou nulle."),
    spe_graisse: yup.number().nullable().min(0, "La valeur doit être positive ou nulle."),
});

type FormValues = yup.InferType<typeof schema>;

function ObjectifForm({
    objectif,
    sites,
    typeparcs,
    parcs,
}: {
    objectif?: Objectif;
    sites: Option[];
    typeparcs: Option[];
    parcs: ParcOption[];
}): JSX.Element {
    const editing = Boolean(objectif);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState("");
    const router = useRouter();

    const form = useForm<FormValues>({
        resolver: yupResolver(schema),
        defaultValues: {
            annee: objectif?.annee ?? new Date().getFullYear(),
            siteId: objectif?.siteId ?? "",
            typeparcId: parcs.find((parc) => parc.id === objectif?.parcId)?.typeparcId ?? "",
            parcId: objectif?.parcId ?? "",
            dispo: objectif?.dispo ?? null,
            mtbf: objectif?.mtbf ?? null,
            tdm: objectif?.tdm ?? null,
            spe_huile: objectif?.spe_huile ?? null,
            spe_go: objectif?.spe_go ?? null,
            spe_graisse: objectif?.spe_graisse ?? null,
        },
    });
    const selectedTypeparcId = form.watch("typeparcId");
    const filteredParcs = parcs.filter((parc) => parc.typeparcId === selectedTypeparcId);

    function handleOpenChange(nextOpen: boolean): void {
        setOpen(nextOpen);
        if (!nextOpen) {
            form.reset({
                annee: objectif?.annee ?? new Date().getFullYear(),
                siteId: objectif?.siteId ?? "",
                typeparcId: parcs.find((parc) => parc.id === objectif?.parcId)?.typeparcId ?? "",
                parcId: objectif?.parcId ?? "",
                dispo: objectif?.dispo ?? null,
                mtbf: objectif?.mtbf ?? null,
                tdm: objectif?.tdm ?? null,
                spe_huile: objectif?.spe_huile ?? null,
                spe_go: objectif?.spe_go ?? null,
                spe_graisse: objectif?.spe_graisse ?? null,
            });
            setError("");
        }
    }

    async function onSubmit(values: FormValues): Promise<void> {
        try {
            setLoading(true);
            setError("");

            const payload: ObjectifInput = {
                annee: Number(values.annee),
                siteId: values.siteId,
                parcId: values.parcId,
                dispo: values.dispo ?? null,
                mtbf: values.mtbf ?? null,
                tdm: values.tdm ?? null,
                spe_huile: values.spe_huile ?? null,
                spe_go: values.spe_go ?? null,
                spe_graisse: values.spe_graisse ?? null,
            };
            const result = editing
                ? await updateObjectif({ ...payload, id: objectif!.id })
                : await createObjectif(payload);

            if (!result.success) {
                setError(result.message);
                return;
            }

            startTransition(() => router.refresh());
            toast.success(result.message);
            setOpen(false);
        } catch {
            setError("Une erreur inattendue est survenue.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <GlobalLoader show={pending} />
            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogTrigger
                    aria-label={editing ? "Modifier l'objectif" : "Créer un objectif"}
                    className={editing
                        ? "text-primary hover:cursor-pointer"
                        : "inline-flex items-center justify-center rounded-full bg-primary p-1 text-primary-foreground hover:bg-primary/90"}
                >
                    {editing ? <PenIcon className="size-4" /> : <PlusIcon className="size-4" />}
                </DialogTrigger>

                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editing ? "Modifier l'objectif" : "Créer un objectif"}</DialogTitle>
                        <DialogDescription>
                            Définissez les objectifs annuels d&apos;un site et d&apos;un parc. Les indicateurs sont facultatifs.
                        </DialogDescription>
                        <DisplayError error={error} />
                    </DialogHeader>

                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <FieldGroup className="gap-3">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <Controller name="annee" control={form.control} render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel>Année</FieldLabel>
                                        <Input
                                            type="number"
                                            min={1900}
                                            max={9999}
                                            step={1}
                                            value={field.value ?? ""}
                                            onChange={(event) => field.onChange(event.target.value === "" ? "" : Number(event.target.value))}
                                            disabled={loading}
                                            aria-invalid={fieldState.invalid}
                                        />
                                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                    </Field>
                                )} />
                                <Controller name="siteId" control={form.control} render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel>Site</FieldLabel>
                                        <Select value={field.value} onValueChange={field.onChange} disabled={loading}>
                                            <SelectTrigger aria-invalid={fieldState.invalid}>
                                                <SelectValue placeholder="Sélectionner un site" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {sites.map((site) => <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                    </Field>
                                )} />
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <Controller name="typeparcId" control={form.control} render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel>Type de parc</FieldLabel>
                                        <Select
                                            value={field.value}
                                            onValueChange={(value) => {
                                                field.onChange(value);
                                                form.setValue("parcId", "", { shouldValidate: true });
                                            }}
                                            disabled={loading}
                                        >
                                            <SelectTrigger aria-invalid={fieldState.invalid}>
                                                <SelectValue placeholder="Sélectionner un type de parc" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {typeparcs.map((typeparc) => (
                                                    <SelectItem key={typeparc.id} value={typeparc.id}>{typeparc.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                    </Field>
                                )} />
                                <Controller name="parcId" control={form.control} render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel>Parc</FieldLabel>
                                        <Select value={field.value} onValueChange={field.onChange} disabled={loading || !selectedTypeparcId}>
                                            <SelectTrigger aria-invalid={fieldState.invalid}>
                                                <SelectValue placeholder="Sélectionner un type de parc d'abord" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {filteredParcs.map((parc) => <SelectItem key={parc.id} value={parc.id}>{parc.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                    </Field>
                                )} />
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                {metricFields.map(({ name, label }) => (
                                    <Controller key={name} name={name} control={form.control} render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel>{label}</FieldLabel>
                                            <Input
                                                type="number"
                                                min={0}
                                                step="any"
                                                value={field.value ?? ""}
                                                onChange={(event) => field.onChange(event.target.value === "" ? null : Number(event.target.value))}
                                                disabled={loading}
                                                aria-invalid={fieldState.invalid}
                                            />
                                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                        </Field>
                                    )} />
                                ))}
                            </div>
                        </FieldGroup>

                        <DialogFooter className="mt-4 sm:justify-start">
                            <Button type="submit" variant="outline" disabled={loading}>
                                {loading ? <Spinner className="size-4" /> : editing ? "Modifier" : "Créer"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

export function CreateObjectifForm(props: {
    sites: Option[];
    typeparcs: Option[];
    parcs: ParcOption[];
}): JSX.Element {
    return <ObjectifForm {...props} />;
}

export function UpdateObjectifForm(props: {
    objectif: Objectif;
    sites: Option[];
    typeparcs: Option[];
    parcs: ParcOption[];
}): JSX.Element {
    return <ObjectifForm {...props} />;
}
