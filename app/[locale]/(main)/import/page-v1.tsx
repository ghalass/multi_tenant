// app/(main)/import/page.tsx

import { ImportWizard } from "@/components/ImportWizard";

export default function ImportPage() {
    return (
        <main className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold p-6">Importer des données</h1>
            <ImportWizard />
        </main>
    );
}