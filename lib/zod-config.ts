// lib/zod-config.ts
import { z } from "zod";
import { fr } from "zod/locales";

// Garde-fou : on ne configure qu'une seule fois
let configured = false;

export function setupZod() {
  if (configured) return;
  z.config(fr());
  configured = true;
}

// Configure dès l'import
setupZod();

export { z };