// app/api/import/services/importService.ts
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
      let response
      switch (sheetName.toLowerCase()) {
        case "sites": response = await importSites(data);
        case "typeparcs": response = await importTypeParcs(data);
        case "parcs": response = await importParcs(data);
        case "engins": response = await importEngins(data);
        case "typepannes": response = await importTypePannes(data);
        case "pannes": response = await importPannes(data);

        // SAISIE HRM & HIMS
        case "saisie_hrm": response = await importSaisieHrm(data);
        case "saisie_hims": response = await importSaisieHims(data);

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




          // // GESTION DES ORGANEs & MOUVEMENTS
          // case "type_organe":
          //   return await importTypeOrganes(data);
          // case "organe":
          //   return await importOrganes(data);
          // case "mvt_organe":
          //   return await importMvtOrgane(data);

          //
          return response
        default:
          throw new Error(`Onglet non supporté: ${sheetName}`);
      }
    } catch (error) {
      console.error(`Erreur lors de l'import ${sheetName}:`, error);
      throw error;
    }
  }
}