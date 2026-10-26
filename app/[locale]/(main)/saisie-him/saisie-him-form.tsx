"use client";

import {
    useEffect,
    useMemo,
    useState,
    useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import yup from "@/lib/yupFr";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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
import { sleep } from "@/lib/utils";

import {
    createSaisieHim,
    updateSaisieHim,
} from "@/server/saisie_him";

type Option = {
    id: string;
    name: string;
};

type ParcOption = Option & {
    typeparcId: string;
};

type EnginOption = Option & {
    siteId: string;
    parcId: string;
    active: boolean;
};

type PanneOption = Option & {
    description?: string | null;
    typepanneId: string;
    parcs: Option[];
};

type SaisieHimItem = {
    id: string;
    du: string;
    siteId: string;
    typeparcId: string;
    parcId: string;
    enginId: string;
    panneId: string;
    him: number;
    ni: number;
    obs: string | null;
};

const schema = yup.object({
    du: yup.string().required("La date est obligatoire."),
    siteId: yup.string().required("Sélectionnez un site."),
    typeparcId: yup.string().required("Sélectionnez un type de parc."),
    parcId: yup.string().required("Sélectionnez un parc."),
    enginId: yup.string().required("Sélectionnez un engin."),
    typepanneId: yup.string().required("Sélectionnez un type de panne."),
    panneId: yup.string().required("Sélectionnez une panne."),
    him: yup
        .number()
        .typeError("Saisissez une valeur numérique.")
        .min(0, "HIM doit être positif ou nul.")
        .required("HIM est obligatoire."),
    ni: yup
        .number()
        .typeError("NI doit être un nombre entier.")
        .integer("NI doit être un nombre entier.")
        .min(0, "NI doit être positif ou nul.")
        .required("NI est obligatoire."),
    obs: yup
        .string()
        .max(1000, "1000 caractères maximum.")
        .nullable()
        .defined(),
});

type FormValues = yup.InferType<typeof schema>;

export function SaisieHimForm({
    saisie,
    typeParcs,
    typePannes,
    parcs,
    engins,
    sites,
    pannes,
}: {
    saisie?: SaisieHimItem;
    typeParcs: Option[];
    typePannes: Option[];
    parcs: ParcOption[];
    engins: EnginOption[];
    sites: Option[];
    pannes: PanneOption[];
}) {
    const editing = Boolean(saisie);
    const router = useRouter();

    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState("");

    // Pour modifier une ancienne saisie, conserver son engin même s'il est inactif.
    const selectableEngins = useMemo(
        () =>
            engins.filter(
                (engin) => engin.active || engin.id === saisie?.enginId,
            ),
        [engins, saisie?.enginId],
    );

    const form = useForm<FormValues>({
        resolver: yupResolver(schema),
        defaultValues: {
            du: saisie?.du ?? new Date().toISOString().slice(0, 10),
            siteId: saisie?.siteId ?? "",
            typeparcId: saisie?.typeparcId ?? "",
            typepanneId:
                pannes.find((panne) => panne.id === saisie?.panneId)?.typepanneId ?? "",
            parcId: saisie?.parcId ?? "",
            enginId: saisie?.enginId ?? "",
            panneId: saisie?.panneId ?? "",
            him: saisie?.him ?? 0,
            ni: saisie?.ni ?? 1,
            obs: saisie?.obs ?? "",
        },
    });

    const selectedSiteId = form.watch("siteId");
    const selectedTypeParcId = form.watch("typeparcId");
    const selectedParcId = form.watch("parcId");
    const selectedTypePanneId = form.watch("typepanneId");

    const filteredParcs = useMemo(
        () =>
            parcs.filter((parc) => {
                const matchesType = parc.typeparcId === selectedTypeParcId;

                const hasEnginOnSite = selectableEngins.some(
                    (engin) =>
                        engin.siteId === selectedSiteId &&
                        engin.parcId === parc.id,
                );

                return (
                    Boolean(selectedSiteId) &&
                    Boolean(selectedTypeParcId) &&
                    matchesType &&
                    hasEnginOnSite
                );
            }),
        [
            parcs,
            selectableEngins,
            selectedSiteId,
            selectedTypeParcId,
        ],
    );

    const filteredEngins = useMemo(
        () =>
            selectableEngins.filter(
                (engin) =>
                    engin.siteId === selectedSiteId &&
                    engin.parcId === selectedParcId,
            ),
        [selectableEngins, selectedSiteId, selectedParcId],
    );

    const filteredPannes = useMemo(
        () =>
            pannes.filter(
                (panne) =>
                    panne.typepanneId === selectedTypePanneId &&
                    panne.parcs.some((parc) => parc.id === selectedParcId),
            ),
        [pannes, selectedTypePanneId, selectedParcId],
    );

    useEffect(() => {
        if (!open) return;

        const currentSaisie = saisie;

        form.reset({
            du:
                currentSaisie?.du ??
                new Date().toISOString().slice(0, 10),
            siteId: currentSaisie?.siteId ?? "",
            typeparcId: currentSaisie?.typeparcId ?? "",
            typepanneId:
                pannes.find((panne) => panne.id === currentSaisie?.panneId)?.typepanneId ?? "",
            parcId: currentSaisie?.parcId ?? "",
            enginId: currentSaisie?.enginId ?? "",
            panneId: currentSaisie?.panneId ?? "",
            him: currentSaisie?.him ?? 0,
            ni: currentSaisie?.ni ?? 1,
            obs: currentSaisie?.obs ?? "",
        });

        setError("");
    }, [open, saisie, form]);

    async function onSubmit(values: FormValues) {
        setError("");

        const selectedEngin = selectableEngins.find(
            (engin) => engin.id === values.enginId,
        );

        if (!selectedEngin) {
            setError("Sélectionnez un engin valide.");
            return;
        }

        if (
            selectedEngin.siteId !== values.siteId ||
            selectedEngin.parcId !== values.parcId
        ) {
            setError(
                "Le site et le parc doivent correspondre à l'engin sélectionné.",
            );
            return;
        }

        const selectedParc = parcs.find(
            (parc) => parc.id === selectedEngin.parcId,
        );

        if (!selectedParc || selectedParc.typeparcId !== values.typeparcId) {
            setError("Le type de parc ne correspond pas à l'engin.");
            return;
        }

        if (
            !filteredPannes.some(
                (panne) =>
                    panne.id === values.panneId &&
                    panne.typepanneId === values.typepanneId,
            )
        ) {
            setError(
                "Choisissez une panne correspondant au type de panne et au parc sélectionnés.",
            );
            return;
        }

        try {
            setLoading(true);
            await sleep();

            const payload = {
                du: values.du,
                siteId: selectedEngin.siteId,
                enginId: selectedEngin.id,
                panneId: values.panneId,
                him: Number(values.him),
                ni: Number(values.ni),
                obs: values.obs?.trim() || null,
            };

            const result = saisie
                ? await updateSaisieHim({
                    ...payload,
                    id: saisie.id,
                })
                : await createSaisieHim(payload);

            if (!result.success) {
                setError(result.message ?? "Une erreur est survenue.");
                return;
            }

            toast.success(result.message ?? "Opération effectuée.");
            setOpen(false);

            startTransition(() => {
                router.refresh();
            });
        } catch {
            setError("Une erreur inattendue est survenue.");
        } finally {
            setLoading(false);
        }
    }

    const selectedPanneId = form.watch("panneId");

    const selectedPanne = pannes.find(
        (panne) => panne.id === selectedPanneId,
    );

    return (
        <>
            <GlobalLoader show={pending} />

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button
                        type="button"
                        size={editing ? "icon" : "sm"}
                        variant={editing ? "ghost" : "default"}
                        title={editing ? "Modifier la saisie HIM" : "Ajouter une saisie HIM"}
                        aria-label={editing ? "Modifier la saisie HIM" : "Ajouter une saisie HIM"}
                        disabled={
                            loading ||
                            typeParcs.length === 0 ||
                            parcs.length === 0 ||
                            engins.length === 0 ||
                            sites.length === 0 ||
                            pannes.length === 0
                        }
                    >
                        {editing ? (
                            <Pencil className="size-4" />
                        ) : (
                            <>
                                <Plus className="size-4" />
                                Ajouter
                            </>
                        )}
                    </Button>
                </DialogTrigger>

                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {editing ? "Modifier une saisie HIM" : "Ajouter une saisie HIM"}
                        </DialogTitle>

                        <DialogDescription>
                            La date et l'engin doivent correspondre à une saisie HRM existante.
                            La panne doit être associée au parc sélectionné.
                        </DialogDescription>
                    </DialogHeader>

                    <DisplayError error={error} />

                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <FieldGroup className="gap-2">
                            <Controller
                                name="du"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="him-date">Date</FieldLabel>
                                        <Input
                                            id="him-date"
                                            type="date"
                                            {...field}
                                            disabled={loading}
                                            aria-invalid={fieldState.invalid}
                                        />
                                        {fieldState.invalid && (
                                            <FieldError errors={[fieldState.error]} />
                                        )}
                                    </Field>
                                )}
                            />

                            <Controller
                                name="siteId"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel>Site</FieldLabel>
                                        <Select
                                            value={field.value || "none"}
                                            onValueChange={(value) => {
                                                field.onChange(value === "none" ? "" : value);
                                                form.setValue("typeparcId", "");
                                                form.setValue("parcId", "");
                                                form.setValue("enginId", "");
                                                form.setValue("typepanneId", "");
                                                form.setValue("panneId", "");
                                            }}
                                            disabled={loading}
                                        >
                                            <SelectTrigger
                                                className="w-full"
                                                aria-invalid={fieldState.invalid}
                                            >
                                                <SelectValue placeholder="Sélectionner un site" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Sélectionner un site</SelectItem>
                                                {sites.map((site) => (
                                                    <SelectItem key={site.id} value={site.id}>
                                                        {site.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {fieldState.invalid && (
                                            <FieldError errors={[fieldState.error]} />
                                        )}
                                    </Field>
                                )}
                            />

                            <Controller
                                name="typeparcId"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel>Type de parc</FieldLabel>
                                        <Select
                                            value={field.value || "none"}
                                            onValueChange={(value) => {
                                                field.onChange(value === "none" ? "" : value);
                                                form.setValue("parcId", "");
                                                form.setValue("enginId", "");
                                                form.setValue("typepanneId", "");
                                                form.setValue("panneId", "");
                                            }}
                                            disabled={loading || !selectedSiteId}
                                        >
                                            <SelectTrigger
                                                className="w-full"
                                                aria-invalid={fieldState.invalid}
                                            >
                                                <SelectValue placeholder="Sélectionner un type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">
                                                    Sélectionner un type
                                                </SelectItem>
                                                {typeParcs.map((typeParc) => (
                                                    <SelectItem key={typeParc.id} value={typeParc.id}>
                                                        {typeParc.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {fieldState.invalid && (
                                            <FieldError errors={[fieldState.error]} />
                                        )}
                                    </Field>
                                )}
                            />

                            <Controller
                                name="parcId"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel>Parc</FieldLabel>
                                        <Select
                                            value={field.value || "none"}
                                            onValueChange={(value) => {
                                                field.onChange(value === "none" ? "" : value);
                                                form.setValue("enginId", "");
                                                form.setValue("panneId", "");
                                                form.setValue("typepanneId", "");
                                            }}
                                            disabled={loading || filteredParcs.length === 0}
                                        >
                                            <SelectTrigger
                                                className="w-full"
                                                aria-invalid={fieldState.invalid}
                                            >
                                                <SelectValue placeholder="Sélectionner un parc" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">
                                                    Sélectionner un parc
                                                </SelectItem>
                                                {filteredParcs.map((parc) => (
                                                    <SelectItem key={parc.id} value={parc.id}>
                                                        {parc.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {fieldState.invalid && (
                                            <FieldError errors={[fieldState.error]} />
                                        )}
                                    </Field>
                                )}
                            />

                            <Controller
                                name="enginId"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel>Engin</FieldLabel>
                                        <Select
                                            value={field.value || "none"}
                                            onValueChange={(value) => {
                                                if (value === "none") {
                                                    field.onChange("");
                                                    form.setValue("typepanneId", "");
                                                    form.setValue("panneId", "");
                                                    return;
                                                }

                                                const engin = selectableEngins.find(
                                                    (item) => item.id === value,
                                                );

                                                if (!engin) return;

                                                field.onChange(engin.id);
                                                form.setValue("siteId", engin.siteId);
                                                form.setValue("parcId", engin.parcId);
                                                form.setValue("typepanneId", "");

                                                const parc = parcs.find(
                                                    (item) => item.id === engin.parcId,
                                                );

                                                form.setValue("typeparcId", parc?.typeparcId ?? "");
                                                form.setValue("panneId", "");
                                            }}
                                            disabled={loading || filteredEngins.length === 0}
                                        >
                                            <SelectTrigger
                                                className="w-full"
                                                aria-invalid={fieldState.invalid}
                                            >
                                                <SelectValue placeholder="Sélectionner un engin" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">
                                                    Sélectionner un engin
                                                </SelectItem>
                                                {filteredEngins.map((engin) => (
                                                    <SelectItem key={engin.id} value={engin.id}>
                                                        {engin.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {fieldState.invalid && (
                                            <FieldError errors={[fieldState.error]} />
                                        )}
                                    </Field>
                                )}
                            />

                            <Controller
                                name="typepanneId"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel>Type de panne</FieldLabel>

                                        <Select
                                            value={field.value || "none"}
                                            onValueChange={(value) => {
                                                field.onChange(value === "none" ? "" : value);
                                                form.setValue("panneId", "");
                                            }}
                                            disabled={loading || !selectedParcId}
                                        >
                                            <SelectTrigger
                                                className="w-full"
                                                aria-invalid={fieldState.invalid}
                                            >
                                                <SelectValue placeholder="Sélectionner un type de panne" />
                                            </SelectTrigger>

                                            <SelectContent>
                                                <SelectItem value="none">
                                                    Sélectionner un type de panne
                                                </SelectItem>

                                                {typePannes.map((typePanne) => (
                                                    <SelectItem
                                                        key={typePanne.id}
                                                        value={typePanne.id}
                                                    >
                                                        {typePanne.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        {fieldState.invalid && (
                                            <FieldError errors={[fieldState.error]} />
                                        )}
                                    </Field>
                                )}
                            />

                            <Controller
                                name="panneId"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel>Panne</FieldLabel>
                                        <Select
                                            value={field.value || "none"}
                                            onValueChange={(value) =>
                                                field.onChange(value === "none" ? "" : value)
                                            }
                                            disabled={
                                                loading ||
                                                !selectedParcId ||
                                                !selectedTypePanneId
                                            }
                                        >
                                            <SelectTrigger
                                                className="w-full"
                                                aria-invalid={fieldState.invalid}
                                            >
                                                <SelectValue placeholder="Sélectionner une panne" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">
                                                    Sélectionner une panne
                                                </SelectItem>
                                                {filteredPannes.map((panne) => (
                                                    <SelectItem key={panne.id} value={panne.id}>
                                                        {panne.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {selectedPanne?.description?.trim() && (
                                            <p className="text-sm text-muted-foreground">
                                                <span className="font-medium"></span>{" "}
                                                {selectedPanne.description}
                                            </p>
                                        )}
                                        {fieldState.invalid && (
                                            <FieldError errors={[fieldState.error]} />
                                        )}
                                    </Field>
                                )}
                            />

                            <Controller
                                name="him"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="him-value">HIM (heures)</FieldLabel>
                                        <Input
                                            id="him-value"
                                            type="number"
                                            min={0}
                                            step="any"
                                            value={field.value ?? ""}
                                            onChange={(event) =>
                                                field.onChange(
                                                    event.target.value === ""
                                                        ? ""
                                                        : Number(event.target.value),
                                                )
                                            }
                                            disabled={loading}
                                            aria-invalid={fieldState.invalid}
                                        />
                                        {fieldState.invalid && (
                                            <FieldError errors={[fieldState.error]} />
                                        )}
                                    </Field>
                                )}
                            />

                            <Controller
                                name="ni"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="him-ni">NI (nombre d'interventions)</FieldLabel>
                                        <Input
                                            id="him-ni"
                                            type="number"
                                            min={0}
                                            step={1}
                                            value={field.value ?? ""}
                                            onChange={(event) =>
                                                field.onChange(
                                                    event.target.value === ""
                                                        ? ""
                                                        : Number(event.target.value),
                                                )
                                            }
                                            disabled={loading}
                                            aria-invalid={fieldState.invalid}
                                        />
                                        {fieldState.invalid && (
                                            <FieldError errors={[fieldState.error]} />
                                        )}
                                    </Field>
                                )}
                            />

                            <Controller
                                name="obs"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="him-obs">Observation</FieldLabel>
                                        <Textarea
                                            id="him-obs"
                                            rows={3}
                                            maxLength={1000}
                                            value={field.value ?? ""}
                                            onChange={field.onChange}
                                            disabled={loading}
                                            aria-invalid={fieldState.invalid}
                                        />
                                        {fieldState.invalid && (
                                            <FieldError errors={[fieldState.error]} />
                                        )}
                                    </Field>
                                )}
                            />
                        </FieldGroup>

                        <DialogFooter className="mt-4">
                            <Button type="submit" disabled={loading}>
                                {loading ? (
                                    <Spinner className="size-4" />
                                ) : editing ? (
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