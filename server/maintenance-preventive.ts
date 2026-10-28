"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { guard } from "@/lib/rbac/middleware";
import { ACTION } from "@/lib/enums";
import { RESOURCE } from "@/lib/constantes";

type CompteurSource =
    | "DERNIER_RELEVE"
    | "COMPTEUR_INITIAL_ET_HRM";

type CompteurCourantData = {
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

type CompteurCourantResponse =
    | {
        success: true;
        message: string;
        data: CompteurCourantData;
    }
    | {
        success: false;
        message: string;
        data: null;
    };

async function getMaintenanceTenantId(): Promise<string | null> {
    const { currentTenantId } = await getSession();

    if (!currentTenantId) {
        return null;
    }

    const tenant = await prisma.tenant.findFirst({
        where: {
            id: currentTenantId,
            active: true,
        },
        select: {
            id: true,
        },
    });

    return tenant?.id ?? null;
}

/**
 * Calcule le compteur courant d'un engin.
 *
 * Les relevés de compteur correspondent à la fin de journée.
 * Les HRM de la date du dernier relevé ne sont donc pas ajoutées
 * une seconde fois.
 *
 * Cette fonction interne ne remplace pas le contrôle d'accès
 * effectué par l'action serveur publique.
 */
async function calculerCompteurCourant(
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

    // Les colonnes HRM sont des dates sans heure.
    // On limite le calcul aux saisies enregistrées jusqu'à aujourd'hui.
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

    const dateDernierReleve = dernierReleve
        ? dernierReleve.du.toISOString().slice(0, 10)
        : null;

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
    const nombreSaisiesHrmAjoutees = saisiesHrm._count._all;

    const compteurBase = dernierReleve
        ? dernierReleve.compteur!
        : (engin.initialHeureChassis ?? 0);

    const compteurCourant = compteurBase + hrmCumulees;

    return {
        enginId: engin.id,
        enginName: engin.name,
        compteurCourant,
        source: dernierReleve
            ? "DERNIER_RELEVE"
            : "COMPTEUR_INITIAL_ET_HRM",
        dateDernierReleve,
        compteurBase,
        hrmCumulees,
        nombreSaisiesHrmAjoutees,
        avertissement:
            "Le calcul utilise uniquement les HRM enregistrées. " +
            "Les journées sans saisie ne sont pas reconstituées.",
    };
}

/**
 * Action serveur : consulter le compteur courant d'un engin.
 *
 * Le contrôle RBAC et l'appartenance au tenant actif
 * sont vérifiés côté serveur.
 */
export async function getCompteurCourantMaintenance(
    enginId: string,
): Promise<CompteurCourantResponse> {
    const permission = await guard(
        ACTION.READ,
        RESOURCE.MAINTENANCE_PREVENTIVE,
    );

    if (!permission.success) {
        return {
            success: false,
            message: permission.message,
            data: null,
        };
    }

    if (!enginId?.trim()) {
        return {
            success: false,
            message: "L'engin est obligatoire.",
            data: null,
        };
    }

    const tenantId = await getMaintenanceTenantId();

    if (!tenantId) {
        return {
            success: false,
            message: "Aucun tenant actif n'est sélectionné.",
            data: null,
        };
    }

    try {
        const data = await calculerCompteurCourant(
            enginId,
            tenantId,
        );

        if (!data) {
            return {
                success: false,
                message: "Engin introuvable dans le tenant actif.",
                data: null,
            };
        }

        return {
            success: true,
            message: "Compteur courant calculé avec succès.",
            data,
        };
    } catch (error) {
        console.error(
            "getCompteurCourantMaintenance error:",
            error,
        );

        return {
            success: false,
            message: "Impossible de calculer le compteur courant.",
            data: null,
        };
    }
}