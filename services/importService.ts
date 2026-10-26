// services/importService.ts
import { importEngins } from "@/server/engins";
import { importPannes } from "@/server/pannes";
import { importParcs } from "@/server/parcs";
import { importSaisieHim } from "@/server/saisie_him";
import { importSaisieHrm } from "@/server/saisie_hrm";
import { importSites } from "@/server/sites";
import { importTypePannes } from "@/server/typepannes";
import { importTypeParcs } from "@/server/typeparcs";

import { ACTION } from "@/lib/enums";
import { RESOURCE, IMPORT_RESOURCES } from "@/lib/constantes";
import { guard } from "@/lib/rbac/middleware";

export class ImportService {
  async importData(sheetName: string, data: any) {
    try {


      const sheet = sheetName.trim().toLowerCase();

      const permissionResources: Record<string, string> = {
        [IMPORT_RESOURCES.SITES]: RESOURCE.SITE,
        [IMPORT_RESOURCES.TYPEPARCS]: RESOURCE.TYPEPARC,
        [IMPORT_RESOURCES.PARCS]: RESOURCE.PARC,
        [IMPORT_RESOURCES.ENGINS]: RESOURCE.ENGIN,
        [IMPORT_RESOURCES.TYPEPANNES]: RESOURCE.TYPEPANNE,
        [IMPORT_RESOURCES.PANNES]: RESOURCE.PANNE,
        [IMPORT_RESOURCES.SAISIE_HRM]: RESOURCE.SAISIE_HRM,
        [IMPORT_RESOURCES.SAISIE_HIMS]: RESOURCE.SAISIE_HIM,
      };

      const resource = permissionResources[sheet];

      if (!resource) {
        return [{
          success: false,
          data: null,
          message: `Onglet non supporté : ${sheetName}`,
        }];
      }

      const permission = await guard(ACTION.IMPORT, resource);

      if (!permission.success) {
        return [{
          success: false,
          data: null,
          message: permission.message,
        }];
      }

      switch (sheet) {
        case IMPORT_RESOURCES.SITES: return await importSites(data);
        case IMPORT_RESOURCES.TYPEPARCS: return await importTypeParcs(data);
        case IMPORT_RESOURCES.PARCS: return await importParcs(data);
        case IMPORT_RESOURCES.ENGINS: return await importEngins(data);
        case IMPORT_RESOURCES.TYPEPANNES: return await importTypePannes(data);
        case IMPORT_RESOURCES.PANNES: return await importPannes(data);

        // SAISIE HRM & HIMS
        case IMPORT_RESOURCES.SAISIE_HRM: return await importSaisieHrm(data);
        case IMPORT_RESOURCES.SAISIE_HIMS: return await importSaisieHim(data);
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