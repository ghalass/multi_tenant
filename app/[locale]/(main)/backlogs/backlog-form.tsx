"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import {
    PrioriteBacklog,
    SourceBacklog,
    StatutBacklog,
} from "@/lib/generated/prisma/enums";

import type {
    BacklogEnginOption,
    BacklogFormValues,
    BacklogRecord,
    BacklogSiteOption,
} from "@/lib/types/backlog";

import { createBacklog, updateBacklog } from "@/server/backlogs";
import { GlobalLoader } from "@/components/global-loader";

function dateInput(value?: Date | string | null): string {
    if (!value) return "";
    return new Date(value).toISOString().slice(0, 10);
}

function emptyValues(): BacklogFormValues {
    return {
        numeroBacklog: "",
        dateDetection: new Date().toISOString().slice(0, 10),
        description: "",
        source: SourceBacklog.VS,
        priorite: PrioriteBacklog.MOYENNE,
        equipe: "",
        statut: StatutBacklog.ATTENTE_PROGRAMME,
        dateExecution: "",
        observations: "",
        enginId: "",
        siteId: "",
        commentaireChangementStatut: "",
    };
}

function recordToValues(record: BacklogRecord): BacklogFormValues {
    return {
        numeroBacklog: record.numeroBacklog,
        dateDetection: dateInput(record.dateDetection),
        description: record.description,
        source: record.source,
        priorite: record.priorite,
        equipe: record.equipe ?? "",
        statut: record.statut,
        dateExecution: dateInput(record.dateExecution),
        observations: record.observations ?? "",
        enginId: record.enginId,
        siteId: record.siteId,
        commentaireChangementStatut: "",
    };
}

function label(value: string) {
    return value.replaceAll("_", " ").toLowerCase();
}

function TextField({
    label: fieldLabel,
    value,
    onChange,
    type = "text",
    required = false,
    min,
}: {
    label: string;
    value: string | number;
    onChange: (value: string) => void;
    type?: string;
    required?: boolean;
    min?: number;
}) {
    return (
        <label className="block space-y-1.5">
            <span className="text-sm font-medium">{fieldLabel}</span>
            <Input
                type={type}
                value={value}
                min={min}
                required={required}
                onChange={(event) => onChange(event.target.value)}
            />
        </label>
    );
}

function TextAreaField({
    label: fieldLabel,
    value,
    onChange,
    required = false,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    required?: boolean;
}) {
    return (
        <label className="block space-y-1.5">
            <span className="text-sm font-medium">{fieldLabel}</span>
            <textarea
                value={value}
                required={required}
                onChange={(event) => onChange(event.target.value)}
                rows={3}
                className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
        </label>
    );
}

function SelectField({
    label: fieldLabel,
    value,
    onChange,
    options,
    placeholder,
    disabled = false,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    placeholder: string;
    disabled?: boolean;
}) {
    return (
        <label className="block space-y-1.5">
            <span className="text-sm font-medium">{fieldLabel}</span>
            <Select
                value={value || "none"}
                onValueChange={(next) => onChange(next === "none" ? "" : next)}
                disabled={disabled}
            >
                <SelectTrigger className="w-full">
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="none">{placeholder}</SelectItem>
                    {options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </label>
    );
}

export function BacklogForm({
    backlog,
    sites,
    engins,
}: {
    backlog?: BacklogRecord;
    sites: BacklogSiteOption[];
    engins: BacklogEnginOption[];
}) {
    const router = useRouter();
    const editing = Boolean(backlog);

    const [open, setOpen] = useState(false);
    const [pending, startTransition] = useTransition();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [values, setValues] = useState<BacklogFormValues>(
        backlog ? recordToValues(backlog) : emptyValues(),
    );

    const selectableEngins = useMemo(
        () =>
            engins.filter(
                (engin) =>
                    engin.active || engin.id === backlog?.enginId,
            ),
        [engins, backlog?.enginId],
    );

    const filteredEngins = selectableEngins.filter(
        (engin) => engin.siteId === values.siteId,
    );

    useEffect(() => {
        if (!open) return;

        setValues(backlog ? recordToValues(backlog) : emptyValues());
        setError("");
    }, [open, backlog]);

    function setField<K extends keyof BacklogFormValues>(
        key: K,
        value: BacklogFormValues[K],
    ) {
        setValues((current) => ({ ...current, [key]: value }));
    }

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");

        if (!values.siteId || !values.enginId) {
            setError("Sélectionnez un site et un engin.");
            return;
        }

        const selectedEngin = selectableEngins.find(
            (engin) => engin.id === values.enginId,
        );

        if (!selectedEngin || selectedEngin.siteId !== values.siteId) {
            setError("L'engin doit appartenir au site sélectionné.");
            return;
        }

        try {
            setLoading(true);

            const result = backlog
                ? await updateBacklog(backlog.id, values)
                : await createBacklog(values);

            if (!result.success) {
                setError(result.message);
                return;
            }

            toast.success(result.message);
            setOpen(false);

            startTransition(() => router.refresh());
        } catch {
            setError("Une erreur inattendue est survenue.");
        } finally {
            setLoading(false);
        }
    }

    const disabled = loading || pending;

    return (
        <>
            <GlobalLoader show={pending} />

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button
                        type="button"
                        size={editing ? "icon" : "sm"}
                        variant={editing ? "ghost" : "default"}
                        title={editing ? "Modifier le backlog" : "Ajouter un backlog"}
                        disabled={disabled}
                    >
                        {editing ? (
                            <Pencil className="size-4" />
                        ) : (
                            <>
                                <Plus className="mr-2 size-4" />
                                Nouveau backlog
                            </>
                        )}
                    </Button>
                </DialogTrigger>

                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl gap-2">
                    <DialogHeader>
                        <DialogTitle>
                            {editing ? "Modifier le backlog" : "Créer un backlog"}
                        </DialogTitle>
                        <DialogDescription>
                            Renseignez les informations du backlog, les besoins PDR
                            et son statut d'avancement.
                        </DialogDescription>
                    </DialogHeader>

                    {error && (
                        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                            {error}
                        </p>
                    )}

                    <form onSubmit={onSubmit} className="space-y-5 gap-2">
                        <div className="grid gap-2 sm:grid-cols-2 ">
                            <TextField
                                label="N° backlog"
                                value={values.numeroBacklog}
                                required
                                onChange={(value) => setField("numeroBacklog", value)}
                            />

                            <TextField
                                label="Date de détection"
                                type="date"
                                value={values.dateDetection}
                                required
                                onChange={(value) => setField("dateDetection", value)}
                            />

                            <SelectField
                                label="Source"
                                value={values.source}
                                placeholder="Choisir une source"
                                options={Object.values(SourceBacklog).map((value) => ({
                                    value,
                                    label: label(value),
                                }))}
                                onChange={(value) =>
                                    setField("source", value as BacklogFormValues["source"])
                                }
                            />

                            <SelectField
                                label="Priorité"
                                value={values.priorite}
                                placeholder="Choisir une priorité"
                                options={Object.values(PrioriteBacklog).map((value) => ({
                                    value,
                                    label: label(value),
                                }))}
                                onChange={(value) =>
                                    setField("priorite", value as BacklogFormValues["priorite"])
                                }
                            />

                            <SelectField
                                label="Site"
                                value={values.siteId}
                                placeholder="Choisir un site"
                                options={sites.map((site) => ({
                                    value: site.id,
                                    label: `${site.name}${site.active ? "" : " (inactif)"}`,
                                }))}
                                onChange={(siteId) => {
                                    setField("siteId", siteId);

                                    const currentEngin = selectableEngins.find(
                                        (engin) => engin.id === values.enginId,
                                    );

                                    if (!currentEngin || currentEngin.siteId !== siteId) {
                                        setField("enginId", "");
                                    }
                                }}
                            />

                            <SelectField
                                label="Engin"
                                value={values.enginId}
                                placeholder="Choisir un engin"
                                disabled={!values.siteId}
                                options={filteredEngins.map((engin) => ({
                                    value: engin.id,
                                    label: `${engin.name}${engin.active ? "" : " (inactif)"}`,
                                }))}
                                onChange={(enginId) => {
                                    const engin = selectableEngins.find(
                                        (item) => item.id === enginId,
                                    );

                                    setField("enginId", enginId);
                                    if (engin) setField("siteId", engin.siteId);
                                }}
                            />
                        </div>

                        <TextAreaField
                            label="Description"
                            value={values.description}
                            required
                            onChange={(value) => setField("description", value)}
                        />

                        <div className="grid gap-2 sm:grid-cols-3">

                            <TextField
                                label="Équipe"
                                value={values.equipe}
                                onChange={(value) => setField("equipe", value)}
                            />
                            <SelectField
                                label="Statut"
                                value={values.statut}
                                placeholder="Choisir un statut"
                                options={Object.values(StatutBacklog).map((value) => ({
                                    value,
                                    label: label(value),
                                }))}
                                onChange={(value) =>
                                    setField("statut", value as StatutBacklog)
                                }
                            />
                            <TextField
                                label="Date d'exécution"
                                type="date"
                                value={values.dateExecution}
                                onChange={(value) => setField("dateExecution", value)}
                            />
                        </div>

                        <TextAreaField
                            label="Observations"
                            value={values.observations}
                            onChange={(value) => setField("observations", value)}
                        />

                        {editing && backlog?.statut !== values.statut && (
                            <TextAreaField
                                label="Commentaire du changement de statut"
                                value={values.commentaireChangementStatut}
                                onChange={(value) =>
                                    setField("commentaireChangementStatut", value)
                                }
                            />
                        )}

                        <DialogFooter>
                            <Button type="submit" disabled={disabled}>
                                {loading
                                    ? "Enregistrement..."
                                    : editing
                                        ? "Enregistrer les modifications"
                                        : "Créer le backlog"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}