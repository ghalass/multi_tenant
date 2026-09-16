// lib/validation/siteSchema.ts
import yup from "@/lib/yupFr";

export const siteSchema = yup.object({
  name: yup
    .string()
    .required("Le nom du site est requis")
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(100, "Le nom ne peut pas dépasser 100 caractères"),
  active: yup.boolean().default(true),
});

export type SiteFormData = yup.InferType<typeof siteSchema>;
