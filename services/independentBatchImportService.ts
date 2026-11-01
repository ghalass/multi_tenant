import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type {
  IndependentBatchRequest,
  IndependentBatchRowResult,
  IndependentBatchSummary,
} from "@/services/independentBatchImportTypes";

const CHUNK_SIZE = 100;

type SourceRow = {
  data: Record<string, unknown>;
  excelRow: number;
};

type PreparedRow<T> = SourceRow & {
  value: T;
};

type BatchProgress = {
  processed: number;
  total: number;
  results: IndependentBatchRowResult[];
};

const SOURCE_VALUES = ["VS", "VJ", "INSPECTION", "AUTRE"] as const;
const PRIORITY_VALUES = ["ELEVEE", "MOYENNE", "FAIBLE"] as const;
const STATUS_VALUES = [
  "ATTENTE_PROGRAMME",
  "ATTENTE_PDR",
  "PDR_PRET",
  "PROGRAMMEE",
  "EXECUTE",
] as const;

function text(value: unknown): string {
  return value === undefined || value === null ? "" : String(value).trim();
}

function requiredText(row: Record<string, unknown>, key: string): string {
  const value = text(row[key]);
  if (!value) throw new Error(`Le champ "${key}" est obligatoire.`);
  return value;
}

function numberValue(value: unknown, field: string, required = false): number | null {
  const raw = text(value).replace(",", ".");
  if (!raw) {
    if (required) throw new Error(`Le champ "${field}" est obligatoire.`);
    return null;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) throw new Error(`Le champ "${field}" doit être numérique.`);
  return parsed;
}

function parseDate(value: unknown, field: string): Date {
  let date: Date;
  if (value instanceof Date) {
    date = new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
  } else if (typeof value === "number" && Number.isFinite(value)) {
    date = new Date(Date.UTC(1899, 11, 30) + Math.round(value) * 86400000);
  } else {
    const raw = text(value);
    const frenchDate = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(raw);
    if (frenchDate) {
      const day = Number(frenchDate[1]);
      const month = Number(frenchDate[2]);
      const year = Number(frenchDate[3]);
      date = new Date(Date.UTC(year, month - 1, day));
      if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
      ) {
        throw new Error(`Le champ "${field}" contient une date invalide.`);
      }
    } else {
      date = new Date(raw);
      if (!Number.isNaN(date.getTime())) {
        date = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      }
    }
  }
  if (Number.isNaN(date.getTime())) throw new Error(`Le champ "${field}" contient une date invalide.`);
  return date;
}

function enumValue<T extends readonly string[]>(
  value: unknown,
  allowed: T,
  field: string,
  defaultValue?: T[number],
): T[number] {
  const normalized = text(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
  const candidate = normalized || defaultValue;
  if (!candidate || !allowed.includes(candidate)) {
    throw new Error(`Valeur invalide pour "${field}" : "${text(value)}".`);
  }
  return candidate as T[number];
}

function sourceRows(request: IndependentBatchRequest): SourceRow[] {
  return request.rows.map((data, index) => ({
    data,
    excelRow: request.rowNumbers[index] ?? index + 2,
  }));
}

function rowFailure(row: SourceRow, error: unknown): IndependentBatchRowResult {
  const context = [`Ligne Excel ${row.excelRow}`];
  const engineName =
    row.data.enginName ?? row.data.engin ??
    (row.data.name && row.data.parcName ? row.data.name : undefined);
  if (engineName && text(engineName)) context.push(`Engin : ${text(engineName)}`);
  for (const key of ["du", "au", "dateDetection", "dateExecution"]) {
    if (text(row.data[key])) context.push(`${key} : ${text(row.data[key])}`);
  }
  for (const key of ["section", "imputation", "code", "lubrifiantName", "designation", "qte"]) {
    if (text(row.data[key])) context.push(`${key} : ${text(row.data[key])}`);
  }
  const message = error instanceof Error ? error.message : "Erreur inattendue.";
  return { row: row.excelRow, success: false, message: `${context.join(" | ")} — ${message}` };
}

function rowSuccess(row: SourceRow, message: string): IndependentBatchRowResult {
  return { row: row.excelRow, success: true, message };
}

function deduplicationKey(
  module: IndependentBatchRequest["module"],
  data: Record<string, unknown>,
): string {
  const normalized = (value: unknown): string => text(value).toLocaleLowerCase();
  const dateKey = (value: unknown, field: string): string => {
    try {
      return parseDate(value, field).toISOString().slice(0, 10);
    } catch {
      return normalized(value);
    }
  };
  switch (module) {
    case "sites":
    case "typeparcs":
    case "typepannes":
    case "type_lubrifiants":
    case "parcs":
    case "engins":
    case "pannes":
    case "lubrifiants":
      return normalized(data.name);
    case "saisie_lubrifiants":
      return makeRowKey(
        dateKey(data.du, "du"),
        dateKey(data.au, "au"),
        normalized(data.enginName),
        normalized(data.lubrifiantName),
        normalized(data.section),
        normalized(data.imputation),
      );
    case "backlogs":
      return normalized(data.numeroBacklog ?? data.numero);
    case "objectifs":
      return makeRowKey(data.annee as string | number, normalized(data.siteName ?? data.site), normalized(data.parcName ?? data.parc));
    case "saisie_hrm":
      return makeRowKey(normalized(data.du), normalized(data.enginName));
    case "saisie_hims":
      return makeRowKey(normalized(data.du), normalized(data.enginName), normalized(data.panneName));
  }
}

function completeChunkResults(
  module: IndependentBatchRequest["module"],
  input: SourceRow[],
  results: IndependentBatchRowResult[],
): IndependentBatchRowResult[] {
  const resultByRow = new Map(results.map((result) => [result.row, result]));
  const resultByKey = new Map<string, IndependentBatchRowResult>();
  for (const result of results) {
    const source = input.find((row) => row.excelRow === result.row);
    if (source) resultByKey.set(deduplicationKey(module, source.data), result);
  }

  const completed = input.map((row) => {
    const direct = resultByRow.get(row.excelRow);
    if (direct) return direct;
    const grouped = resultByKey.get(deduplicationKey(module, row.data));
    if (grouped) {
      return {
        ...grouped,
        row: row.excelRow,
        message: grouped.success
          ? `Ligne regroupée avec une autre entrée identique du lot. ${grouped.message}`
          : `Entrée identique au lot non enregistrée. ${grouped.message}`,
      };
    }
    return rowFailure(row, new Error("Cette ligne n'a pas reçu de résultat d'écriture."));
  });
  return completed.sort((a, b) => a.row - b.row);
}

function groupByLast<T extends { key: string }>(rows: T[]): T[] {
  const last = new Map<string, T>();
  for (const row of rows) last.set(row.key, row);
  return [...last.values()];
}

function makeRowKey(...values: (string | number)[]): string {
  return values.map((value) => String(value).toLocaleLowerCase()).join("\u0000");
}

async function batchNamedRecords(
  module: "sites" | "typeparcs" | "typepannes" | "type_lubrifiants",
  tenantId: string,
  input: SourceRow[],
): Promise<IndependentBatchRowResult[]> {
  const valid: PreparedRow<{ key: string; name: string; description?: string | null }>[] = [];
  const results: IndependentBatchRowResult[] = [];
  for (const row of input) {
    try {
      const name = requiredText(row.data, "name");
      valid.push({
        ...row,
        value: {
          key: name.toLocaleLowerCase(),
          name,
          ...(module === "typepannes" ? { description: text(row.data.description) || null } : {}),
        },
      });
    } catch (error) {
      results.push(rowFailure(row, error));
    }
  }
  if (valid.length === 0) return results;

  const names = [...new Set(valid.map(({ value }) => value.name))];
  const existing =
    module === "sites"
      ? await prisma.site.findMany({
          where: { tenantId, name: { in: names, mode: "insensitive" } },
          select: { id: true, name: true },
        })
      : module === "typeparcs"
        ? await prisma.typeparc.findMany({
            where: { tenantId, name: { in: names, mode: "insensitive" } },
            select: { id: true, name: true },
          })
        : module === "typepannes"
          ? await prisma.typepanne.findMany({
              where: { tenantId, name: { in: names, mode: "insensitive" } },
              select: { id: true, name: true },
            })
          : await prisma.typeLubrifiant.findMany({
              where: { tenantId, name: { in: names, mode: "insensitive" } },
              select: { id: true, name: true },
            });
  const byName = new Map<string, { id: string; name: string }[]>();
  for (const record of existing) {
    const key = record.name.toLocaleLowerCase();
    byName.set(key, [...(byName.get(key) ?? []), record]);
  }

  const latest = groupByLast(valid.map((row) => ({ ...row, key: row.value.key })));
  const ambiguous = new Set<string>();
  for (const row of latest) {
    if ((byName.get(row.key)?.length ?? 0) > 1) {
      ambiguous.add(row.key);
      results.push(rowFailure(row, new Error(`Plusieurs enregistrements correspondent à "${row.value.name}".`)));
    }
  }
  const accepted = latest.filter((row) => !ambiguous.has(row.key));

  try {
    await prisma.$transaction(async (tx) => {
      const inserts = accepted.filter((row) => !byName.has(row.key));
      const updates = accepted.filter((row) => byName.has(row.key));
      if (module === "sites") {
        if (inserts.length) {
          await tx.site.createMany({
            data: inserts.map((row) => ({ id: randomUUID(), name: row.value.name, tenantId })),
            skipDuplicates: true,
          });
        }
        for (const row of updates) {
          const match = byName.get(row.key)?.[0];
          if (match) await tx.site.update({ where: { id: match.id }, data: { name: row.value.name } });
        }
      } else if (module === "typeparcs") {
        if (inserts.length) {
          await tx.typeparc.createMany({
            data: inserts.map((row) => ({ id: randomUUID(), name: row.value.name, tenantId })),
            skipDuplicates: true,
          });
        }
        for (const row of updates) {
          const match = byName.get(row.key)?.[0];
          if (match) await tx.typeparc.update({ where: { id: match.id }, data: { name: row.value.name } });
        }
      } else if (module === "typepannes") {
        if (inserts.length) {
          await tx.typepanne.createMany({
            data: inserts.map((row) => ({
              id: randomUUID(),
              name: row.value.name,
              description: row.value.description ?? null,
              tenantId,
            })),
            skipDuplicates: true,
          });
        }
        for (const row of updates) {
          const match = byName.get(row.key)?.[0];
          if (match) {
            await tx.typepanne.update({
              where: { id: match.id },
              data: { name: row.value.name, description: row.value.description ?? null },
            });
          }
        }
      } else {
        if (inserts.length) {
          await tx.typeLubrifiant.createMany({
            data: inserts.map((row) => ({
              id: randomUUID(),
              name: row.value.name,
              tenantId,
            })),
            skipDuplicates: true,
          });
        }
        for (const row of updates) {
          const match = byName.get(row.key)?.[0];
          if (match) {
            await tx.typeLubrifiant.update({
              where: { id: match.id },
              data: { name: row.value.name },
            });
          }
        }
      }
    });
    for (const row of accepted) {
      results.push(rowSuccess(row, `${module} « ${row.value.name} » importé.`));
    }
  } catch (error) {
    for (const row of accepted) results.push(rowFailure(row, error));
  }
  return results.sort((a, b) => a.row - b.row);
}

function splitNames(value: unknown): string[] {
  return [...new Set(text(value).split(/[;|\n]/).map((name) => name.trim()).filter(Boolean))];
}

async function batchLubrifiants(
  tenantId: string,
  input: SourceRow[],
): Promise<IndependentBatchRowResult[]> {
  const results: IndependentBatchRowResult[] = [];
  const typeNames = [...new Set(input.map(({ data }) => text(data.typeLubrifiantName)).filter(Boolean))];
  const parcNames = [...new Set(input.flatMap(({ data }) => splitNames(data.parcNames)))];
  const [types, parcs] = await Promise.all([
    prisma.typeLubrifiant.findMany({
      where: { tenantId, name: { in: typeNames, mode: "insensitive" } },
      select: { id: true, name: true },
    }),
    prisma.parc.findMany({
      where: { tenantId, name: { in: parcNames, mode: "insensitive" } },
      select: { id: true, name: true },
    }),
  ]);
  const typesByName = new Map<string, typeof types>();
  const parcsByName = new Map<string, typeof parcs>();
  for (const type of types) {
    const key = type.name.toLocaleLowerCase();
    typesByName.set(key, [...(typesByName.get(key) ?? []), type]);
  }
  for (const parc of parcs) {
    const key = parc.name.toLocaleLowerCase();
    parcsByName.set(key, [...(parcsByName.get(key) ?? []), parc]);
  }

  const prepared: PreparedRow<{
    key: string;
    name: string;
    code: string;
    unite: string;
    typeLubrifiantId: string;
    parcIds: string[];
  }>[] = [];
  for (const row of input) {
    try {
      const name = requiredText(row.data, "name");
      const code = requiredText(row.data, "code");
      const unite = requiredText(row.data, "unite");
      const typeName = requiredText(row.data, "typeLubrifiantName");
      const typeMatches = typesByName.get(typeName.toLocaleLowerCase()) ?? [];
      if (typeMatches.length !== 1) {
        throw new Error(typeMatches.length
          ? `Le type de lubrifiant "${typeName}" est ambigu.`
          : `Le type de lubrifiant "${typeName}" est introuvable.`);
      }
      const requestedParcs = splitNames(row.data.parcNames);
      if (!requestedParcs.length) throw new Error("Indiquez au moins un parc dans parcNames.");
      const parcIds = requestedParcs.map((parcName) => {
        const matches = parcsByName.get(parcName.toLocaleLowerCase()) ?? [];
        if (matches.length !== 1) {
          throw new Error(matches.length
            ? `Le parc "${parcName}" est ambigu.`
            : `Le parc "${parcName}" est introuvable.`);
        }
        return matches[0].id;
      });
      prepared.push({
        ...row,
        value: {
          key: name.toLocaleLowerCase(),
          name,
          code,
          unite,
          typeLubrifiantId: typeMatches[0].id,
          parcIds,
        },
      });
    } catch (error) {
      results.push(rowFailure(row, error));
    }
  }
  if (!prepared.length) return results;

  const latest = groupByLast(prepared.map((row) => ({ ...row, key: row.value.key })));
  const names = latest.map(({ value }) => value.name);
  const existing = await prisma.lubrifiant.findMany({
    where: { tenantId, name: { in: names, mode: "insensitive" } },
    select: { id: true, name: true },
  });
  const byName = new Map<string, typeof existing>();
  for (const item of existing) {
    const key = item.name.toLocaleLowerCase();
    byName.set(key, [...(byName.get(key) ?? []), item]);
  }
  const ambiguous = new Set<string>();
  for (const row of latest) {
    if ((byName.get(row.key)?.length ?? 0) > 1) {
      ambiguous.add(row.key);
      results.push(rowFailure(row, new Error(`Plusieurs lubrifiants correspondent à "${row.value.name}".`)));
    }
  }
  const accepted = latest.filter((row) => !ambiguous.has(row.key));

  try {
    await prisma.$transaction(async (tx) => {
      for (const row of accepted) {
        const found = byName.get(row.key)?.[0];
        const record = found
          ? await tx.lubrifiant.update({
              where: { id: found.id },
              data: {
                name: row.value.name,
                code: row.value.code,
                unite: row.value.unite,
                typeLubrifiantId: row.value.typeLubrifiantId,
              },
              select: { id: true },
            })
          : await tx.lubrifiant.create({
              data: {
                name: row.value.name,
                code: row.value.code,
                unite: row.value.unite,
                typeLubrifiantId: row.value.typeLubrifiantId,
                tenantId,
              },
              select: { id: true },
            });
        await tx.lubrifiantParc.deleteMany({
          where: { tenantId, lubrifiantId: record.id },
        });
        await tx.lubrifiantParc.createMany({
          data: row.value.parcIds.map((parcId) => ({
            parcId,
            lubrifiantId: record.id,
            tenantId,
          })),
        });
      }
    });
    for (const row of accepted) {
      results.push(rowSuccess(row, `Lubrifiant « ${row.value.name} » importé avec ses parcs.`));
    }
  } catch (error) {
    for (const row of accepted) results.push(rowFailure(row, error));
  }
  return results.sort((a, b) => a.row - b.row);
}

async function batchSaisieLubrifiants(
  tenantId: string,
  input: SourceRow[],
): Promise<IndependentBatchRowResult[]> {
  const results: IndependentBatchRowResult[] = [];
  const enginNames = [...new Set(input.map(({ data }) => text(data.enginName)).filter(Boolean))];
  const lubrifiantNames = [...new Set(input.map(({ data }) => text(data.lubrifiantName)).filter(Boolean))];
  const [engins, lubrifiants] = await Promise.all([
    prisma.engin.findMany({
      where: { tenantId, name: { in: enginNames, mode: "insensitive" } },
      select: { id: true, name: true, parcId: true },
    }),
    prisma.lubrifiant.findMany({
      where: { tenantId, name: { in: lubrifiantNames, mode: "insensitive" } },
      select: {
        id: true,
        name: true,
        code: true,
        parcs: { where: { tenantId }, select: { parcId: true } },
        typeLubrifiant: { select: { name: true } },
      },
    }),
  ]);
  const enginsByName = new Map<string, typeof engins>();
  const lubrifiantsByName = new Map<string, typeof lubrifiants>();
  for (const engin of engins) {
    const key = engin.name.toLocaleLowerCase();
    enginsByName.set(key, [...(enginsByName.get(key) ?? []), engin]);
  }
  for (const lubrifiant of lubrifiants) {
    const key = lubrifiant.name.toLocaleLowerCase();
    lubrifiantsByName.set(key, [...(lubrifiantsByName.get(key) ?? []), lubrifiant]);
  }
  const prepared: PreparedRow<{
    key: string;
    du: Date;
    au: Date;
    section: string;
    imputation: string;
    qte: number;
    enginId: string;
    enginName: string;
    lubrifiantId: string;
    lubrifiantName: string;
  }>[] = [];

  for (const row of input) {
    try {
      const du = parseDate(row.data.du, "du");
      const au = parseDate(row.data.au, "au");
      if (du > au) throw new Error("La date « du » doit être antérieure ou égale à « au ».");
      const section = requiredText(row.data, "section");
      const imputation = requiredText(row.data, "imputation");
      const code = requiredText(row.data, "code");
      const name = requiredText(row.data, "lubrifiantName");
      const designation = requiredText(row.data, "designation");
      const enginName = requiredText(row.data, "enginName");
      const enginMatches = enginsByName.get(enginName.toLocaleLowerCase()) ?? [];
      const lubrifiantMatches = lubrifiantsByName.get(name.toLocaleLowerCase()) ?? [];
      if (enginMatches.length !== 1) {
        throw new Error(enginMatches.length
          ? `Le nom d’engin "${enginName}" correspond à plusieurs engins.`
          : `Engin "${enginName}" introuvable.`);
      }
      if (lubrifiantMatches.length !== 1) {
        throw new Error(lubrifiantMatches.length
          ? `Le nom de lubrifiant "${name}" correspond à plusieurs lubrifiants.`
          : `Lubrifiant "${name}" introuvable.`);
      }
      const engin = enginMatches[0];
      const lubrifiant = lubrifiantMatches[0];
      if (lubrifiant.code.toLocaleLowerCase() !== code.toLocaleLowerCase()) {
        throw new Error(`Le code "${code}" ne correspond pas au lubrifiant "${name}".`);
      }
      if (lubrifiant.typeLubrifiant.name.toLocaleLowerCase() !== designation.toLocaleLowerCase()) {
        throw new Error(`La désignation "${designation}" ne correspond pas au lubrifiant "${name}".`);
      }
      if (!lubrifiant.parcs.some((item) => item.parcId === engin.parcId)) {
        throw new Error(`Le lubrifiant "${name}" n’est pas associé au parc de l’engin "${enginName}".`);
      }
      const qte = numberValue(row.data.qte, "qte", true);
      if (qte === null || qte <= 0) throw new Error("La quantité doit être strictement positive.");
      prepared.push({
        ...row,
        value: {
          key: makeRowKey(
            du.toISOString().slice(0, 10),
            au.toISOString().slice(0, 10),
            engin.id,
            lubrifiant.id,
            section.toLocaleLowerCase(),
            imputation.toLocaleLowerCase(),
          ),
          du,
          au,
          section,
          imputation,
          qte,
          enginId: engin.id,
          enginName: engin.name,
          lubrifiantId: lubrifiant.id,
          lubrifiantName: lubrifiant.name,
        },
      });
    } catch (error) {
      results.push(rowFailure(row, error));
    }
  }
  if (!prepared.length) return results;

  const latest = groupByLast(prepared.map((row) => ({ ...row, key: row.value.key })));
  const conflicts = new Map<string, string>();
  for (let first = 0; first < latest.length; first += 1) {
    for (let second = first + 1; second < latest.length; second += 1) {
      const left = latest[first].value;
      const right = latest[second].value;
      if (
        left.enginId === right.enginId &&
        left.lubrifiantId === right.lubrifiantId &&
        left.du <= right.au &&
        right.du <= left.au
      ) {
        conflicts.set(left.key, right.key);
        conflicts.set(right.key, left.key);
      }
    }
  }
  const conflictRows = latest.filter((row) => conflicts.has(row.key));
  for (const row of conflictRows) {
    results.push(rowFailure(
      row,
      new Error(`La période chevauche une autre ligne du fichier pour l’engin "${row.value.enginName}" et le lubrifiant "${row.value.lubrifiantName}".`),
    ));
  }
  const candidates = latest.filter((row) => !conflicts.has(row.key));
  if (!candidates.length) return results.sort((a, b) => a.row - b.row);

  const minDu = candidates.reduce((min, row) => row.value.du < min ? row.value.du : min, candidates[0].value.du);
  const maxAu = candidates.reduce((max, row) => row.value.au > max ? row.value.au : max, candidates[0].value.au);
  const pairs = [...new Map(candidates.map((row) => [
    makeRowKey(row.value.enginId, row.value.lubrifiantId),
    { enginId: row.value.enginId, lubrifiantId: row.value.lubrifiantId },
  ])).values()];
  const existing = await prisma.saisieLubrifiant.findMany({
    where: {
      tenantId,
      du: { lte: maxAu },
      au: { gte: minDu },
      OR: pairs,
    },
    select: {
      id: true,
      du: true,
      au: true,
      enginId: true,
      lubrifiantId: true,
      section: true,
      imputation: true,
    },
  });
  const toProcess: typeof candidates = [];
  for (const row of candidates) {
    const exactKey = row.value.key;
    const overlapping = existing.find((item) =>
      item.enginId === row.value.enginId &&
      item.lubrifiantId === row.value.lubrifiantId &&
      item.du <= row.value.au &&
      item.au >= row.value.du &&
      makeRowKey(
        item.du.toISOString().slice(0, 10),
        item.au.toISOString().slice(0, 10),
        item.enginId,
        item.lubrifiantId,
        item.section.toLocaleLowerCase(),
        item.imputation.toLocaleLowerCase(),
      ) !== exactKey,
    );
    if (overlapping) {
      results.push(rowFailure(
        row,
        new Error(`La période chevauche la consommation existante du ${overlapping.du.toISOString().slice(0, 10)} au ${overlapping.au.toISOString().slice(0, 10)} pour l’engin "${row.value.enginName}" et le lubrifiant "${row.value.lubrifiantName}".`),
      ));
    } else {
      toProcess.push(row);
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (const row of toProcess) {
        const value = row.value;
        const overlap = await tx.saisieLubrifiant.findFirst({
          where: {
            tenantId,
            enginId: value.enginId,
            lubrifiantId: value.lubrifiantId,
            du: { lte: value.au },
            au: { gte: value.du },
            NOT: {
              du: value.du,
              au: value.au,
              section: value.section,
              imputation: value.imputation,
            },
          },
          select: { id: true },
        });
        if (overlap) throw new Error("OVERLAPPING_CONSUMPTION");

        const existingRow = await tx.saisieLubrifiant.findUnique({
          where: {
            du_au_enginId_lubrifiantId_section_imputation_tenantId: {
              du: value.du,
              au: value.au,
              enginId: value.enginId,
              lubrifiantId: value.lubrifiantId,
              section: value.section,
              imputation: value.imputation,
              tenantId,
            },
          },
          select: { id: true },
        });
        if (existingRow) {
          await tx.saisieLubrifiant.update({
            where: { id: existingRow.id },
            data: { qte: value.qte },
          });
        } else {
          await tx.saisieLubrifiant.create({
            data: {
              du: value.du,
              au: value.au,
              section: value.section,
              imputation: value.imputation,
              qte: value.qte,
              enginId: value.enginId,
              lubrifiantId: value.lubrifiantId,
              tenantId,
            },
          });
        }
      }
    }, { isolationLevel: "Serializable" });
    for (const row of toProcess) {
      results.push(rowSuccess(row, `Consommation du lubrifiant « ${row.value.lubrifiantName} » importée pour l’engin « ${row.value.enginName} ».`));
    }
  } catch (error) {
    for (const row of toProcess) {
      results.push(rowFailure(
        row,
        new Error(error instanceof Error && error.message === "OVERLAPPING_CONSUMPTION"
          ? "Une consommation concurrente chevauche cette période."
          : error instanceof Error ? error.message : "Erreur d’écriture du lot."),
      ));
    }
  }
  return results.sort((a, b) => a.row - b.row);
}

async function batchParcs(tenantId: string, input: SourceRow[]): Promise<IndependentBatchRowResult[]> {
  const results: IndependentBatchRowResult[] = [];
  const prepared: PreparedRow<{ key: string; name: string; typeparcId: string }>[] = [];
  const typeNames = [...new Set(input.map(({ data }) => text(data.typeparcName)).filter(Boolean))];
  const types = await prisma.typeparc.findMany({
    where: { tenantId, name: { in: typeNames, mode: "insensitive" } },
    select: { id: true, name: true },
  });
  const typesByName = new Map<string, typeof types>();
  for (const type of types) {
    const key = type.name.toLocaleLowerCase();
    typesByName.set(key, [...(typesByName.get(key) ?? []), type]);
  }
  for (const row of input) {
    try {
      const name = requiredText(row.data, "name");
      const typeName = requiredText(row.data, "typeparcName");
      const matches = typesByName.get(typeName.toLocaleLowerCase()) ?? [];
      if (matches.length !== 1) throw new Error(matches.length ? `Type de parc "${typeName}" ambigu.` : `Type de parc "${typeName}" introuvable.`);
      prepared.push({ ...row, value: { key: name.toLocaleLowerCase(), name, typeparcId: matches[0].id } });
    } catch (error) {
      results.push(rowFailure(row, error));
    }
  }
  if (!prepared.length) return results;
  const names = [...new Set(prepared.map(({ value }) => value.name))];
  const existing = await prisma.parc.findMany({
    where: { tenantId, name: { in: names, mode: "insensitive" } },
    select: { id: true, name: true },
  });
  const byName = new Map(existing.map((record) => [record.name.toLocaleLowerCase(), record]));
  const latest = groupByLast(prepared.map((row) => ({ ...row, key: row.value.key })));
  try {
    await prisma.$transaction(async (tx) => {
      const inserts = latest.filter((row) => !byName.has(row.key));
      if (inserts.length) {
        await tx.parc.createMany({
          data: inserts.map((row) => ({
            id: randomUUID(),
            name: row.value.name,
            typeparcId: row.value.typeparcId,
            tenantId,
          })),
          skipDuplicates: true,
        });
      }
      for (const row of latest.filter((item) => byName.has(item.key))) {
        const match = byName.get(row.key);
        if (match) {
          await tx.parc.update({
            where: { id: match.id },
            data: { name: row.value.name, typeparcId: row.value.typeparcId },
          });
        }
      }
    });
    for (const row of latest) results.push(rowSuccess(row, `Parc « ${row.value.name} » importé.`));
  } catch (error) {
    for (const row of latest) results.push(rowFailure(row, error));
  }
  return results.sort((a, b) => a.row - b.row);
}

async function batchEngins(tenantId: string, input: SourceRow[]): Promise<IndependentBatchRowResult[]> {
  const results: IndependentBatchRowResult[] = [];
  const parcNames = [...new Set(input.map(({ data }) => text(data.parcName)).filter(Boolean))];
  const siteNames = [...new Set(input.map(({ data }) => text(data.siteName)).filter(Boolean))];
  const [parcs, sites] = await Promise.all([
    prisma.parc.findMany({ where: { tenantId, name: { in: parcNames, mode: "insensitive" } }, select: { id: true, name: true } }),
    prisma.site.findMany({ where: { tenantId, name: { in: siteNames, mode: "insensitive" } }, select: { id: true, name: true, active: true } }),
  ]);
  const parcMap = new Map(parcs.map((item) => [item.name.toLocaleLowerCase(), item]));
  const siteMap = new Map(sites.map((item) => [item.name.toLocaleLowerCase(), item]));
  const prepared: PreparedRow<{ key: string; name: string; parcId: string; siteId: string; active: boolean }>[] = [];
  for (const row of input) {
    try {
      const name = requiredText(row.data, "name");
      const parcName = requiredText(row.data, "parcName");
      const siteName = requiredText(row.data, "siteName");
      const parc = parcMap.get(parcName.toLocaleLowerCase());
      const site = siteMap.get(siteName.toLocaleLowerCase());
      if (!parc) throw new Error(`Parc "${parcName}" introuvable.`);
      if (!site) throw new Error(`Site "${siteName}" introuvable.`);
      if (!site.active) throw new Error(`Le site "${site.name}" est inactif.`);
      const activeRaw = text(row.data.active).toLowerCase();
      const active = !activeRaw || ["true", "1", "oui", "yes", "active"].includes(activeRaw);
      prepared.push({ ...row, value: { key: name.toLocaleLowerCase(), name, parcId: parc.id, siteId: site.id, active } });
    } catch (error) {
      results.push(rowFailure(row, error));
    }
  }
  if (!prepared.length) return results;
  const latest = groupByLast(prepared.map((row) => ({ ...row, key: row.value.key })));
  const names = latest.map(({ value }) => value.name);
  const existing = await prisma.engin.findMany({
    where: { tenantId, name: { in: names, mode: "insensitive" } },
    select: { id: true, name: true, active: true, parcId: true, siteId: true },
  });
  const existingMap = new Map(existing.map((item) => [item.name.toLocaleLowerCase(), item]));
  const toCreate = latest.filter((row) => !existingMap.has(row.key));
  const toUpdate: typeof latest = [];
  for (const row of latest) {
    const match = existingMap.get(row.key);
    if (!match) continue;
    if (!match.active) {
      results.push(rowFailure(row, new Error(`L'engin "${match.name}" est inactif.`)));
    } else if (match.parcId !== row.value.parcId || match.siteId !== row.value.siteId) {
      results.push(rowFailure(row, new Error("Un engin existant ne peut pas être déplacé par l'import en lots.")));
    } else {
      toUpdate.push(row);
    }
  }
  try {
    await prisma.$transaction(async (tx) => {
      if (toCreate.length) {
        await tx.engin.createMany({
          data: toCreate.map((row) => ({
            id: randomUUID(),
            name: row.value.name,
            parcId: row.value.parcId,
            siteId: row.value.siteId,
            active: row.value.active,
            tenantId,
          })),
          skipDuplicates: true,
        });
      }
      for (const row of toUpdate) {
        const match = existingMap.get(row.key);
        if (match) {
          await tx.engin.update({ where: { id: match.id }, data: { name: row.value.name } });
        }
      }
    });
    for (const row of [...toCreate, ...toUpdate]) results.push(rowSuccess(row, `Engin « ${row.value.name} » importé.`));
  } catch (error) {
    for (const row of [...toCreate, ...toUpdate]) results.push(rowFailure(row, error));
  }
  return results.sort((a, b) => a.row - b.row);
}

async function batchPannes(tenantId: string, input: SourceRow[]): Promise<IndependentBatchRowResult[]> {
  const results: IndependentBatchRowResult[] = [];
  const typeNames = [...new Set(input.map(({ data }) => text(data.typepanneName)).filter(Boolean))];
  const parcNames = [...new Set(input.map(({ data }) => text(data.parcName)).filter(Boolean))];
  const [types, parcs] = await Promise.all([
    prisma.typepanne.findMany({ where: { tenantId, name: { in: typeNames, mode: "insensitive" } }, select: { id: true, name: true } }),
    prisma.parc.findMany({ where: { tenantId, name: { in: parcNames, mode: "insensitive" } }, select: { id: true, name: true } }),
  ]);
  const typeMap = new Map(types.map((item) => [item.name.toLocaleLowerCase(), item]));
  const parcMap = new Map(parcs.map((item) => [item.name.toLocaleLowerCase(), item]));
  const prepared: PreparedRow<{ key: string; name: string; typepanneId: string; parcId: string; description: string }>[] = [];
  for (const row of input) {
    try {
      const name = requiredText(row.data, "name");
      const description = requiredText(row.data, "description");
      const typeName = requiredText(row.data, "typepanneName");
      const parcName = requiredText(row.data, "parcName");
      const type = typeMap.get(typeName.toLocaleLowerCase());
      const parc = parcMap.get(parcName.toLocaleLowerCase());
      if (!type) throw new Error(`Type de panne "${typeName}" introuvable.`);
      if (!parc) throw new Error(`Parc "${parcName}" introuvable.`);
      prepared.push({ ...row, value: { key: name.toLocaleLowerCase(), name, typepanneId: type.id, parcId: parc.id, description } });
    } catch (error) {
      results.push(rowFailure(row, error));
    }
  }
  if (!prepared.length) return results;
  const latest = groupByLast(prepared.map((row) => ({ ...row, key: row.value.key })));
  const names = latest.map(({ value }) => value.name);
  const existing = await prisma.panne.findMany({
    where: { tenantId, name: { in: names, mode: "insensitive" } },
    select: { id: true, name: true, typepanneId: true },
  });
  const byName = new Map(existing.map((item) => [item.name.toLocaleLowerCase(), item]));
  const creates = latest.filter((row) => !byName.has(row.key));
  const updates: typeof latest = [];
  for (const row of latest) {
    const match = byName.get(row.key);
    if (match && match.typepanneId !== row.value.typepanneId) {
      const used = await prisma.saisiehim.count({ where: { panneId: match.id, tenantId } });
      if (used > 0) {
        results.push(rowFailure(row, new Error("Le type de cette panne ne peut pas changer car elle est liée à des saisies HIM.")));
        continue;
      }
    }
    if (match) updates.push(row);
  }
  const accepted = [...creates, ...updates];
  try {
    await prisma.$transaction(async (tx) => {
      if (creates.length) {
        await tx.panne.createMany({
          data: creates.map((row) => ({ id: randomUUID(), name: row.value.name, typepanneId: row.value.typepanneId, tenantId })),
          skipDuplicates: true,
        });
      }
      for (const row of updates) {
        const match = byName.get(row.key);
        if (match) {
          await tx.panne.update({ where: { id: match.id }, data: { name: row.value.name, typepanneId: row.value.typepanneId } });
        }
      }
      const finalPannes = await tx.panne.findMany({
        where: { tenantId, name: { in: accepted.map(({ value }) => value.name), mode: "insensitive" } },
        select: { id: true, name: true },
      });
      const panneMap = new Map(finalPannes.map((item) => [item.name.toLocaleLowerCase(), item.id]));
      await tx.panneParc.createMany({
        data: accepted.flatMap((row) => {
          const panneId = panneMap.get(row.key);
          return panneId ? [{ panneId, parcId: row.value.parcId, description: row.value.description }] : [];
        }),
        skipDuplicates: true,
      });
      for (const row of accepted.filter((item) => byName.has(item.key))) {
        const panneId = panneMap.get(row.key);
        if (panneId) {
          await tx.panneParc.upsert({
            where: { panneId_parcId: { panneId, parcId: row.value.parcId } },
            update: { description: row.value.description },
            create: { panneId, parcId: row.value.parcId, description: row.value.description },
          });
        }
      }
    });
    for (const row of accepted) results.push(rowSuccess(row, `Panne « ${row.value.name} » importée.`));
  } catch (error) {
    for (const row of accepted) results.push(rowFailure(row, error));
  }
  return results.sort((a, b) => a.row - b.row);
}

async function batchObjectifs(tenantId: string, input: SourceRow[]): Promise<IndependentBatchRowResult[]> {
  const results: IndependentBatchRowResult[] = [];
  const siteNames = [...new Set(input.map(({ data }) => text(data.siteName ?? data.site)).filter(Boolean))];
  const parcNames = [...new Set(input.map(({ data }) => text(data.parcName ?? data.parc)).filter(Boolean))];
  const [sites, parcs] = await Promise.all([
    prisma.site.findMany({ where: { tenantId, name: { in: siteNames, mode: "insensitive" } }, select: { id: true, name: true } }),
    prisma.parc.findMany({ where: { tenantId, name: { in: parcNames, mode: "insensitive" } }, select: { id: true, name: true } }),
  ]);
  const siteMap = new Map(sites.map((item) => [item.name.toLocaleLowerCase(), item]));
  const parcMap = new Map(parcs.map((item) => [item.name.toLocaleLowerCase(), item]));
  const prepared: PreparedRow<{ key: string; annee: number; siteId: string; parcId: string; dispo: number | null; mtbf: number | null; tdm: number | null; spe_huile: number | null; spe_go: number | null; spe_graisse: number | null }>[] = [];
  for (const row of input) {
    try {
      const annee = Number(requiredText(row.data, "annee"));
      if (!Number.isInteger(annee) || annee < 1900 || annee > 9999) throw new Error("L'année doit être entière et valide.");
      const siteName = requiredText({ siteName: row.data.siteName ?? row.data.site }, "siteName");
      const parcName = requiredText({ parcName: row.data.parcName ?? row.data.parc }, "parcName");
      const site = siteMap.get(siteName.toLocaleLowerCase());
      const parc = parcMap.get(parcName.toLocaleLowerCase());
      if (!site) throw new Error(`Site "${siteName}" introuvable.`);
      if (!parc) throw new Error(`Parc "${parcName}" introuvable.`);
      const metrics = {
        dispo: numberValue(row.data.dispo, "dispo"),
        mtbf: numberValue(row.data.mtbf, "mtbf"),
        tdm: numberValue(row.data.tdm, "tdm"),
        spe_huile: numberValue(row.data.spe_huile, "spe_huile"),
        spe_go: numberValue(row.data.spe_go, "spe_go"),
        spe_graisse: numberValue(row.data.spe_graisse, "spe_graisse"),
      };
      for (const [field, value] of Object.entries(metrics)) {
        if (value !== null && value < 0) throw new Error(`Le champ "${field}" ne peut pas être négatif.`);
      }
      prepared.push({
        ...row,
        value: {
          key: makeRowKey(annee, site.id, parc.id),
          annee,
          siteId: site.id,
          parcId: parc.id,
          ...metrics,
        },
      });
    } catch (error) {
      results.push(rowFailure(row, error));
    }
  }
  if (!prepared.length) return results;
  const latest = groupByLast(prepared.map((row) => ({ ...row, key: row.value.key })));
  try {
    await prisma.$transaction(async (tx) => {
      for (const row of latest) {
        await tx.objectif.upsert({
          where: { annee_parcId_siteId: { annee: row.value.annee, parcId: row.value.parcId, siteId: row.value.siteId } },
          update: {
            dispo: row.value.dispo,
            mtbf: row.value.mtbf,
            tdm: row.value.tdm,
            spe_huile: row.value.spe_huile,
            spe_go: row.value.spe_go,
            spe_graisse: row.value.spe_graisse,
          },
          create: { ...row.value, tenantId },
        });
      }
    });
    for (const row of latest) results.push(rowSuccess(row, `Objectif ${row.value.annee} importé.`));
  } catch (error) {
    for (const row of latest) results.push(rowFailure(row, error));
  }
  return results.sort((a, b) => a.row - b.row);
}

async function batchBacklogs(tenantId: string, input: SourceRow[]): Promise<IndependentBatchRowResult[]> {
  const results: IndependentBatchRowResult[] = [];
  const enginNames = [...new Set(input.map(({ data }) => text(data.enginName ?? data.engin)).filter(Boolean))];
  const siteNames = [...new Set(input.map(({ data }) => text(data.siteName ?? data.site)).filter(Boolean))];
  const [engins, sites] = await Promise.all([
    prisma.engin.findMany({ where: { tenantId, name: { in: enginNames, mode: "insensitive" }, active: true }, select: { id: true, name: true, siteId: true } }),
    prisma.site.findMany({ where: { tenantId, name: { in: siteNames, mode: "insensitive" }, active: true }, select: { id: true, name: true } }),
  ]);
  const enginMap = new Map(engins.map((item) => [item.name.toLocaleLowerCase(), item]));
  const siteMap = new Map(sites.map((item) => [item.name.toLocaleLowerCase(), item]));
  const prepared: PreparedRow<{
    key: string; numeroBacklog: string; dateDetection: Date; description: string;
    source: (typeof SOURCE_VALUES)[number]; priorite: (typeof PRIORITY_VALUES)[number];
    statut: (typeof STATUS_VALUES)[number]; dateExecution: Date | null; equipe: string | null;
    observations: string | null; enginId: string; siteId: string;
  }>[] = [];
  for (const row of input) {
    try {
      const numeroBacklog = requiredText({ numeroBacklog: row.data.numeroBacklog ?? row.data.numero }, "numeroBacklog");
      const description = requiredText(row.data, "description");
      const dateDetection = parseDate(row.data.dateDetection, "dateDetection");
      const enginName = requiredText({ enginName: row.data.enginName ?? row.data.engin }, "enginName");
      const siteName = requiredText({ siteName: row.data.siteName ?? row.data.site }, "siteName");
      const engin = enginMap.get(enginName.toLocaleLowerCase());
      const site = siteMap.get(siteName.toLocaleLowerCase());
      if (!engin || !site) throw new Error("Engin ou site introuvable, inactif ou hors tenant.");
      if (engin.siteId !== site.id) throw new Error("Le site ne correspond pas au site de l'engin.");
      const source = enumValue(row.data.source, SOURCE_VALUES, "source");
      const priorite = enumValue(row.data.priorite, PRIORITY_VALUES, "priorite");
      let statutValue = text(row.data.statut).toUpperCase().replace(/[\s-]+/g, "_");
      if (statutValue === "NON_PROGRAMMEE") statutValue = "ATTENTE_PROGRAMME";
      const statut = enumValue(statutValue, STATUS_VALUES, "statut", "ATTENTE_PROGRAMME");
      const dateExecution = text(row.data.dateExecution) ? parseDate(row.data.dateExecution, "dateExecution") : null;
      const rawQuantity = text(row.data.quantite);
      if (rawQuantity && (!Number.isInteger(Number(rawQuantity)) || Number(rawQuantity) < 0)) throw new Error("La quantité doit être un entier positif ou nul.");
      prepared.push({
        ...row,
        value: {
          key: numeroBacklog.toLocaleLowerCase(),
          numeroBacklog,
          dateDetection,
          description,
          source,
          priorite,
          statut,
          dateExecution,
          equipe: text(row.data.equipe) || null,
          observations: text(row.data.observations) || null,
          enginId: engin.id,
          siteId: site.id,
        },
      });
    } catch (error) {
      results.push(rowFailure(row, error));
    }
  }
  if (!prepared.length) return results;
  const latest = groupByLast(prepared.map((row) => ({ ...row, key: row.value.key })));
  const numbers = latest.map(({ value }) => value.numeroBacklog);
  const existing = await prisma.backlog.findMany({
    where: { tenantId, numeroBacklog: { in: numbers } },
    select: { id: true, numeroBacklog: true, statut: true },
  });
  const byNumber = new Map(existing.map((item) => [item.numeroBacklog.toLocaleLowerCase(), item]));
  try {
    await prisma.$transaction(async (tx) => {
      const creates = latest.filter((row) => !byNumber.has(row.key));
      if (creates.length) {
        await tx.backlog.createMany({
          data: creates.map((row) => ({ id: randomUUID(), ...row.value, tenantId })),
          skipDuplicates: true,
        });
      }
      const histories: { backlogId: string; ancienStatut: typeof STATUS_VALUES[number]; nouveauStatut: typeof STATUS_VALUES[number] }[] = [];
      for (const row of latest.filter((item) => byNumber.has(item.key))) {
        const match = byNumber.get(row.key);
        if (!match) continue;
        if (match.statut !== row.value.statut) {
          histories.push({ backlogId: match.id, ancienStatut: match.statut, nouveauStatut: row.value.statut });
        }
        await tx.backlog.update({
          where: { id: match.id },
          data: {
            dateDetection: row.value.dateDetection,
            description: row.value.description,
            source: row.value.source,
            priorite: row.value.priorite,
            statut: row.value.statut,
            dateExecution: row.value.dateExecution,
            equipe: row.value.equipe,
            observations: row.value.observations,
            enginId: row.value.enginId,
            siteId: row.value.siteId,
          },
        });
      }
      if (histories.length) await tx.historiqueStatutBacklog.createMany({ data: histories });
    });
    for (const row of latest) results.push(rowSuccess(row, `Backlog « ${row.value.numeroBacklog} » importé.`));
  } catch (error) {
    for (const row of latest) results.push(rowFailure(row, error));
  }
  return results.sort((a, b) => a.row - b.row);
}

async function batchSaisieHrm(tenantId: string, input: SourceRow[]): Promise<IndependentBatchRowResult[]> {
  const results: IndependentBatchRowResult[] = [];
  const enginNames = [...new Set(input.map(({ data }) => text(data.enginName)).filter(Boolean))];
  const siteNames = [...new Set(input.map(({ data }) => text(data.siteName)).filter(Boolean))];
  const [engins, sites] = await Promise.all([
    prisma.engin.findMany({ where: { tenantId, name: { in: enginNames, mode: "insensitive" } }, select: { id: true, name: true, active: true } }),
    prisma.site.findMany({ where: { tenantId, name: { in: siteNames, mode: "insensitive" } }, select: { id: true, name: true, active: true } }),
  ]);
  const enginMap = new Map(engins.map((item) => [item.name.toLocaleLowerCase(), item]));
  const siteMap = new Map(sites.map((item) => [item.name.toLocaleLowerCase(), item]));
  const prepared: PreparedRow<{ key: string; du: Date; enginId: string; siteId: string; hrm: number; nho: number; compteur: number | null }>[] = [];
  for (const row of input) {
    try {
      const du = parseDate(row.data.du, "du");
      if (du.getTime() > Date.now()) throw new Error("La date de saisie HRM ne peut pas être future.");
      const enginName = requiredText(row.data, "enginName");
      const siteName = requiredText(row.data, "siteName");
      const engin = enginMap.get(enginName.toLocaleLowerCase());
      const site = siteMap.get(siteName.toLocaleLowerCase());
      if (!engin || !site) throw new Error("Engin ou site introuvable.");
      const hrm = numberValue(row.data.hrm, "hrm", true);
      const nho = numberValue(row.data.nho, "nho", true);
      const compteur = numberValue(row.data.compteur, "compteur");
      if (hrm === null || nho === null || hrm < 0 || hrm > 24 || nho < 0 || nho > 24 || hrm > nho) {
        throw new Error("HRM et NHO doivent être entre 0 et 24, et HRM ne peut pas dépasser NHO.");
      }
      if (compteur !== null && compteur < 0) throw new Error("Le compteur doit être positif ou nul.");
      prepared.push({ ...row, value: { key: makeRowKey(du.toISOString().slice(0, 10), engin.id), du, enginId: engin.id, siteId: site.id, hrm, nho, compteur } });
    } catch (error) {
      results.push(rowFailure(row, error));
    }
  }
  if (!prepared.length) return results;
  const latest = groupByLast(prepared.map((row) => ({ ...row, key: row.value.key })));
  const engineIds = [...new Set(latest.map(({ value }) => value.enginId))];
  const existing = await prisma.saisiehrm.findMany({
    where: { tenantId, enginId: { in: engineIds }, du: { in: latest.map(({ value }) => value.du) } },
    select: { id: true, du: true, enginId: true, compteur: true, siteId: true },
  });
  const existingMap = new Map(existing.map((item) => [makeRowKey(item.du.toISOString().slice(0, 10), item.enginId), item]));
  try {
    await prisma.$transaction(async (tx) => {
      const creates = latest.filter((row) => !existingMap.has(row.key));
      if (creates.length) {
        await tx.saisiehrm.createMany({
          data: creates.map((row) => ({
            id: randomUUID(),
            du: row.value.du,
            enginId: row.value.enginId,
            siteId: row.value.siteId,
            hrm: row.value.hrm,
            nho: row.value.nho,
            compteur: row.value.compteur,
            tenantId,
          })),
          skipDuplicates: true,
        });
      }
      for (const row of latest.filter((item) => existingMap.has(item.key))) {
        const match = existingMap.get(row.key);
        if (match) {
          await tx.saisiehrm.update({
            where: { id: match.id },
            data: {
              siteId: row.value.siteId,
              hrm: row.value.hrm,
              nho: row.value.nho,
              ...(row.value.compteur === null ? {} : { compteur: row.value.compteur }),
            },
          });
        }
      }
    });
    for (const row of latest) results.push(rowSuccess(row, "Saisie HRM importée."));
  } catch (error) {
    for (const row of latest) results.push(rowFailure(row, error));
  }
  return results.sort((a, b) => a.row - b.row);
}

async function batchSaisieHim(tenantId: string, input: SourceRow[]): Promise<IndependentBatchRowResult[]> {
  const results: IndependentBatchRowResult[] = [];
  const enginNames = [...new Set(input.map(({ data }) => text(data.enginName)).filter(Boolean))];
  const panneNames = [...new Set(input.map(({ data }) => text(data.panneName)).filter(Boolean))];
  const [engins, pannes, hrms] = await Promise.all([
    prisma.engin.findMany({ where: { tenantId, name: { in: enginNames, mode: "insensitive" } }, select: { id: true, name: true, parcId: true, active: true } }),
    prisma.panne.findMany({
      where: { tenantId, name: { in: panneNames, mode: "insensitive" }, parcs: { some: { parc: { tenantId } } } },
      select: { id: true, name: true, parcs: { select: { parcId: true } } },
    }),
    prisma.saisiehrm.findMany({ where: { tenantId, du: { in: input.flatMap(({ data }) => { try { return [parseDate(data.du, "du")]; } catch { return []; } }) } }, select: { id: true, du: true, enginId: true, hrm: true, nho: true, site: { select: { active: true } } } }),
  ]);
  const enginMap = new Map(engins.map((item) => [item.name.toLocaleLowerCase(), item]));
  const panneMap = new Map(pannes.map((item) => [item.name.toLocaleLowerCase(), item]));
  const hrmMap = new Map(hrms.map((item) => [makeRowKey(item.du.toISOString().slice(0, 10), item.enginId), item]));
  const prepared: PreparedRow<{ key: string; du: Date; enginId: string; panneId: string; saisiehrmId: string; him: number; ni: number | null; obs: string | null; hrm: number; nho: number }>[] = [];
  for (const row of input) {
    try {
      const du = parseDate(row.data.du, "du");
      const enginName = requiredText(row.data, "enginName");
      const panneName = requiredText(row.data, "panneName");
      const engin = enginMap.get(enginName.toLocaleLowerCase());
      const panne = panneMap.get(panneName.toLocaleLowerCase());
      if (!engin) throw new Error(`Engin "${enginName}" introuvable.`);
      if (!panne) throw new Error(`Panne "${panneName}" introuvable.`);
      if (!panne.parcs.some((item) => item.parcId === engin.parcId)) {
        throw new Error(`La panne "${panneName}" n'est pas associée au parc de l'engin "${enginName}".`);
      }
      const hrm = hrmMap.get(makeRowKey(du.toISOString().slice(0, 10), engin.id));
      if (!hrm) throw new Error(`Saisie HRM de l'engin "${enginName}" du ${text(row.data.du)} introuvable.`);
      const him = numberValue(row.data.him, "him", true);
      const ni = numberValue(row.data.ni, "ni");
      if (him === null || him < 0 || him > 24) throw new Error("HIM doit être comprise entre 0 et 24.");
      if (ni !== null && (!Number.isInteger(ni) || ni < 0)) throw new Error("NI doit être un entier positif ou nul.");
      if (!engin.active && !(await prisma.saisiehim.findFirst({ where: { tenantId, panneId: panne.id, saisiehrmId: hrm.id }, select: { id: true } }))) {
        throw new Error(`L'engin "${enginName}" est inactif.`);
      }
      if (!hrm.site.active && !(await prisma.saisiehim.findFirst({ where: { tenantId, panneId: panne.id, saisiehrmId: hrm.id }, select: { id: true } }))) {
        throw new Error("Le site associé à l'engin est inactif.");
      }
      prepared.push({
        ...row,
        value: {
          key: makeRowKey(panne.id, hrm.id),
          du,
          enginId: engin.id,
          panneId: panne.id,
          saisiehrmId: hrm.id,
          him,
          ni,
          obs: text(row.data.obs) || null,
          hrm: hrm.hrm,
          nho: hrm.nho,
        },
      });
    } catch (error) {
      results.push(rowFailure(row, error));
    }
  }
  if (!prepared.length) return results;
  const latest = groupByLast(prepared.map((row) => ({ ...row, key: row.value.key })));
  try {
    await prisma.$transaction(async (tx) => {
      for (const row of latest) {
        const existing = await tx.saisiehim.findUnique({
          where: { panneId_saisiehrmId_tenantId: { panneId: row.value.panneId, saisiehrmId: row.value.saisiehrmId, tenantId } },
          select: { id: true, ni: true },
        });
        const alreadyAssigned = await tx.saisiehim.aggregate({
          where: { tenantId, saisiehrmId: row.value.saisiehrmId, ...(existing ? { id: { not: existing.id } } : {}) },
          _sum: { him: true },
        });
        const total = (alreadyAssigned._sum.him ?? 0) + row.value.him;
        if (total > row.value.nho - row.value.hrm) throw new Error("La somme des HIM dépasse la capacité disponible après la HRM.");
        await tx.saisiehim.upsert({
          where: { panneId_saisiehrmId_tenantId: { panneId: row.value.panneId, saisiehrmId: row.value.saisiehrmId, tenantId } },
          update: { him: row.value.him, ni: row.value.ni ?? existing?.ni ?? null, obs: row.value.obs },
          create: {
            id: randomUUID(),
            panneId: row.value.panneId,
            saisiehrmId: row.value.saisiehrmId,
            tenantId,
            him: row.value.him,
            ni: row.value.ni,
            obs: row.value.obs,
          },
        });
      }
    });
    for (const row of latest) results.push(rowSuccess(row, "Saisie HIM importée."));
  } catch (error) {
    for (const row of latest) results.push(rowFailure(row, error));
  }
  return results.sort((a, b) => a.row - b.row);
}

export class IndependentBatchImportService {
  async import(
    request: IndependentBatchRequest,
    tenantId: string,
    shouldStop: () => boolean,
    onProgress: (progress: BatchProgress) => void,
  ): Promise<IndependentBatchSummary> {
    const allResults: IndependentBatchRowResult[] = [];
    for (let offset = 0; offset < request.rows.length; offset += CHUNK_SIZE) {
      if (shouldStop()) break;
      const chunk = sourceRows({
        ...request,
        rows: request.rows.slice(offset, offset + CHUNK_SIZE),
        rowNumbers: request.rowNumbers.slice(offset, offset + CHUNK_SIZE),
      });
      let chunkResults: IndependentBatchRowResult[];
      try {
        switch (request.module) {
          case "sites":
          case "typeparcs":
          case "typepannes":
          case "type_lubrifiants":
            chunkResults = await batchNamedRecords(request.module, tenantId, chunk);
            break;
          case "lubrifiants":
            chunkResults = await batchLubrifiants(tenantId, chunk);
            break;
          case "saisie_lubrifiants":
            chunkResults = await batchSaisieLubrifiants(tenantId, chunk);
            break;
          case "parcs":
            chunkResults = await batchParcs(tenantId, chunk);
            break;
          case "engins":
            chunkResults = await batchEngins(tenantId, chunk);
            break;
          case "pannes":
            chunkResults = await batchPannes(tenantId, chunk);
            break;
          case "objectifs":
            chunkResults = await batchObjectifs(tenantId, chunk);
            break;
          case "backlogs":
            chunkResults = await batchBacklogs(tenantId, chunk);
            break;
          case "saisie_hrm":
            chunkResults = await batchSaisieHrm(tenantId, chunk);
            break;
          case "saisie_hims":
            chunkResults = await batchSaisieHim(tenantId, chunk);
            break;
        }
      } catch (error) {
        chunkResults = chunk.map((row) => rowFailure(row, error));
      }
      chunkResults = completeChunkResults(request.module, chunk, chunkResults);
      allResults.push(...chunkResults);
      onProgress({
        processed: allResults.length,
        total: request.rows.length,
        results: chunkResults,
      });
    }
    const success = allResults.filter((item) => item.success).length;
    return {
      total: request.rows.length,
      processed: allResults.length,
      success,
      errors: allResults.length - success,
      cancelled: allResults.length < request.rows.length,
    };
  }
}
