// server/import.ts
'use server';

import * as XLSX from 'xlsx';
import { rowSchema, type ValidatedRow } from '@/lib/schemas';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import yup from '@/lib/yupFr';
import { getSession } from '@/lib/auth';
import { parseAndValidateExcel, type PreviewResult } from '@/lib/import-logic';


export type { PreviewResult };

export async function previewImport(formData: FormData): Promise<PreviewResult> {
    return parseAndValidateExcel(formData);
}


export async function commitImport(rows: ValidatedRow[], onProgress?: (done: number, total: number) => void) {
    const { currentTenantId } = await getSession();
    if (!currentTenantId) {
        throw new Error('Utilisateur non authentifié ou sans tenant');
    }
    const tenantId = currentTenantId;

    const validatedRows = await Promise.all(rows.map(r => rowSchema.validate(r)));
    const data = validatedRows.map(row => ({ ...row, tenantId }));

    const result = await prisma.site.createMany({
        data,
        skipDuplicates: true,
    });

    revalidatePath('/import');
    return { inserted: result.count };
}

