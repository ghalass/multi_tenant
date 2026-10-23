// app/api/import/utils/convertField.ts
const parseExcelDate = (value: any): Date | null => {
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    // Format DD/MM/YYYY
    if (trimmed.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
      const [day, month, year] = trimmed.split("/").map(Number);
      const date = new Date(year, month - 1, day);
      return isNaN(date.getTime()) ? null : date;
    }

    // Format DD-MM-YYYY
    if (trimmed.match(/^\d{1,2}-\d{1,2}-\d{4}$/)) {
      const [day, month, year] = trimmed.split("-").map(Number);
      const date = new Date(year, month - 1, day);
      return isNaN(date.getTime()) ? null : date;
    }

    // Autres formats
    const date = new Date(trimmed);
    return isNaN(date.getTime()) ? null : date;
  }

  // Conversion Excel uniquement si c'est vraiment un nombre Excel (> 0)
  if (typeof value === "number" && value > 0) {
    return convertExcelDate(value);
  }

  return null;
};
// Fonction séparée pour la conversion Excel
const convertExcelDate = (excelDateNumber: number): Date | null => {
  // Excel date system: 1 = 1 janvier 1900
  // Correction pour le bug Excel 1900 (qui pense que 1900 était bissextile)
  const excelEpoch = new Date(1899, 11, 30); // 30 décembre 1899

  // Pour les dates après le 28 février 1900, ajuster d'un jour
  const offset = excelDateNumber > 60 ? 1 : 0;

  const date = new Date(
    excelEpoch.getTime() + (excelDateNumber - offset) * 24 * 60 * 60 * 1000
  );

  // Gérer l'heure si présente (partie décimale)
  const timeFraction = excelDateNumber - Math.floor(excelDateNumber);
  if (timeFraction > 0) {
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    date.setTime(date.getTime() + timeFraction * millisecondsPerDay);
  }

  return isNaN(date.getTime()) ? null : date;
};

/**
 *
 * @param value
 * @param fieldType : string | number | int | boolean | date
 * @returns
 */
export const convertField = (value: any, fieldType: string = "string"): any => {
  // console.log("#####################################");
  // console.log(`value = ${value}, typeof value:${typeof value}`);
  if (value === null || value === undefined || value === "") {
    return null;
  }

  try {
    switch (fieldType) {
      case "string":
        return String(value).trim();

      case "number":
        const num = parseFloat(value);
        return isNaN(num) ? null : num;

      case "int":
        const int = parseInt(value);
        return isNaN(int) ? null : int;

      case "boolean":
        if (typeof value === "boolean") return value;
        if (typeof value === "number") return value !== 0;
        if (typeof value === "string") {
          const str = value.toLowerCase().trim();
          return (
            str === "true" ||
            str === "1" ||
            str === "oui" ||
            str === "yes" ||
            str === "vrai"
          );
        }

        return Boolean(value);

      case "date":
        return parseExcelDate(value);

      default:
        return value;
    }
  } catch (error) {
    console.error(
      `Erreur de conversion pour la valeur "${value}" en type "${fieldType}":`,
      error
    );
    return null;
  }
};

export function isValidFormat(code: string): boolean {
  const regex = /^[A-Z0-9]{1,10}-\d{2}-\d+$/i;
  return regex.test(code);
}
