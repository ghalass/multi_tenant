import "server-only";

import { prisma } from "@/lib/prisma";

export type CompteurSource =
    | "DERNIER_RELEVE"
    | "COMPTEUR_INITIAL_ET_HRM";

export type CompteurCourantData = {
    enginId: string;
    enginName: string;
    compteurCourant: number;
    source: CompteurSource;
    dateDernierReleve: string | null;
    compteurBase: number;
    hrmCumulees: number;
    nombreSaisiesHrmAjoutees: number;
    avertissement: string;
};

/**
 * Calcule le compteur courant d'un engin.
 *
 * Si un relevé existe :
 * compteur courant = dernier relevé + HRM des dates suivantes.
 *
 * Sinon :
 * compteur courant = initialHeureChassis + somme des HRM.
 *
 * Les relevés sont considérés comme effectués en fin de journée.
 * Les HRM de la date du dernier relevé ne sont donc pas ajoutées
 * une seconde fois.
 *
 * Les journées sans saisie HRM ne sont pas reconstituées.
 *
 * Cette fonction interne ne remplace pas les contrôles d'accès
 * des actions serveur qui l'appellent.
 */
export async function calculerCompteurCourant(
    enginId: string,
    tenantId: string,
): Promise<CompteurCourantData | null> {
    const engin = await prisma.engin.findFirst({
        where: {
            id: enginId,
            tenantId,
        },
        select: {
            id: true,
            name: true,
            initialHeureChassis: true,
        },
    });

    if (!engin) {
        return null;
    }

    const now = new Date();

    const aujourdHui = new Date(
        Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate(),
        ),
    );

    const dernierReleve = await prisma.saisiehrm.findFirst({
        where: {
            enginId,
            tenantId,
            du: {
                lte: aujourdHui,
            },
            compteur: {
                not: null,
            },
        },
        orderBy: {
            du: "desc",
        },
        select: {
            du: true,
            compteur: true,
        },
    });

    const saisiesHrm = await prisma.saisiehrm.aggregate({
        where: {
            enginId,
            tenantId,
            du: {
                lte: aujourdHui,
                ...(dernierReleve
                    ? { gt: dernierReleve.du }
                    : {}),
            },
        },
        _sum: {
            hrm: true,
        },
        _count: {
            _all: true,
        },
    });

    const hrmCumulees = saisiesHrm._sum.hrm ?? 0;

    const compteurBase = dernierReleve
        ? dernierReleve.compteur!
        : (engin.initialHeureChassis ?? 0);

    return {
        enginId: engin.id,
        enginName: engin.name,
        compteurCourant: compteurBase + hrmCumulees,
        source: dernierReleve
            ? "DERNIER_RELEVE"
            : "COMPTEUR_INITIAL_ET_HRM",
        dateDernierReleve: dernierReleve
            ? dernierReleve.du.toISOString().slice(0, 10)
            : null,
        compteurBase,
        hrmCumulees,
        nombreSaisiesHrmAjoutees: saisiesHrm._count._all,
        avertissement:
            "Le calcul utilise uniquement les HRM enregistrées. " +
            "Les journées sans saisie ne sont pas reconstituées.",
    };
}