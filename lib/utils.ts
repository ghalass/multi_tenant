import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { DELAY_SIMULATION } from "./constantes";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// Fonction utilitaire pour créer le délai
export const sleep = (): Promise<void> =>
  new Promise<void>((resolve) =>
    setTimeout(resolve, DELAY_SIMULATION),
  );

export const dateFormater = (
  du: Date | string | number,
): string => new Date(du).toLocaleDateString("fr-FR");