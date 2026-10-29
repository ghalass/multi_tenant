"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Pencil, Plus, CheckSquare } from "lucide-react";
import { toast } from "sonner";

import yup from "@/lib/yupFr";
import { createPanne, updatePanne } from "@/server/pannes";
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

const schema = yup.object({
    name: yup
        .string()
        .trim()
        .min(2)
        .max(100)
        .required()
        .label("Le nom"),
    typepanneId: yup
        .string()
        .required("Sélectionnez un type de panne."),
    parcIds: yup
        .array()
        .of(yup.string().required())
        .min(1, "Sélectionnez au moins un parc.")
        .required(),
});

type FormValues = yup.InferType<typeof schema>;

type Option = {
    id: string;
    name: string;
};

type PanneParcItem = Option & {
    description: string | null;
};

type PanneItem = {
    id: string;
    name: string;
    typepanneId: string;
    parcs: PanneParcItem[];
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
    const [descriptions, setDescriptions] = useState<Record<string, string>>(
        {},
    );

    const router = useRouter();

    const form = useForm<FormValues>({
        resolver: yupResolver(schema),
        defaultValues: {
            name: panne?.name ?? "",
            typepanneId: panne?.typepanneId ?? "",
            parcIds: panne?.parcs.map((item) => item.id) ?? [],
        },
    });

    const selectedParcIds = form.watch("parcIds") ?? [];

    const allParcsSelected =
        parcs.length > 0 &&
        parcs.every((parc) => selectedParcIds.includes(parc.id));

    useEffect(() => {
        if (!open) return;

        form.reset({
            name: panne?.name ?? "",
            typepanneId: panne?.typepanneId ?? "",
            parcIds: panne?.parcs.map((item) => item.id) ?? [],
        });

        const initialDescriptions: Record<string, string> = {};

        for (const item of panne?.parcs ?? []) {
            initialDescriptions[item.id] = item.description ?? "";
        }

        setDescriptions(initialDescriptions);
        setError("");
    }, [open, panne, form]);

    function toggleAllParcs(checked: boolean) {
        const nextParcIds = checked ? parcs.map((item) => item.id) : [];

        form.setValue("parcIds", nextParcIds, {
            shouldDirty: true,
            shouldValidate: true,
        });
    }

    function toggleParc(parcId: string, checked: boolean) {
        const nextParcIds = checked
            ? [...new Set([...selectedParcIds, parcId])]
            : selectedParcIds.filter((id) => id !== parcId);

        form.setValue("parcIds", nextParcIds, {
            shouldDirty: true,
            shouldValidate: true,
        });
    }

    async function onSubmit(values: FormValues) {
        try {
            setIsLoading(true);
            setError("");

            const payload = {
                name: values.name.trim(),
                typepanneId: values.typepanneId,
                parcs: values.parcIds.map((parcId) => ({
                    parcId,
                    description: descriptions[parcId]?.trim() || null,
                })),
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
                        aria-label={
                            isEdit ? "Modifier la panne" : "Ajouter une panne"
                        }
                    >
                        {isEdit ? (
                            <Pencil className="size-4" />
                        ) : (
                            <>
                                <Plus className="size-4" />
                                <span>Ajouter</span>
                            </>
                        )}
                    </Button>
                </DialogTrigger>

                <DialogContent className="max-h-[90vh] gap-2 overflow-y-auto sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>
                            {isEdit ? "Modifier une panne" : "Créer une panne"}
                        </DialogTitle>
                        <DialogDescription>
                            Chaque parc peut avoir sa propre description pour
                            cette panne.
                        </DialogDescription>
                    </DialogHeader>

                    <DisplayError error={error} />

                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <FieldGroup className="gap-3">
                            <Field data-invalid={Boolean(form.formState.errors.name)}>
                                <FieldLabel htmlFor="panne-name">
                                    Nom de la panne
                                </FieldLabel>
                                <Input
                                    id="panne-name"
                                    {...form.register("name")}
                                    maxLength={100}
                                    disabled={isLoading}
                                    aria-invalid={Boolean(form.formState.errors.name)}
                                />
                                {form.formState.errors.name && (
                                    <FieldError
                                        errors={[form.formState.errors.name]}
                                    />
                                )}
                            </Field>

                            <Controller
                                name="typepanneId"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel>Type de panne</FieldLabel>
                                        <Select
                                            value={field.value || "none"}
                                            onValueChange={(value) =>
                                                field.onChange(
                                                    value === "none" ? "" : value,
                                                )
                                            }
                                            disabled={isLoading}
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
                                                {typepannes.map((type) => (
                                                    <SelectItem
                                                        key={type.id}
                                                        value={type.id}
                                                    >
                                                        {type.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {fieldState.invalid && (
                                            <FieldError
                                                errors={[fieldState.error]}
                                            />
                                        )}
                                    </Field>
                                )}
                            />

                            <Field data-invalid={Boolean(form.formState.errors.parcIds)}>
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <FieldLabel>Parcs concernés</FieldLabel>
                                    <span className="text-xs text-muted-foreground">
                                        {selectedParcIds.length} / {parcs.length} sélectionné(s)
                                    </span>
                                </div>

                                <div className="rounded-lg border">
                                    <label className="flex cursor-pointer items-center gap-2 border-b bg-muted/40 px-4 py-2 font-medium">
                                        <input
                                            type="checkbox"
                                            checked={allParcsSelected}
                                            onChange={(event) =>
                                                toggleAllParcs(event.target.checked)
                                            }
                                            disabled={isLoading || parcs.length === 0}
                                            className="size-4 accent-primary"
                                        />
                                        <CheckSquare className="size-4 text-muted-foreground" />
                                        <span>Sélectionner tout</span>
                                    </label>

                                    {parcs.length > 0 ? (
                                        <div className="grid max-h-48 grid-cols-1 gap-1 overflow-y-auto p-2 sm:grid-cols-2">
                                            {parcs.map((parc) => (
                                                <label
                                                    key={parc.id}
                                                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-muted/60"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedParcIds.includes(parc.id)}
                                                        onChange={(event) =>
                                                            toggleParc(
                                                                parc.id,
                                                                event.target.checked,
                                                            )
                                                        }
                                                        disabled={isLoading}
                                                        className="size-4 accent-primary"
                                                    />
                                                    <span>{parc.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="p-4 text-sm text-muted-foreground">
                                            Aucun parc disponible.
                                        </p>
                                    )}
                                </div>

                                {form.formState.errors.parcIds && (
                                    <FieldError
                                        errors={[form.formState.errors.parcIds]}
                                    />
                                )}
                            </Field>

                            {selectedParcIds.length > 0 && (
                                <Field>
                                    <FieldLabel>
                                        Description pour chaque parc
                                    </FieldLabel>

                                    <div className="space-y-3">
                                        {selectedParcIds.map((parcId) => {
                                            const parc = parcs.find(
                                                (item) => item.id === parcId,
                                            );

                                            return (
                                                <div
                                                    key={parcId}
                                                    className="space-y-1 rounded-md border p-3"
                                                >
                                                    <FieldLabel>
                                                        {parc?.name ?? "Parc"}
                                                    </FieldLabel>
                                                    <Textarea
                                                        value={descriptions[parcId] ?? ""}
                                                        onChange={(event) =>
                                                            setDescriptions((current) => ({
                                                                ...current,
                                                                [parcId]: event.target.value,
                                                            }))
                                                        }
                                                        maxLength={500}
                                                        rows={2}
                                                        disabled={isLoading}
                                                        placeholder={`Description de la panne pour ${parc?.name ?? "ce parc"}`}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </Field>
                            )}
                        </FieldGroup>

                        <DialogFooter className="mt-6">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={isLoading}
                                onClick={() => setOpen(false)}
                            >
                                Annuler
                            </Button>
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