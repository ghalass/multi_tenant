import * as XLSX from 'xlsx';
import { rowSchema, type ValidatedRow } from '@/lib/schemas';
import yup from '@/lib/yupFr';

export type PreviewResult = {
    validRows: ValidatedRow[];
    errors: { rowIndex: number; messages: string[] }[];
    totalRows: number;
};

export async function parseAndValidateExcel(formData: FormData): Promise<PreviewResult> {
    const file = formData.get('file') as File;
    if (!file) throw new Error('Aucun fichier fourni');

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const rawRows: unknown[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const validRows: ValidatedRow[] = [];
    const errors: PreviewResult['errors'] = [];

    for (let i = 0; i < rawRows.length; i++) {
        try {
            const validated = await rowSchema.validate(rawRows[i], { abortEarly: false });
            validRows.push(validated);
        } catch (err) {
            if (err instanceof yup.ValidationError) {
                errors.push({ rowIndex: i + 2, messages: err.errors });
            }
        }
    }

    return { validRows, errors, totalRows: rawRows.length };
}