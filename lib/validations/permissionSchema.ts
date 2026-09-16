// lib/validations/permissionSchema.ts
import yup from "@/lib/yupFr";
export interface PermissionFormData {
  name: string;
  resource: string;
  action: string;
  description?: string;
}

export const permissionSchema = yup.object({
  name: yup
    .string()
    .required("Le nom est requis")
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(50, "Le nom ne peut pas dépasser 50 caractères"),
  resource: yup.string().required("La ressource est requise"),
  action: yup.string().required("L'action est requise"),
  description: yup
    .string()
    .max(255, "La description ne peut pas dépasser 255 caractères"),
});
