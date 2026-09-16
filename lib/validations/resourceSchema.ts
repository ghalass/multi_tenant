// lib/validations/resourceSchema.ts
import yup from "@/lib/yupFr";

export interface ResourceFormData {
  name: string;
  label: string;
}

export const resourceSchema = yup.object({
  name: yup
    .string()
    .required("Le nom technique est requis")
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(50, "Le nom ne peut pas dépasser 50 caractères")
    .matches(
      /^[a-z]+(?:_[a-z]+)*$/,
      "Le nom doit être en minuscules avec des underscores (ex: users_management)"
    ),
  label: yup
    .string()
    .required("Le libellé est requis")
    .min(2, "Le libellé doit contenir au moins 2 caractères")
    .max(100, "Le libellé ne peut pas dépasser 100 caractères"),
});
