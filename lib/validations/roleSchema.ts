// lib/validations/roleSchema.ts
import yup from "@/lib/yupFr";

export const roleCreateSchema = yup.object().shape({
  name: yup
    .string()
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .required("Le nom est requis"),
  description: yup.string().notRequired(),
  permissions: yup
    .array()
    .of(yup.string())
    .min(1, "Au moins une permission doit être sélectionnée")
    .required("Les permissions sont requises"),
});

export const roleUpdateSchema = yup.object().shape({
  name: yup
    .string()
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .required("Le nom est requis"),
  description: yup.string().notRequired(),
  permissions: yup
    .array()
    .of(yup.string())
    .min(1, "Au moins une permission doit être sélectionnée")
    .required("Les permissions sont requises"),
});
