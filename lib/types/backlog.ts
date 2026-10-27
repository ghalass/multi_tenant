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
    besoinPDR: boolean;
    quantite: string | number | null;
    reference: string;
    code: string;
    stock: string;
    numeroBS: string;
    programmation: string;
    sortiePDR: string;
    equipe: string;
    statut: StatutBacklog;
    dateExecution: string;
    confirmation: string;
    observations: string;
    enginId: string;
    siteId: string;
    commentaireChangementStatut: string;
};

export type BacklogSiteOption = {
    id: string;
    name: string;
    active: boolean;
};

export type BacklogEnginOption = {
    id: string;
    name: string;
    siteId: string;
    active: boolean;
};

export type BacklogOptions = {
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

export type BacklogRecord = {
    id: string;
    numeroBacklog: string;
    dateDetection: Date | string;
    description: string;
    source: SourceBacklog;
    priorite: PrioriteBacklog;
    besoinPDR: boolean;
    quantite: number | null;
    reference: string | null;
    code: string | null;
    stock: string | null;
    numeroBS: string | null;
    programmation: string | null;
    sortiePDR: string | null;
    equipe: string | null;
    statut: StatutBacklog;
    dateExecution: Date | string | null;
    confirmation: string | null;
    observations: string | null;
    enginId: string;
    siteId: string;
    tenantId: string;
    createdAt: Date | string;
    updatedAt: Date | string;
    engin?: BacklogEnginOption;
    site?: BacklogSiteOption;
    historiqueStatutBacklogs?: BacklogStatusHistory[];
};

export type BacklogFilters = {
    search?: string;
    statut?: string;
    priorite?: string;
    source?: string;
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