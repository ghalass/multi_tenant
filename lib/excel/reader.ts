import * as XLSX from "xlsx";

export function readExcelSheet<T>(
    buffer: Buffer
): T[] {
    const workbook = XLSX.read(buffer, {
        type: "buffer",
        raw: false,
    });

    const sheetName =
        workbook.SheetNames[0];

    if (!sheetName) {
        throw new Error(
            "Le fichier Excel ne contient aucune feuille."
        );
    }

    const worksheet =
        workbook.Sheets[sheetName];

    if (!worksheet) {
        throw new Error(
            "Impossible de lire la feuille Excel."
        );
    }

    return XLSX.utils.sheet_to_json<T>(
        worksheet,
        {
            defval: "",
            raw: false,
        }
    );
}