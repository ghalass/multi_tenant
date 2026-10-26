"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import yup from "@/lib/yupFr";
import { createTypeParc, updateTypeParc } from "@/server/typeparcs";
import { sleep } from "@/lib/utils";
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

const formSchema = yup.object({
  name: yup.string().trim().min(2).max(100).required().label("Le nom du type de parc"),
});

type FormValues = yup.InferType<typeof formSchema>;
type TypeParcItem = { id: string; name: string };

export function TypeParcForm({ typeParc }: { typeParc?: TypeParcItem }) {
  const isEdit = Boolean(typeParc);
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: yupResolver(formSchema),
    defaultValues: { name: typeParc?.name ?? "" },
  });

  useEffect(() => {
    if (open) {
      form.reset({ name: typeParc?.name ?? "" });
      setError("");
    }
  }, [open, typeParc, form]);

  async function onSubmit(values: FormValues) {
    try {
      setIsLoading(true);
      setError("");
      await sleep();

      const result = typeParc
        ? await updateTypeParc({ id: typeParc.id, name: values.name })
        : await createTypeParc({ name: values.name });

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
            aria-label={isEdit ? "Modifier le type de parc" : "Créer un type de parc"}
            title={isEdit ? "Modifier" : "Créer"}
          >
            {isEdit ? <Pencil className="size-4" /> : <Plus className="size-4" />}
            {!isEdit && <span>Ajouter</span>}
          </Button>
        </DialogTrigger>

        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Modifier un type de parc" : "Créer un type de parc"}</DialogTitle>
            <DialogDescription>
              {isEdit ? "Modifiez le nom du type de parc." : "Saisissez le nom du nouveau type de parc."}
            </DialogDescription>
          </DialogHeader>

          <DisplayError error={error} />

          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              <Field data-invalid={Boolean(form.formState.errors.name)}>
                <FieldLabel htmlFor="typeparc-name">Nom du type de parc</FieldLabel>
                <Input
                  id="typeparc-name"
                  {...form.register("name")}
                  aria-invalid={Boolean(form.formState.errors.name)}
                  autoComplete="off"
                  disabled={isLoading}
                  maxLength={100}
                />
                {form.formState.errors.name && (
                  <FieldError errors={[form.formState.errors.name]} />
                )}
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
