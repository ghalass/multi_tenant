// services/importService.ts
import { IMPORT_RESOURCES } from "@/lib/constantes";
import { importEngins } from "@/server/engins";
import { importPannes } from "@/server/pannes";
import { importParcs } from "@/server/parcs";
import { importSaisieHims } from "@/server/saisie_hims";
import { importSaisieHrm } from "@/server/saisie_hrm";
import { importSites } from "@/server/sites";
import { importTypePannes } from "@/server/typepannes";
import { importTypeParcs } from "@/server/typeparcs";

export class ImportService {
  async importData(sheetName: string, data: any) {
    try {
      switch (sheetName.toLowerCase()) {
        case IMPORT_RESOURCES.SITES: return await importSites(data);
        case IMPORT_RESOURCES.TYPEPARCS: return await importTypeParcs(data);
        case IMPORT_RESOURCES.PARCS: return await importParcs(data);
        case IMPORT_RESOURCES.ENGINS: return await importEngins(data);
        case IMPORT_RESOURCES.TYPEPANNES: return await importTypePannes(data);
        case IMPORT_RESOURCES.PANNES: return await importPannes(data);

        // SAISIE HRM & HIMS
        case IMPORT_RESOURCES.SAISIE_HRM: return await importSaisieHrm(data);
        case IMPORT_RESOURCES.SAISIE_HIMS: return await importSaisieHims(data);
        default:
          return [
            {
              success: false,
              data: null,
              message: `Onglet non supporté: ${sheetName}`,
            },
          ];
      }
    } catch (error) {
      console.error(`Erreur lors de l'import ${sheetName}:`, error);
      throw error;
    }
  }
}