// components/DownloadButtonSimple.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { JSX } from "react/jsx-runtime";

export default function DownloadButtonSimple(): JSX.Element {
  return (
    <>
      <p className="text-sm italic ">
        Avez-vous le support standard nécessaire pour l'importation ?
      </p>
      <Button size={"sm"} asChild>
        <a href="/upload/to_import_gmao_nextjs.xlsx" download>
          <Download /> Télécharger
        </a>
      </Button>
    </>
  );
}
