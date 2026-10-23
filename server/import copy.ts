// server/import.ts
'use server';

import * as XLSX from 'xlsx';
import { rowSchema, type ValidatedRow } from '@/lib/schemas';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import yup from '@/lib/yupFr';
import { getSession } from '@/lib/auth';


export type PreviewResult = {
    validRows: ValidatedRow[];
    errors: { rowIndex: number; messages: string[] }[];
    totalRows: number;
};

export async function previewImport(formData: FormData): Promise<PreviewResult> {
    const file = formData.get('file') as File;
    if (!file) throw new Error('Aucun fichier fourni');

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const rawRows: unknown[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const validRows: ValidatedRow[] = [];
    const errors: PreviewResult['errors'] = [];

    // Validation ligne par ligne (yup peut aussi valider un tableau entier,
    // mais le traitement individuel permet d'isoler précisément les erreurs)
    for (let i = 0; i < rawRows.length; i++) {
        try {
            const validated = await rowSchema.validate(rawRows[i], { abortEarly: false });
            validRows.push(validated);
        } catch (err) {
            if (err instanceof yup.ValidationError) {
                errors.push({ rowIndex: i + 2, messages: err.errors }); // +2 pour l'en-tête Excel
            }
        }
    }

    return { validRows, errors, totalRows: rawRows.length };
}


export async function commitImport(rows: ValidatedRow[]) {
    // Optionnel : re-valider côté serveur pour éviter qu'un client malveillant
    // contourne la validation côté client

    const { currentTenantId } = await getSession();
    if (!currentTenantId) {
        throw new Error('Utilisateur non authentifié ou sans tenant');
    }
    const tenantId = currentTenantId;

    const validatedRows = await Promise.all(
        rows.map(row => rowSchema.validate(row))
    );

    const result = await prisma.site.createMany({
        data: validatedRows.map(row => ({ ...row, tenantId })),
        skipDuplicates: true, // Ignore les doublons si vous avez des contraintes uniques
    });

    revalidatePath('/import'); // Rafraîchit les données affichées
    return { inserted: result.count };
}