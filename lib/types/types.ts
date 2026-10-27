import { Site, Tenant } from "../generated/prisma/client";

export type SiteWithTenant = Site &
{ tenant: Tenant };


export interface ActionResponse {
    data?: any[];
    success: boolean;
    message: string;
    meta?: {
        totalItems: number;
        totalPages: number;
        currentPage: number;
        itemsPerPage: number
    }
}

