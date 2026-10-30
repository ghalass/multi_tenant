import "server-only";

import { prisma } from "@/lib/prisma";

export type CompteurSource = "DERNIER_RELEVE";

export type CompteurCourantData = {
    enginId: string;
    enginName: string;
    compteurCourant: number;
    source: CompteurSource;
    dateDernierReleve: string;
    compteurBase: number;
    hrmCumulees: number;
    nombreSaisiesHrmAjoutees: number;
    avertissement: string;
};

/**
 * Calcule le compteur courant d'un engin.
 *
 * Règle :
 * - Le compteur est relevé en fin de journée.
 * - Le dernier relevé réel constitue la référence.
 * - On ajoute uniquement les HRM des jours postérieurs
 *   à la date de ce relevé.
 * - Les journées sans saisie HRM ne sont pas reconstituées.
 * - Sans relevé réel, le compteur est indisponible.
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

    // Aucun compteur réel : impossible de calculer
    // un compteur absolu à partir des seules HRM.
    if (
        !dernierReleve ||
        dernierReleve.compteur === null
    ) {
        return null;
    }

    const saisiesHrm = await prisma.saisiehrm.aggregate({
        where: {
            enginId,
            tenantId,
            du: {
                gt: dernierReleve.du,
                lte: aujourdHui,
            },
        },
        _sum: {
            hrm: true,
        },
        _count: {
            _all: true,
        },
    });

    const compteurBase = dernierReleve.compteur;
    const hrmCumulees = saisiesHrm._sum.hrm ?? 0;

    return {
        enginId: engin.id,
        enginName: engin.name,

        compteurCourant:
            compteurBase + hrmCumulees,

        source: "DERNIER_RELEVE",

        dateDernierReleve:
            dernierReleve.du.toISOString().slice(0, 10),

        compteurBase,
        hrmCumulees,

        nombreSaisiesHrmAjoutees:
            saisiesHrm._count._all,

        avertissement:
            "Le calcul utilise le dernier relevé réel et les HRM " +
            "enregistrées après sa date. Les journées sans saisie " +
            "HRM ne sont pas reconstituées.",
    };
}