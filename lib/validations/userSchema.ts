// lib/validations/userSchema.ts
import yup from "@/lib/yupFr";

// Schéma de base
const userBaseSchema = yup.object({
  email: yup.string().required().email().label("Email"),
  name: yup.string().required().label("Nom de l'utilisateur"),
  password: yup.string().required().min(6).label("Mot de passe"),
  roles: yup.array().of(yup.string().required()).min(1).label("Rôle"),
  active: yup.boolean().default(true),
});

// Pour la création - tous les champs requis
export const userCreateSchema = userBaseSchema;

// Pour la mise à jour - tous les champs optionnels avec partial()
export const userUpdateSchema = userBaseSchema.partial();
