import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type LubrifiantObjectiveField = "spe_huile" | "spe_go" | "spe_graisse";

export function getLubrifiantObjectiveField(
  typeName: string,
): LubrifiantObjectiveField | null {
  const normalized = typeName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  if (normalized.includes("huile")) return "spe_huile";
  if (
    normalized.includes("gasoil") ||
    normalized.includes("diesel") ||
    normalized === "go"
  ) {
    return "spe_go";
  }
  if (normalized.includes("graisse")) return "spe_graisse";
  return null;
}

export async function getLubrifiantTenantId(): Promise<string | null> {
  const { currentTenantId } = await getSession();
  if (!currentTenantId) return null;

  const tenant = await prisma.tenant.findFirst({
    where: { id: currentTenantId, active: true },
    select: { id: true },
  });
  return tenant?.id ?? null;
}

export function parseDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

export function prismaErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}
