import { Site, Tenant } from "./generated/prisma/client";

export type SiteWithTenant = Site & { tenant: Tenant };