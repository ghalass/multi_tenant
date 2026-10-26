"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import yup from "@/lib/yupFr";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  createSaisieHrm,
  updateSaisieHrm,
} from "@/server/saisie_hrm";

type Option = {
  id: string;
  name: string;
};

type ParcOption = Option & {
  typeparcId: string;
};

type EnginOption = Option & {
  parcId: string;
  siteId: string;
  active: boolean;
};

type SaisieHrm = {
  id: string;
  du: string;
  enginId: string;
  siteId: string;
  hrm: number;
  compteur: number | null;
};

const schema = yup.object({
  du: yup.string().required("La date est obligatoire."),
  enginId: yup.string().required("Sélectionnez un engin."),
  siteId: yup.string().required("Sélectionnez un site."),
  hrm: yup
    .number()
    .typeError("Saisissez une valeur numérique.")
    .min(0, "La HRM ne peut pas être négative.")
    .max(24, "La HRM ne peut pas dépasser 24 heures.")
    .required("La HRM est obligatoire."),
  compteur: yup
    .number()
    .transform((value, originalValue) =>
      originalValue === "" || originalValue === null
        ? null
        : value,
    )
    .nullable()
    .min(0, "Le compteur ne peut pas être négatif.")
    .defined(),
});

type FormValues = yup.InferType<typeof schema>;

export function SaisieHrmForm({
  saisie,
  parcs,
  engins,
  sites,
}: {
  saisie?: SaisieHrm;
  parcs: ParcOption[];
  engins: EnginOption[];
  sites: Option[];
}) {
  const editing = Boolean(saisie);
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const initialEngin = engins.find(
    (engin) => engin.id === saisie?.enginId,
  );

  const [selectedSiteId, setSelectedSiteId] = useState(
    initialEngin?.siteId ?? saisie?.siteId ?? "",
  );

  const [selectedParcId, setSelectedParcId] = useState(
    initialEngin?.parcId ?? "",
  );

  // Pour une saisie existante, garder l'engin même s'il est inactif.
  // Pour une nouvelle saisie, proposer uniquement les engins actifs.
  const selectableEngins = useMemo(
    () =>
      engins.filter(
        (engin) => engin.active || engin.id === saisie?.enginId,
      ),
    [engins, saisie?.enginId],
  );

  // Ne proposer que les parcs qui possèdent au moins un engin
  // dans le site sélectionné.
  const filteredParcs = useMemo(() => {
    if (!selectedSiteId) return [];

    return parcs.filter((parc) =>
      selectableEngins.some(
        (engin) =>
          engin.siteId === selectedSiteId &&
          engin.parcId === parc.id,
      ),
    );
  }, [parcs, selectableEngins, selectedSiteId]);

  // L'engin doit appartenir au site ET au parc sélectionnés.
  const filteredEngins = useMemo(
    () =>
      selectableEngins.filter(
        (engin) =>
          engin.siteId === selectedSiteId &&
          engin.parcId === selectedParcId,
      ),
    [selectableEngins, selectedSiteId, selectedParcId],
  );

  const form = useForm<FormValues>({
    resolver: yupResolver(schema),
    defaultValues: {
      du: saisie?.du ?? new Date().toISOString().slice(0, 10),
      enginId: saisie?.enginId ?? "",
      siteId: initialEngin?.siteId ?? saisie?.siteId ?? "",
      hrm: saisie?.hrm ?? 0,
      compteur: saisie?.compteur ?? null,
    },
  });

  useEffect(() => {
    if (!open) return;

    const currentEngin = engins.find(
      (engin) => engin.id === saisie?.enginId,
    );

    // À la modification, le site et le parc proviennent de l'engin.
    const nextSiteId =
      currentEngin?.siteId ?? saisie?.siteId ?? "";

    const nextParcId = currentEngin?.parcId ?? "";

    setSelectedSiteId(nextSiteId);
    setSelectedParcId(nextParcId);

    form.reset({
      du: saisie?.du ?? new Date().toISOString().slice(0, 10),
      enginId: saisie?.enginId ?? "",
      siteId: nextSiteId,
      hrm: saisie?.hrm ?? 0,
      compteur: saisie?.compteur ?? null,
    });

    setError("");
  }, [open, saisie, engins, form]);

  async function onSubmit(values: FormValues) {
    setError("");

    if (!selectedSiteId) {
      setError("Sélectionnez d'abord un site.");
      return;
    }

    if (!selectedParcId) {
      setError("Sélectionnez d'abord un parc.");
      return;
    }

    const selectedEngin = selectableEngins.find(
      (engin) => engin.id === values.enginId,
    );

    if (
      !selectedEngin ||
      selectedEngin.siteId !== selectedSiteId ||
      selectedEngin.parcId !== selectedParcId
    ) {
      setError(
        "L'engin doit appartenir au site et au parc sélectionnés.",
      );
      return;
    }

    try {
      setLoading(true);
      await sleep();

      const payload = {
        du: values.du,
        enginId: selectedEngin.id,

        // Le site enregistré est toujours celui de l'engin.
        siteId: selectedEngin.siteId,

        hrm: Number(values.hrm),
        compteur:
          values.compteur === null ||
            values.compteur === undefined ||
            !Number.isFinite(Number(values.compteur))
            ? null
            : Number(values.compteur),
      };

      const result = saisie
        ? await updateSaisieHrm({
          ...payload,
          id: saisie.id,
        })
        : await createSaisieHrm(payload);

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

  const disabled =
    loading ||
    sites.length === 0 ||
    selectableEngins.length === 0;

  return (
    <>
      <GlobalLoader show={pending} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            type="button"
            size={editing ? "icon" : "sm"}
            variant={editing ? "ghost" : "default"}
            title={
              editing ? "Modifier la saisie" : "Ajouter une saisie"
            }
            aria-label={
              editing
                ? "Modifier la saisie HRM"
                : "Ajouter une saisie HRM"
            }
            disabled={disabled}
          >
            {editing ? (
              <Pencil className="size-4" />
            ) : (
              <>
                <Plus className="size-4" />
                Ajouter une saisie
              </>
            )}
          </Button>
        </DialogTrigger>

        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? "Modifier une saisie HRM"
                : "Ajouter une saisie HRM"}
            </DialogTitle>

            <DialogDescription>
              Sélectionnez le site, le parc puis un engin de ce site.
              Le site enregistré sera automatiquement celui de l'engin.
            </DialogDescription>
          </DialogHeader>

          <DisplayError error={error} />

          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              <Controller
                name="du"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="hrm-date">
                      Date
                    </FieldLabel>

                    <Input
                      id="hrm-date"
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
                    <FieldLabel htmlFor="hrm-site-form">
                      Site
                    </FieldLabel>

                    <Select
                      value={field.value || "none"}
                      onValueChange={(value) => {
                        const nextSiteId =
                          value === "none" ? "" : value;

                        field.onChange(nextSiteId);
                        setSelectedSiteId(nextSiteId);

                        const currentEngin =
                          selectableEngins.find(
                            (engin) =>
                              engin.id ===
                              form.getValues("enginId"),
                          );

                        // Un changement de site invalide l'engin
                        // s'il n'appartient pas au nouveau site.
                        if (
                          !currentEngin ||
                          currentEngin.siteId !== nextSiteId
                        ) {
                          form.setValue("enginId", "", {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                        }

                        const parcStillValid =
                          nextSiteId !== "" &&
                          selectableEngins.some(
                            (engin) =>
                              engin.siteId === nextSiteId &&
                              engin.parcId === selectedParcId,
                          );

                        if (!parcStillValid) {
                          setSelectedParcId("");
                        }
                      }}
                      disabled={loading}
                    >
                      <SelectTrigger
                        id="hrm-site-form"
                        className="w-full"
                        aria-invalid={fieldState.invalid}
                      >
                        <SelectValue placeholder="Sélectionner un site" />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="none">
                          Sélectionner un site
                        </SelectItem>

                        {sites.map((site) => (
                          <SelectItem
                            key={site.id}
                            value={site.id}
                          >
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

              <Field>
                <FieldLabel htmlFor="hrm-parc-form">
                  Parc
                </FieldLabel>

                <Select
                  value={selectedParcId || "none"}
                  onValueChange={(value) => {
                    const nextParcId =
                      value === "none" ? "" : value;

                    setSelectedParcId(nextParcId);

                    const currentEngin =
                      selectableEngins.find(
                        (engin) =>
                          engin.id ===
                          form.getValues("enginId"),
                      );

                    if (
                      !currentEngin ||
                      currentEngin.parcId !== nextParcId
                    ) {
                      form.setValue("enginId", "", {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    }
                  }}
                  disabled={
                    loading ||
                    !selectedSiteId ||
                    filteredParcs.length === 0
                  }
                >
                  <SelectTrigger
                    id="hrm-parc-form"
                    className="w-full"
                  >
                    <SelectValue placeholder="Sélectionner un parc" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="none">
                      Sélectionner un parc
                    </SelectItem>

                    {filteredParcs.map((parc) => (
                      <SelectItem
                        key={parc.id}
                        value={parc.id}
                      >
                        {parc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Controller
                name="enginId"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="hrm-engin-form">
                      Engin
                    </FieldLabel>

                    <Select
                      value={field.value || "none"}
                      onValueChange={(value) => {
                        const nextEngin =
                          selectableEngins.find(
                            (engin) => engin.id === value,
                          );

                        if (!nextEngin) {
                          field.onChange("");
                          return;
                        }

                        field.onChange(nextEngin.id);

                        // Synchroniser le site et le parc sur l'engin choisi.
                        setSelectedSiteId(nextEngin.siteId);
                        setSelectedParcId(nextEngin.parcId);

                        form.setValue("siteId", nextEngin.siteId, {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                      }}
                      disabled={
                        loading ||
                        !selectedSiteId ||
                        !selectedParcId ||
                        filteredEngins.length === 0
                      }
                    >
                      <SelectTrigger
                        id="hrm-engin-form"
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
                          <SelectItem
                            key={engin.id}
                            value={engin.id}
                          >
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
                name="hrm"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="hrm-value">
                      HRM (heures de marche)
                    </FieldLabel>

                    <Input
                      id="hrm-value"
                      type="number"
                      min={0}
                      max={24}
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
                name="compteur"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="hrm-compteur">
                      Compteur (optionnel)
                    </FieldLabel>

                    <Input
                      id="hrm-compteur"
                      type="number"
                      min={0}
                      step="any"
                      value={field.value ?? ""}
                      onChange={(event) =>
                        field.onChange(
                          event.target.value === ""
                            ? null
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
            </FieldGroup>

            <DialogFooter className="mt-4">
              <Button
                type="submit"
                disabled={
                  loading ||
                  !selectedSiteId ||
                  !selectedParcId ||
                  filteredEngins.length === 0
                }
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