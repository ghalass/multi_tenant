
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { PlusIcon, PenIcon } from "lucide-react";
import { toast } from "sonner";
import yup from "@/lib/yupFr";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field";
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
import { Spinner } from "@/components/ui/spinner";
import { GlobalLoader } from "@/components/global-loader";
import DisplayError from "@/components/display-error";
import { createParc, updateParc } from "@/server/parcs";
import { sleep } from "@/lib/utils";

type TypeParcOption = { id: string; name: string };

type ParcData = {
    id: string;
    name: string;
    typeparcId: string;
};

const formSchema = yup.object({
    name: yup.string().trim().min(2).required().label("Le nom du parc"),
    typeparcId: yup.string().required().label("Le type de parc"),
});

type FormValues = yup.InferType<typeof formSchema>;

function ParcForm({
    parc,
    typeparcs,
}: {
    parc?: ParcData;
    typeparcs: TypeParcOption[];
}): import("react").JSX.Element {
    const isEditing = Boolean(parc);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState("");
    const router = useRouter();

    const form = useForm<FormValues>({
        resolver: yupResolver(formSchema),
        defaultValues: {
            name: parc?.name ?? "",
            typeparcId: parc?.typeparcId ?? typeparcs[0]?.id ?? "",
        },
    });

    function handleOpenChange(nextOpen: boolean): void {
        setOpen(nextOpen);
        form.reset({
            name: parc?.name ?? "",
            typeparcId: parc?.typeparcId ?? typeparcs[0]?.id ?? "",
        });
        setError("");
    }

    async function onSubmit(values: FormValues): Promise<void> {
        try {
            setLoading(true);
            setError("");
            await sleep();

            const result = isEditing
                ? await updateParc({
                    id: parc!.id,
                    name: values.name,
                    typeparcId: values.typeparcId,
                })
                : await createParc({
                    name: values.name,
                    typeparcId: values.typeparcId,
                });

            if (!result.success) {
                setError(result.message || "Une erreur est survenue.");
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
            <GlobalLoader show={isPending} />

            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogTrigger
                    disabled={typeparcs.length === 0}
                    aria-label={isEditing ? "Modifier le parc" : "Créer un parc"}
                    className={
                        isEditing
                            ? "text-primary hover:cursor-pointer"
                            : "inline-flex items-center justify-center rounded-full bg-primary p-1 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    }
                >
                    {isEditing ? (
                        <PenIcon className="size-4" />
                    ) : (
                        <PlusIcon className="size-4" />
                    )}
                </DialogTrigger>

                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>
                            {isEditing ? "Modifier le parc" : "Créer un parc"}
                        </DialogTitle>
                        <DialogDescription>
                            Renseignez le nom et le type du parc.
                        </DialogDescription>
                        <DisplayError error={error} />
                    </DialogHeader>

                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <FieldGroup>
                            <Controller
                                name="name"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="parc-name">Nom du parc</FieldLabel>
                                        <Input
                                            {...field}
                                            id="parc-name"
                                            autoComplete="off"
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
                                name="typeparcId"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel>Type de parc</FieldLabel>
                                        <Select
                                            value={field.value}
                                            onValueChange={field.onChange}
                                            disabled={loading || typeparcs.length === 0}
                                        >
                                            <SelectTrigger aria-invalid={fieldState.invalid}>
                                                <SelectValue placeholder="Sélectionner un type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {typeparcs.map((type) => (
                                                    <SelectItem key={type.id} value={type.id}>
                                                        {type.name}
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
                        </FieldGroup>

                        <DialogFooter className="mt-4 sm:justify-start">
                            <Button type="submit" variant="outline" disabled={loading}>
                                {loading ? (
                                    <Spinner className="size-4" />
                                ) : isEditing ? (
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

export function CreateParcForm({
    typeparcs,
}: {
    typeparcs: TypeParcOption[];
}): import("react").JSX.Element {
    return <ParcForm typeparcs={typeparcs} />;
}

export function UpdateParcForm({
    parc,
    typeparcs,
}: {
    parc: ParcData;
    typeparcs: TypeParcOption[];
}): import("react").JSX.Element {
    return <ParcForm parc={parc} typeparcs={typeparcs} />;
}
