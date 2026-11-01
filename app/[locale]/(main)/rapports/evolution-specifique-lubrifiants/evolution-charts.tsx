"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  EvolutionConsumptionTopItem,
  EvolutionSpecificiteReport,
} from "@/server/rapports/rapport-evolution-specificite-lubrifiants";

function TopConsumptionChart({
  title,
  items,
  unit,
}: {
  title: string;
  items: EvolutionConsumptionTopItem[];
  unit: string;
}): React.JSX.Element {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>{title} — {unit}</CardTitle>
        <CardDescription>Classement des consommations cumulées pour l’année et les filtres sélectionnés.</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length ? (
          <div className="h-[360px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={items}
                layout="vertical"
                margin={{ top: 8, right: 40, left: 8, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value: number) => value.toLocaleString("fr-FR")}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={145}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip
                  formatter={(value) => [
                    `${Number(value ?? 0).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ${unit}`,
                    "Consommation",
                  ]}
                />
                <Bar
                  dataKey="qte"
                  name="Consommation"
                  fill="#8884d8"
                  radius={[0, 3, 3, 0]}
                >
                  <LabelList
                    dataKey="qte"
                    position="right"
                    formatter={(value) => Number(value).toLocaleString("fr-FR", { maximumFractionDigits: 2 })}
                    style={{ fontSize: 10 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Aucune consommation trouvée pour cette unité.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function SpecificiteLabel({
  x,
  y,
  value,
}: {
  x?: number;
  y?: number;
  value?: number | string | null;
}): React.JSX.Element | null {
  if (x == null || y == null || value == null || !Number.isFinite(Number(value))) return null;
  return (
    <text x={x} y={y - 8} fill="#8884d8" textAnchor="middle" fontSize={9}>
      {Number(value).toFixed(2)}
    </text>
  );
}

function ObjectiveLabel({
  x,
  y,
  value,
  index,
}: {
  x?: number;
  y?: number;
  value?: number | string | null;
  index?: number;
}): React.JSX.Element | null {
  if (index !== 11 || x == null || y == null || value == null || !Number.isFinite(Number(value))) return null;
  return (
    <text x={x - 4} y={y + 14} fill="#16a34a" textAnchor="end" fontSize={9}>
      Objectif {Number(value).toFixed(2)}
    </text>
  );
}

export default function EvolutionCharts({
  data,
  annee,
}: {
  data: EvolutionSpecificiteReport;
  annee: number;
}): React.JSX.Element {
  const { evolution, topEngins, topLubrifiants } = data;
  const units = [...new Set([
    ...topEngins.map((item) => item.unite),
    ...topLubrifiants.map((item) => item.unite),
  ])];

  if (!evolution.length && !units.length) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Aucune consommation de lubrifiant n’a été trouvée pour les filtres sélectionnés.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {evolution.length > 0 && (
        <div className="grid gap-4 xl:grid-cols-2">
          {evolution.map((item) => {
        const chartData = item.months.map((month) => ({
          ...month,
          objectif: item.objectif,
        }));
        return (
          <Card key={`${item.typeLubrifiantId}-${item.unite}`} className="min-w-0">
            <CardHeader>
              <CardTitle>Évolution spécifique — {item.typeLubrifiantName}</CardTitle>
              <CardDescription>
                {item.unite}/h · {annee} · Objectif : {item.objectif === null ? "non défini" : `${item.objectif.toLocaleString("fr-FR")} ${item.unite}/h`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 20, right: 16, left: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
                    <YAxis
                      width={64}
                      tick={{ fontSize: 11 }}
                      tickFormatter={(value: number) => `${value}`}
                    />
                    <Tooltip
                      formatter={(value, name) => [
                        value == null
                          ? "Non calculable"
                          : `${Number(value).toLocaleString("fr-FR", { maximumFractionDigits: 4 })} ${item.unite}/h`,
                        name === "Spécifique" ? "Spécifique" : "Objectif",
                      ]}
                      labelFormatter={(label) => `${label} ${annee}`}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="specific"
                      name="Spécifique"
                      stroke="#8884d8"
                      strokeWidth={2}
                      connectNulls={false}
                      activeDot={{ r: 5 }}
                    >
                      <LabelList dataKey="specific" content={<SpecificiteLabel />} />
                    </Line>
                    {item.objectif !== null && (
                      <Line
                        type="monotone"
                        dataKey="objectif"
                        name="Objectif"
                        stroke="#16a34a"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        connectNulls
                        dot={false}
                      >
                        <LabelList dataKey="objectif" content={<ObjectiveLabel />} />
                      </Line>
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        );
          })}
        </div>
      )}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Classement des consommations — {annee}</h2>
        {units.map((unit) => (
          <div key={unit} className="grid gap-4 xl:grid-cols-2">
            <TopConsumptionChart
              title="Top 10 des engins les plus consommateurs"
              items={topEngins.filter((item) => item.unite === unit)}
              unit={unit}
            />
            <TopConsumptionChart
              title="Top 10 des lubrifiants les plus consommés"
              items={topLubrifiants.filter((item) => item.unite === unit)}
              unit={unit}
            />
          </div>
        ))}
      </section>
    </div>
  );
}
