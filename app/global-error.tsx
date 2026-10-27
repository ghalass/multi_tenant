"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw, RefreshCw } from "lucide-react";

type GlobalErrorProps = {
    error: Error & { digest?: string };
    retry: () => void;
};

export default function GlobalError({
    error,
    retry,
}: GlobalErrorProps) {
    useEffect(() => {
        console.error("Erreur globale de l'application :", error);
    }, [error]);

    return (
        <html lang="fr">
            <head>
                <title>Erreur - GMAO</title>
            </head>

            <body
                style={{
                    margin: 0,
                    minHeight: "100vh",
                    fontFamily: "Arial, Helvetica, sans-serif",
                    backgroundColor: "#f8fafc",
                    color: "#0f172a",
                }}
            >
                <main
                    style={{
                        minHeight: "100vh",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "24px",
                        boxSizing: "border-box",
                    }}
                >
                    <section
                        style={{
                            width: "100%",
                            maxWidth: "480px",
                            padding: "32px",
                            boxSizing: "border-box",
                            textAlign: "center",
                            backgroundColor: "#ffffff",
                            border: "1px solid #e2e8f0",
                            borderRadius: "16px",
                            boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
                        }}
                    >
                        <div
                            style={{
                                width: "56px",
                                height: "56px",
                                margin: "0 auto 20px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                borderRadius: "50%",
                                backgroundColor: "#fee2e2",
                                color: "#b91c1c",
                            }}
                        >
                            <AlertTriangle size={28} />
                        </div>

                        <h1
                            style={{
                                margin: "0 0 12px",
                                fontSize: "24px",
                                lineHeight: 1.4,
                                fontWeight: 700,
                            }}
                        >
                            Une erreur globale est survenue
                        </h1>

                        <p
                            style={{
                                margin: 0,
                                fontSize: "14px",
                                lineHeight: 1.8,
                                color: "#64748b",
                            }}
                        >
                            L'application a rencontré un problème
                            inattendu. Essayez de nouveau ou actualisez
                            la page.
                        </p>

                        {error.digest && (
                            <p
                                style={{
                                    marginTop: "16px",
                                    fontSize: "12px",
                                    color: "#64748b",
                                    overflowWrap: "anywhere",
                                }}
                            >
                                Référence : {error.digest}
                            </p>
                        )}

                        <div
                            style={{
                                display: "flex",
                                flexWrap: "wrap",
                                justifyContent: "center",
                                gap: "10px",
                                marginTop: "24px",
                            }}
                        >
                            <button
                                type="button"
                                onClick={retry}
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "8px",
                                    padding: "10px 16px",
                                    border: "none",
                                    borderRadius: "8px",
                                    backgroundColor: "#6d28d9",
                                    color: "#ffffff",
                                    fontSize: "14px",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                }}
                            >
                                <RotateCcw size={16} />
                                Réessayer
                            </button>

                            <button
                                type="button"
                                onClick={() => window.location.reload()}
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "8px",
                                    padding: "10px 16px",
                                    border: "1px solid #cbd5e1",
                                    borderRadius: "8px",
                                    backgroundColor: "#ffffff",
                                    color: "#334155",
                                    fontSize: "14px",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                }}
                            >
                                <RefreshCw size={16} />
                                Actualiser
                            </button>
                        </div>
                    </section>
                </main>
            </body>
        </html>
    );
}