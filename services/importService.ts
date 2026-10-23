// app/api/import/services/importService.ts
import { importEngins } from "@/server/engins";
import { importParcs } from "@/server/parcs";
import { importSites } from "@/server/sites";
import { importTypeParcs } from "@/server/typeparcs";

export class ImportService {
  async importData(sheetName: string, data: any) {
    try {
      switch (sheetName.toLowerCase()) {
        case "sites":
          return await importSites(data);
        case "typeparcs":
          return await importTypeParcs(data);
        case "parcs":
          return await importParcs(data);
        case "engins":
          return await importEngins(data);
        // case "typepannes":
        //   return await importTypePannes(data);
        // case "pannes":
        //   return await importPannes(data);

        // // GESTION DES USERS & ROLES
        // case "users":
        //   return await importUsers(data);
        // case "permissions":
        //   return await importPermissions(data);
        // case "roles":
        //   return await importRoles(data);

        // // GESTION DES ANOMALIES
        // case "anomalies":
        //   return await importAnomalies(data);

        // // SAISIE HRM & HIMS
        // case "saisie_hrm":
        //   return await importSaisieHrm(data);
        // case "saisie_hims":
        //   return await importSaisieHims(data);

        // // GESTION DES ORGANEs & MOUVEMENTS
        // case "type_organe":
        //   return await importTypeOrganes(data);
        // case "organe":
        //   return await importOrganes(data);
        // case "mvt_organe":
        //   return await importMvtOrgane(data);

        //
        default:
          throw new Error(`Onglet non supporté: ${sheetName}`);
      }
    } catch (error) {
      console.error(`Erreur lors de l'import ${sheetName}:`, error);
      throw error;
    }
  }
}