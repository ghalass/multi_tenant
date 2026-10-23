// lib/schemas.ts
import * as yup from 'yup';

export const rowSchema = yup.object({
    name: yup.string().min(2).required().label("Le nom du site"),
    active: yup.boolean().optional(),
});

export type ValidatedRow = yup.InferType<typeof rowSchema>;