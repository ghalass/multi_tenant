"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { PenIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import yup from "@/lib/yupFr";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
    Field,
    FieldContent,
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
import { createEngin, updateEngin } from "@/server/engins";
import { sleep } from "@/lib/utils";

type Option = {
    id: string;
    name: string;
};

type Engin = {
    id: string;
    name: string;
    active: boolean;
    parcId: string;
    siteId: string;
};

const schema = yup.object({
    name: yup
        .string()
        .trim()
        .min(2)
        .required()
        .label("Nom de l'engin"),

    active: yup.boolean().required(),

    parcId: yup
        .string()
        .required()
        .label("Parc"),

    siteId: yup
        .string()
        .required()
        .label("Site"),
});

type FormValues = yup.InferType<typeof schema>;

function EnginForm({
    engin,
    sites,
    parcs,
}: {
    engin?: Engin;
    sites: Option[];
    parcs: Option[];
}): import("react").JSX.Element {
    const editing = Boolean(engin);

    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState("");

    const router = useRouter();

    const form = useForm<FormValues>({
        resolver: yupResolver(schema),

        defaultValues: {
            name: engin?.name ?? "",
            active: engin?.active ?? true,
            parcId: engin?.parcId ?? "",
            siteId: engin?.siteId ?? "",
        },
    });

    function handleOpenChange(nextOpen: boolean): void {
        setOpen(nextOpen);
        form.reset({
            name: engin?.name ?? "",
            active: engin?.active ?? true,
            parcId: engin?.parcId ?? "",
            siteId: engin?.siteId ?? "",
        });
        setError("");
    }

    async function onSubmit(values: FormValues): Promise<void> {
        try {
            setLoading(true);
            setError("");

            await sleep();

            const result = editing
                ? await updateEngin({
                    ...values,
                    id: engin!.id,
                })
                : await createEngin(values);

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

    const disabled =
        loading ||
        sites.length === 0 ||
        parcs.length === 0;

    return (
        <>
            <GlobalLoader show={pending} />

            <Dialog
                open={open}
                onOpenChange={handleOpenChange}
            >
                <DialogTrigger
                    disabled={disabled}
                    aria-label={
                        editing
                            ? "Modifier l'engin"
                            : "Créer un engin"
                    }
                    className={
                        editing
                            ? "text-primary hover:cursor-pointer"
                            : "inline-flex items-center justify-center rounded-full bg-primary p-1 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    }
                >
                    {editing ? (
                        <PenIcon className="size-4" />
                    ) : (
                        <PlusIcon className="size-4" />
                    )}
                </DialogTrigger>

                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {editing
                                ? "Modifier l'engin"
                                : "Créer un engin"}
                        </DialogTitle>

                        <DialogDescription>
                            Renseignez les informations de l&apos;engin.
                        </DialogDescription>

                        <DisplayError error={error} />
                    </DialogHeader>

                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <FieldGroup className="gap-2">
                            <Controller
                                name="name"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel>
                                            Nom de l&apos;engin
                                        </FieldLabel>

                                        <Input
                                            {...field}
                                            disabled={loading}
                                            aria-invalid={fieldState.invalid}
                                        />

                                        {fieldState.invalid && (
                                            <FieldError
                                                errors={[fieldState.error]}
                                            />
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
                                            value={field.value}
                                            onValueChange={field.onChange}
                                            disabled={loading}
                                        >
                                            <SelectTrigger
                                                aria-invalid={fieldState.invalid}
                                            >
                                                <SelectValue placeholder="Sélectionner un parc" />
                                            </SelectTrigger>

                                            <SelectContent>
                                                {parcs.map((item) => (
                                                    <SelectItem
                                                        key={item.id}
                                                        value={item.id}
                                                    >
                                                        {item.name}
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

                            <Controller
                                name="siteId"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel>Site</FieldLabel>

                                        <Select
                                            value={field.value}
                                            onValueChange={field.onChange}
                                            disabled={loading}
                                        >
                                            <SelectTrigger
                                                aria-invalid={fieldState.invalid}
                                            >
                                                <SelectValue placeholder="Sélectionner un site" />
                                            </SelectTrigger>

                                            <SelectContent>
                                                {sites.map((item) => (
                                                    <SelectItem
                                                        key={item.id}
                                                        value={item.id}
                                                    >
                                                        {item.name}
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

                            <Controller
                                name="active"
                                control={form.control}
                                render={({ field }) => (
                                    <Field orientation="horizontal">
                                        <FieldContent className="flex flex-row items-center gap-2">
                                            <FieldLabel>Actif</FieldLabel>

                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                                disabled={loading}
                                            />
                                        </FieldContent>
                                    </Field>
                                )}
                            />
                        </FieldGroup>

                        <DialogFooter className="mt-4 sm:justify-start">
                            <Button
                                type="submit"
                                variant="outline"
                                disabled={loading}
                            >
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

export function CreateEnginForm(
    props: {
        sites: Option[];
        parcs: Option[];
    },
): import("react").JSX.Element {
    return <EnginForm {...props} />;
}

export function UpdateEnginForm(
    props: {
        engin: Engin;
        sites: Option[];
        parcs: Option[];
    },
): import("react").JSX.Element {
    return <EnginForm {...props} />;
}