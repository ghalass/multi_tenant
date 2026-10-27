import type {
    PrioriteBacklog,
    SourceBacklog,
    StatutBacklog,
} from "@/lib/generated/prisma/enums";

export type BacklogFormValues = {
    numeroBacklog: string;
    dateDetection: string;
    description: string;
    source: SourceBacklog | "";
    priorite: PrioriteBacklog | "";
    equipe: string;
    statut: StatutBacklog;
    dateExecution: string;
    observations: string;
    enginId: string;
    siteId: string;
    commentaireChangementStatut: string;
};

export type BacklogTypeparcOption = {
    id: string;
    name: string;
};

export type BacklogParcOption = {
    id: string;
    name: string;
    typeparcId: string;
};

export type BacklogSiteOption = {
    id: string;
    name: string;
    active: boolean;
};

export type BacklogEnginOption = {
    id: string;
    name: string;
    parcId: string;
    siteId: string;
    active: boolean;
};

export type BacklogOptions = {
    typeparcs: BacklogTypeparcOption[];
    parcs: BacklogParcOption[];
    sites: BacklogSiteOption[];
    engins: BacklogEnginOption[];
};

export type BacklogStatusHistory = {
    id: string;
    ancienStatut: StatutBacklog;
    nouveauStatut: StatutBacklog;
    dateChangement: Date | string;
    commentaire: string | null;
};

export type BacklogRecordEngin = Pick<
    BacklogEnginOption,
    "id" | "name" | "siteId" | "active"
>;

export type BacklogRecord = {
    id: string;
    numeroBacklog: string;
    dateDetection: Date | string;
    description: string;
    source: SourceBacklog;
    priorite: PrioriteBacklog;
    equipe: string | null;
    statut: StatutBacklog;
    dateExecution: Date | string | null;
    observations: string | null;
    enginId: string;
    siteId: string;
    tenantId: string;
    createdAt: Date | string;
    updatedAt: Date | string;
    engin?: BacklogRecordEngin;
    site?: BacklogSiteOption;
    historiqueStatutBacklogs?: BacklogStatusHistory[];
};

export type BacklogFilters = {
    search?: string;
    statut?: string;
    priorite?: string;
    source?: string;
    typeparcId?: string;
    parcId?: string;
    enginId?: string;
    siteId?: string;
    dateFrom?: string;
    dateTo?: string;
    currentPage?: string | number;
    itemsPerPage?: string | number;
};

export type BacklogStats = {
    total: number;
    parStatut: Record<StatutBacklog, number>;
    parPriorite: Record<PrioriteBacklog, number>;
    parSource: Record<SourceBacklog, number>;
};

export type BacklogPeriodStats = {
    total: number;
    global: boolean;
    pas: "jour" | "mois";
    evolution: {
        date: string;
        label: string;
        backlogs: number;
        executes: number;
    }[];
    parStatut: { label: StatutBacklog; value: number }[];
    parPriorite: { label: PrioriteBacklog; value: number }[];
    parSource: { label: SourceBacklog; value: number }[];
};

export type BacklogStatsFilters = Pick<
    BacklogFilters,
    "typeparcId" | "parcId" | "enginId" | "siteId"
>;

export type BacklogOptionsResponse = {
    success: boolean;
    message: string;
    data: BacklogOptions;
};

export type BacklogStatsResponse = {
    success: boolean;
    message: string;
    data: BacklogStats;
};

export type BacklogPeriodStatsResponse = {
    success: boolean;
    message: string;
    data: BacklogPeriodStats;
};