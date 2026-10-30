
"use client";
import { ExcelImporter } from "@/components/excel-importer";
import { useImport } from "@/hooks/useImport";

export default function ImportPage(): import("react").JSX.Element {
  const importMutation = useImport();
  return (
    <div className="container mx-auto py-6">
      <ExcelImporter
        importMutation={importMutation}
        title="Importation de données Excel"
        description="Importez des données depuis un fichier Excel vers la base de données"
        submitButtonText="Injecter les données"
      />
    </div>
  );
}
