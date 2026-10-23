// app/api/import/services/importService.ts
import { importSites } from "@/server/sites";

export class ImportService {
  async importData(sheetName: string, data: any) {
    try {
      switch (sheetName.toLowerCase()) {
        case "sites":
          return await importSites(data);
        // case "typeparcs":
        //   return await this.importTypeParcs(data);
        // case "parcs":
        //   return await this.importParcs(data);
        // case "engins":
        //   return await this.importEngins(data);
        // case "typepannes":
        //   return await this.importTypePannes(data);
        // case "pannes":
        //   return await this.importPannes(data);

        // // GESTION DES USERS & ROLES
        // case "users":
        //   return await this.importUsers(data);
        // case "permissions":
        //   return await this.importPermissions(data);
        // case "roles":
        //   return await this.importRoles(data);

        // // GESTION DES ANOMALIES
        // case "anomalies":
        //   return await this.importAnomalies(data);

        // // SAISIE HRM & HIMS
        // case "saisie_hrm":
        //   return await this.importSaisieHrm(data);
        // case "saisie_hims":
        //   return await this.importSaisieHims(data);

        // // GESTION DES ORGANEs & MOUVEMENTS
        // case "type_organe":
        //   return await this.importTypeOrganes(data);
        // case "organe":
        //   return await this.importOrganes(data);
        // case "mvt_organe":
        //   return await this.importMvtOrgane(data);

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