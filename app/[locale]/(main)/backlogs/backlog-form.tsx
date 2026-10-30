"use client";

import {
    useMemo,
    useState,
    useTransition,
    type FormEvent,
} from "react";
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
    BacklogParcOption,
    BacklogRecord,
    BacklogSiteOption,
    BacklogTypeparcOption,
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

        // Une date d'exécution n'est conservée que si le statut est EXECUTE.
        dateExecution:
            record.statut === StatutBacklog.EXECUTE
                ? dateInput(record.dateExecution)
                : "",

        observations: record.observations ?? "",
        enginId: record.enginId,
        siteId: record.siteId,
        commentaireChangementStatut: "",
    };
}

function label(value: string): string {
    return value.replaceAll("_", " ").toLowerCase();
}

function TextField({
    label: fieldLabel,
    value,
    onChange,
    type = "text",
    required = false,
    min,
    disabled = false,
}: {
    label: string;
    value: string | number;
    onChange: (value: string) => void;
    type?: string;
    required?: boolean;
    min?: number;
    disabled?: boolean;
}): import("react").JSX.Element {
    return (
        <label className="block min-w-0 space-y-1">
            <span className="text-xs font-medium">
                {fieldLabel}
            </span>

            <Input
                className="h-8 px-2 text-sm"
                type={type}
                value={value}
                min={min}
                required={required}
                disabled={disabled}
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
}): import("react").JSX.Element {
    return (
        <label className="block space-y-1">
            <span className="text-xs font-medium">
                {fieldLabel}
            </span>

            <textarea
                value={value}
                required={required}
                onChange={(event) => onChange(event.target.value)}
                rows={2}
                className="flex min-h-16 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
    options: {
        value: string;
        label: string;
    }[];
    placeholder: string;
    disabled?: boolean;
}): import("react").JSX.Element {
    return (
        <label className="block min-w-0 space-y-1">
            <span className="text-xs font-medium">
                {fieldLabel}
            </span>

            <Select
                value={value || "none"}
                onValueChange={(next) =>
                    onChange(next === "none" ? "" : next)
                }
                disabled={disabled}
            >
                <SelectTrigger className="h-8 w-full px-2 text-sm">
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>

                <SelectContent>
                    <SelectItem value="none">
                        {placeholder}
                    </SelectItem>

                    {options.map((option) => (
                        <SelectItem
                            key={option.value}
                            value={option.value}
                        >
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
    typeparcs,
    parcs,
    sites,
    engins,
}: {
    backlog?: BacklogRecord;
    typeparcs: BacklogTypeparcOption[];
    parcs: BacklogParcOption[];
    sites: BacklogSiteOption[];
    engins: BacklogEnginOption[];
}): import("react").JSX.Element {
    const router = useRouter();
    const editing = Boolean(backlog);

    const initialEngin = engins.find(
        (engin) => engin.id === backlog?.enginId,
    );

    const initialParc = parcs.find(
        (parc) => parc.id === initialEngin?.parcId,
    );

    const [open, setOpen] = useState(false);
    const [pending, startTransition] = useTransition();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [values, setValues] = useState<BacklogFormValues>(
        backlog ? recordToValues(backlog) : emptyValues(),
    );

    const [selectedTypeparcId, setSelectedTypeparcId] = useState(
        initialParc?.typeparcId ?? "",
    );

    const [selectedParcId, setSelectedParcId] = useState(
        initialEngin?.parcId ?? "",
    );

    /*
     * En modification, conserver l'engin courant même s'il est inactif.
     * En création, ne proposer que les engins actifs.
     */
    const selectableEngins = useMemo(
        () =>
            engins.filter(
                (engin) =>
                    engin.active || engin.id === backlog?.enginId,
            ),
        [engins, backlog?.enginId],
    );

    /*
     * Les parcs proposés doivent appartenir au type de parc sélectionné
     * et disposer d'au moins un engin sélectionnable.
     */
    const filteredParcs = useMemo(
        () =>
            parcs.filter(
                (parc) =>
                    parc.typeparcId === selectedTypeparcId &&
                    selectableEngins.some(
                        (engin) => engin.parcId === parc.id,
                    ),
            ),
        [parcs, selectableEngins, selectedTypeparcId],
    );

    /*
     * Un site est proposé uniquement s'il contient un engin
     * appartenant au parc sélectionné.
     */
    const filteredSites = useMemo(
        () =>
            sites.filter((site) =>
                selectableEngins.some(
                    (engin) =>
                        engin.parcId === selectedParcId &&
                        engin.siteId === site.id,
                ),
            ),
        [sites, selectableEngins, selectedParcId],
    );

    /*
     * L'engin doit appartenir simultanément au parc et au site choisis.
     */
    const filteredEngins = useMemo(
        () =>
            selectableEngins.filter(
                (engin) =>
                    engin.parcId === selectedParcId &&
                    engin.siteId === values.siteId,
            ),
        [selectableEngins, selectedParcId, values.siteId],
    );

    function handleOpenChange(nextOpen: boolean): void {
        setOpen(nextOpen);
        if (!nextOpen) return;
        const currentEngin = engins.find(
            (engin) => engin.id === backlog?.enginId,
        );

        const currentParc = parcs.find(
            (parc) => parc.id === currentEngin?.parcId,
        );

        setSelectedTypeparcId(currentParc?.typeparcId ?? "");
        setSelectedParcId(currentParc?.id ?? "");

        setValues(backlog ? recordToValues(backlog) : emptyValues());
        setError("");
    }

    function setField<K extends keyof BacklogFormValues>(
        key: K,
        value: BacklogFormValues[K],
    ): void {
        setValues((current) => ({
            ...current,
            [key]: value,
        }));
    }

    async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
        event.preventDefault();
        setError("");

        if (
            !selectedTypeparcId ||
            !selectedParcId ||
            !values.siteId ||
            !values.enginId
        ) {
            setError(
                "Sélectionnez un type de parc, un parc, un site et un engin.",
            );
            return;
        }

        const selectedParc = parcs.find(
            (parc) => parc.id === selectedParcId,
        );

        if (
            !selectedParc ||
            selectedParc.typeparcId !== selectedTypeparcId
        ) {
            setError(
                "Le parc doit appartenir au type de parc sélectionné.",
            );
            return;
        }

        const selectedEngin = selectableEngins.find(
            (engin) => engin.id === values.enginId,
        );

        if (
            !selectedEngin ||
            selectedEngin.parcId !== selectedParcId ||
            selectedEngin.siteId !== values.siteId
        ) {
            setError(
                "L'engin doit appartenir au parc et au site sélectionnés.",
            );
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

            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogTrigger asChild>
                    <Button
                        type="button"
                        size={editing ? "icon" : "sm"}
                        variant={editing ? "ghost" : "default"}
                        title={
                            editing
                                ? "Modifier le backlog"
                                : "Ajouter un backlog"
                        }
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

                <DialogContent className="max-h-[90vh] gap-2 overflow-y-auto sm:max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>
                            {editing
                                ? "Modifier le backlog"
                                : "Créer un backlog"}
                        </DialogTitle>

                        <DialogDescription>
                            Renseignez les informations du backlog,
                            sélectionnez le type de parc, le parc,
                            le site et l&apos;engin, puis précisez son statut.
                        </DialogDescription>
                    </DialogHeader>

                    {error && (
                        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                            {error}
                        </p>
                    )}

                    <form
                        onSubmit={onSubmit}
                        className="space-y-3"
                    >
                        {/* Ligne 1 : N° backlog, date et source */}
                        <div className="grid gap-x-2 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                            <TextField
                                label="N° backlog"
                                value={values.numeroBacklog}
                                required
                                disabled={disabled}
                                onChange={(value) =>
                                    setField("numeroBacklog", value)
                                }
                            />

                            <TextField
                                label="Date de détection"
                                type="date"
                                value={values.dateDetection}
                                required
                                disabled={disabled}
                                onChange={(value) =>
                                    setField("dateDetection", value)
                                }
                            />

                            <SelectField
                                label="Source"
                                value={values.source}
                                placeholder="Choisir une source"
                                disabled={disabled}
                                options={Object.values(SourceBacklog).map(
                                    (value) => ({
                                        value,
                                        label: label(value),
                                    }),
                                )}
                                onChange={(value) =>
                                    setField(
                                        "source",
                                        value as BacklogFormValues["source"],
                                    )
                                }
                            />

                        </div>

                        {/* Ligne 2 : priorité et choix du parc */}
                        <div className="grid gap-x-2 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                            <SelectField
                                label="Priorité"
                                value={values.priorite}
                                placeholder="Choisir une priorité"
                                disabled={disabled}
                                options={Object.values(PrioriteBacklog).map(
                                    (value) => ({
                                        value,
                                        label: label(value),
                                    }),
                                )}
                                onChange={(value) =>
                                    setField(
                                        "priorite",
                                        value as BacklogFormValues["priorite"],
                                    )
                                }
                            />

                            <SelectField
                                label="Type de parc"
                                value={selectedTypeparcId}
                                placeholder="Choisir un type de parc"
                                disabled={disabled}
                                options={typeparcs.map((typeparc) => ({
                                    value: typeparc.id,
                                    label: typeparc.name,
                                }))}
                                onChange={(typeparcId) => {
                                    setSelectedTypeparcId(typeparcId);
                                    setSelectedParcId("");

                                    setField("siteId", "");
                                    setField("enginId", "");
                                }}
                            />

                            <SelectField
                                label="Parc"
                                value={selectedParcId}
                                placeholder="Choisir un parc"
                                disabled={
                                    disabled ||
                                    !selectedTypeparcId ||
                                    filteredParcs.length === 0
                                }
                                options={filteredParcs.map((parc) => ({
                                    value: parc.id,
                                    label: parc.name,
                                }))}
                                onChange={(parcId) => {
                                    setSelectedParcId(parcId);

                                    // Le changement de parc invalide
                                    // les anciennes sélections site/engin.
                                    setField("siteId", "");
                                    setField("enginId", "");
                                }}
                            />
                        </div>

                        {/* Ligne 3 : site -> engin */}
                        <div className="grid gap-x-2 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                            <SelectField
                                label="Site"
                                value={values.siteId}
                                placeholder="Choisir un site"
                                disabled={
                                    disabled ||
                                    !selectedParcId ||
                                    filteredSites.length === 0
                                }
                                options={filteredSites.map((site) => ({
                                    value: site.id,
                                    label: `${site.name}${site.active ? "" : " (inactif)"}`,
                                }))}
                                onChange={(siteId) => {
                                    setField("siteId", siteId);

                                    // Le nouvel emplacement peut avoir
                                    // un ensemble d'engins différent.
                                    setField("enginId", "");
                                }}
                            />

                            <SelectField
                                label="Engin"
                                value={values.enginId}
                                placeholder="Choisir un engin"
                                disabled={
                                    disabled ||
                                    !selectedParcId ||
                                    !values.siteId ||
                                    filteredEngins.length === 0
                                }
                                options={filteredEngins.map((engin) => ({
                                    value: engin.id,
                                    label: `${engin.name}${engin.active ? "" : " (inactif)"}`,
                                }))}
                                onChange={(enginId) => {
                                    const engin = selectableEngins.find(
                                        (item) => item.id === enginId,
                                    );

                                    if (!engin) {
                                        setField("enginId", "");
                                        return;
                                    }

                                    const parc = parcs.find(
                                        (item) => item.id === engin.parcId,
                                    );

                                    setSelectedTypeparcId(
                                        parc?.typeparcId ?? "",
                                    );
                                    setSelectedParcId(engin.parcId);

                                    setField("siteId", engin.siteId);
                                    setField("enginId", engin.id);
                                }}
                            />

                            <TextField
                                label="Équipe"
                                value={values.equipe}
                                disabled={disabled}
                                onChange={(value) =>
                                    setField("equipe", value)
                                }
                            />
                        </div>

                        <TextAreaField
                            label="Description"
                            value={values.description}
                            required
                            onChange={(value) =>
                                setField("description", value)
                            }
                        />

                        <div className="grid gap-x-2 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                            <SelectField
                                label="Statut"
                                value={values.statut}
                                placeholder="Choisir un statut"
                                disabled={disabled}
                                options={Object.values(StatutBacklog).map(
                                    (value) => ({
                                        value,
                                        label: label(value),
                                    }),
                                )}
                                onChange={(value) => {
                                    const nextStatut = value as StatutBacklog;

                                    setField("statut", nextStatut);

                                    // La date ne s'applique qu'au statut EXECUTE.
                                    if (
                                        nextStatut !== StatutBacklog.EXECUTE
                                    ) {
                                        setField("dateExecution", "");
                                    }
                                }}
                            />

                            <TextField
                                label="Date d'exécution"
                                type="date"
                                value={values.dateExecution}
                                disabled={
                                    disabled ||
                                    values.statut !== StatutBacklog.EXECUTE
                                }
                                onChange={(value) =>
                                    setField("dateExecution", value)
                                }
                            />
                        </div>

                        <TextAreaField
                            label="Observations"
                            value={values.observations}
                            onChange={(value) =>
                                setField("observations", value)
                            }
                        />

                        {editing && backlog?.statut !== values.statut && (
                            <TextAreaField
                                label="Commentaire du changement de statut"
                                value={values.commentaireChangementStatut}
                                onChange={(value) =>
                                    setField(
                                        "commentaireChangementStatut",
                                        value,
                                    )
                                }
                            />
                        )}

                        <DialogFooter>
                            <Button
                                type="submit"
                                disabled={disabled}
                            >
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