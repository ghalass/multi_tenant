// app/api/upload-preview/route.ts
import { NextResponse } from 'next/server';
import { parseAndValidateExcel } from '@/lib/import-logic';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const result = await parseAndValidateExcel(formData);
        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Erreur inconnue' },
            { status: 400 }
        );
    }
}