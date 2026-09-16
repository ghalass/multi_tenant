// lib/xlsxFn.ts

import * as XLSX from "xlsx";
import { format } from "date-fns";
import { toast } from "sonner";

export const exportExcel = (
  tableId: string,
  title: string = "exportedData"
): void => {
  const dateNow: Date = new Date();
  const formattedDate: string = format(dateNow, "dd_MM_yyyy_HH_mm_ss");

  const table: HTMLElement | null = document.getElementById(tableId);

  if (!table) {
    toast.error(`Table avec ID "${tableId}" non trouvée`);
    console.error(`Table avec ID "${tableId}" non trouvée`);
    return;
  }

  const rows: (string | { v: string; t: string })[][] = Array.from(
    table.querySelectorAll("tr")
  ).map((row: HTMLTableRowElement) =>
    Array.from(row.querySelectorAll<HTMLTableCellElement>("th, td")).map(
      (cell: HTMLTableCellElement) => {
        const value: string = cell.innerText.trim();

        // Match a date format like 2025-04-01 or 01/04/2025
        const dateRegex: RegExp = /^(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})$/;
        if (dateRegex.test(value)) {
          return { v: value, t: "s" }; // force as string (text)
        }
        return value;
      }
    )
  );

  const worksheet: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook: XLSX.WorkBook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, title);

  XLSX.writeFile(workbook, `${title}_${formattedDate}.xlsx`);
};
