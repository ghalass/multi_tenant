// app/layout.tsx
import type { ReactNode } from "react";
// @ts-ignore
import "./[locale]/globals.css"; // Ajustement du chemin vers vos styles globaux
export default function GlobalLayout({ children }: { children: ReactNode }) {
    return (
        // Version minimale par défaut requise par Next.js pour attraper les erreurs hors-locale
        <html lang="fr" suppressHydrationWarning>
            <body>
                {children}
            </body>
        </html>
    );
}
