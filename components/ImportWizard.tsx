// app/components/ImportWizard.tsx
'use client';

import { useState, useTransition } from 'react';
import { commitImport, type PreviewResult } from '@/server/import';

export function ImportWizard() {
    // État de la prévisualisation (retournée par /api/upload-preview)
    const [preview, setPreview] = useState<PreviewResult | null>(null);

    // État de l'upload (progression XHR)
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);

    // Message de succès / erreur
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    // Transition pour l'appel à la Server Action commitImport
    const [isCommitPending, startCommitTransition] = useTransition();

    // ---------------------------------------------------------------
    // 1. Upload du fichier via XHR (pour suivre la progression)
    //    → appelle la Route Handler /api/upload-preview
    // ---------------------------------------------------------------
    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        // Reset de l'état
        setIsUploading(true);
        setUploadProgress(0);
        setPreview(null);
        setMessage('');
        setError('');

        const formData = new FormData();
        formData.append('file', file);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/upload-preview');

        // Progression de l'upload
        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                setUploadProgress(Math.round((event.loaded / event.total) * 100));
            }
        };

        xhr.onload = () => {
            setIsUploading(false);
            if (xhr.status === 200) {
                try {
                    const result = JSON.parse(xhr.responseText) as PreviewResult;
                    setPreview(result);
                } catch {
                    setError('Réponse serveur invalide');
                }
            } else {
                try {
                    const body = JSON.parse(xhr.responseText);
                    setError(body.error ?? "Erreur lors de l'analyse du fichier");
                } catch {
                    setError("Erreur lors de l'analyse du fichier");
                }
            }
        };

        xhr.onerror = () => {
            setIsUploading(false);
            setError('Erreur réseau lors de l\'upload');
        };

        xhr.send(formData);
    }

    // ---------------------------------------------------------------
    // 2. Confirmation de l'import (appel direct à la Server Action)
    // ---------------------------------------------------------------
    function handleConfirm() {
        if (!preview || preview.validRows.length === 0) return;

        setMessage('');
        setError('');

        startCommitTransition(async () => {
            try {
                const result = await commitImport(preview.validRows);
                setMessage(`${result.inserted} ligne(s) insérée(s) avec succès.`);
                setPreview(null);
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Erreur lors de l'insertion"
                );
            }
        });
    }

    // ---------------------------------------------------------------
    // 3. Réinitialisation après un import réussi ou en cas d'erreur
    // ---------------------------------------------------------------
    function handleReset() {
        setPreview(null);
        setMessage('');
        setError('');
        setUploadProgress(0);
        setIsUploading(false);
    }

    // ---------------------------------------------------------------
    // Rendu
    // ---------------------------------------------------------------
    return (
        <div className="space-y-6 p-6">
            {/* Zone d'upload */}
            <div className="flex flex-col gap-2">
                <label htmlFor="file-upload" className="font-medium">
                    Fichier Excel (.xlsx, .xls, .csv)
                </label>
                <input
                    id="file-upload"
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileChange}
                    disabled={isUploading || isCommitPending}
                    className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
            </div>

            {/* Barre de progression d'upload */}
            {isUploading && (
                <div className="space-y-1">
                    <div className="w-full bg-gray-200 rounded h-5 overflow-hidden">
                        <div
                            className="bg-blue-600 h-full text-xs text-white text-center transition-all duration-150"
                            style={{ width: `${uploadProgress}%` }}
                        >
                            {uploadProgress > 10 && `${uploadProgress}%`}
                        </div>
                    </div>
                    <p className="text-sm text-gray-500">Envoi du fichier…</p>
                </div>
            )}

            {/* Indicateur d'analyse serveur (pendant le parsing XLSX + validation) */}
            {!isUploading && preview === null && uploadProgress === 100 && (
                <p className="text-blue-600">Analyse du fichier en cours…</p>
            )}

            {/* Message d'erreur global */}
            {error && (
                <div className="border border-red-300 bg-red-50 p-4 rounded">
                    <p className="text-red-700 font-medium">Erreur</p>
                    <p className="text-red-600 text-sm">{error}</p>
                </div>
            )}

            {/* Message de succès */}
            {message && (
                <div className="border border-green-300 bg-green-50 p-4 rounded">
                    <p className="text-green-700 font-medium">{message}</p>
                </div>
            )}

            {/* Résultat de la prévisualisation */}
            {preview && !isUploading && (
                <div className="space-y-4">
                    {/* Résumé */}
                    <div className="flex items-center gap-4">
                        <p className="text-sm">
                            <span className="font-semibold text-green-700">
                                {preview.validRows.length}
                            </span>{' '}
                            ligne(s) valide(s) sur{' '}
                            <span className="font-semibold">{preview.totalRows}</span>.
                            {preview.errors.length > 0 && (
                                <>
                                    {' '}
                                    <span className="font-semibold text-red-700">
                                        {preview.errors.length}
                                    </span>{' '}
                                    erreur(s).
                                </>
                            )}
                        </p>
                        <button
                            type="button"
                            onClick={handleReset}
                            className="text-sm text-gray-500 underline hover:text-gray-700"
                        >
                            Recommencer
                        </button>
                    </div>

                    {/* Tableau des erreurs */}
                    {preview.errors.length > 0 && (
                        <div className="border border-red-300 bg-red-50 p-4 rounded max-h-60 overflow-y-auto">
                            <h3 className="font-bold text-red-700 mb-2">
                                Erreurs détectées
                            </h3>
                            <ul className="list-disc pl-5 space-y-1 text-sm text-red-600">
                                {preview.errors.map((e) => (
                                    <li key={e.rowIndex}>
                                        <span className="font-medium">
                                            Ligne {e.rowIndex} :
                                        </span>{' '}
                                        {e.messages.join(', ')}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Tableau d'aperçu des lignes valides */}
                    {preview.validRows.length > 0 && (
                        <div className="border rounded overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-gray-100">
                                    <tr>
                                        {Object.keys(preview.validRows[0]).map((key) => (
                                            <th
                                                key={key}
                                                className="border-b px-4 py-2 text-left font-medium"
                                            >
                                                {key}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {preview.validRows.map((row, i) => (
                                        <tr key={i} className="hover:bg-gray-50">
                                            {Object.values(row).map((value, j) => (
                                                <td
                                                    key={j}
                                                    className="border-b px-4 py-2"
                                                >
                                                    {value === null || value === undefined
                                                        ? '—'
                                                        : String(value)}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Bouton de confirmation */}
                    {preview.validRows.length > 0 && (
                        <button
                            type="button"
                            onClick={handleConfirm}
                            disabled={isCommitPending}
                            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isCommitPending
                                ? 'Insertion en cours…'
                                : `Confirmer l'import (${preview.validRows.length} ligne(s))`}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}