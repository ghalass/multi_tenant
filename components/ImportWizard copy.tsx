// components/ImportWizard.tsx
'use client';

import { useState, useTransition } from 'react';
import { previewImport, commitImport, type PreviewResult } from '@/server/import';

export function ImportWizard() {
    const [preview, setPreview] = useState<PreviewResult | null>(null);
    const [isPending, startTransition] = useTransition();
    const [message, setMessage] = useState('');

    async function handleFileUpload(formData: FormData) {
        startTransition(async () => {
            const result = await previewImport(formData);
            setPreview(result);
            setMessage('');
        });
    }

    async function handleConfirm() {
        if (!preview || preview.validRows.length === 0) return;
        startTransition(async () => {
            const { inserted } = await commitImport(preview.validRows);
            setMessage(`${inserted} lignes insérées avec succès.`);
            setPreview(null);
        });
    }

    return (
        <div className="space-y-6 p-6">
            {/* Formulaire d'upload */}
            <form action={handleFileUpload}>
                <input type="file" name="file" accept=".xlsx,.xls,.csv" disabled={isPending} />
                <button type="submit" disabled={isPending}>
                    {isPending ? 'Analyse en cours...' : 'Prévisualiser'}
                </button>
            </form>

            {/* Tableau de prévisualisation */}
            {preview && (
                <div className="space-y-4">
                    <p>
                        {preview.validRows.length} lignes valides sur {preview.totalRows}.
                        {preview.errors.length > 0 && ` ${preview.errors.length} ligne(s) en erreur.`}
                    </p>

                    {preview.errors.length > 0 && (
                        <div className="border border-red-300 bg-red-50 p-4 rounded">
                            <h3 className="font-bold text-red-700">Erreurs détectées</h3>
                            <ul className="list-disc pl-5">
                                {preview.errors.map((e) => (
                                    <li key={e.rowIndex}>
                                        Ligne {e.rowIndex} : {e.messages.join(', ')}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {preview.validRows.length > 0 && (
                        <>
                            <table className="min-w-full border">
                                <thead>
                                    <tr>
                                        <th className="border p-2">Nom</th>
                                        <th className="border p-2">active</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {preview.validRows.map((row, i) => (
                                        <tr key={i}>
                                            <td className="border p-2">{row.name}</td>
                                            <td className="border p-2">{row.active}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <button
                                onClick={handleConfirm}
                                disabled={isPending}
                                className="bg-green-600 text-white px-4 py-2 rounded"
                            >
                                Confirmer l'import ({preview.validRows.length} lignes)
                            </button>
                        </>
                    )}
                </div>
            )}

            {message && <p className="text-green-600">{message}</p>}
        </div>
    );
}