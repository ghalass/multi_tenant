// app/api/upload-preview/route.ts
import { previewImport } from '@/server/import';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const formData = await request.formData();
    const result = await previewImport(formData);
    return NextResponse.json(result);
}