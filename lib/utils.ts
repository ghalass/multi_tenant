import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { DELAY_SIMULATION } from "./constantes";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Fonction utilitaire pour créer le délai
export const sleep = () =>
  new Promise((resolve) => setTimeout(resolve, DELAY_SIMULATION));
