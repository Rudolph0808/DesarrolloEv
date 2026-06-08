import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { Download } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  PageContainer,
  PageHeader,
  useDashboardData,
} from "@/components/dashboard/shared";
import {
  ENERGIES,
  ENERGY_META,
  formatNumber,
  formatPeriod,
  uniquePeriods,
  type Energy,
  type Plant,
  type Reading,
} from "@/lib/dashboard";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/historico")({
  head: () => ({
    meta: [
      { title: "History — EnergyOps" },
      { name: "description", content: "Time series of consumption by plant and energy." },
    ],
  }),
  component: HistoricoPage,
});

function HistoricoPage() {
  const { plants, readings } = useDashboardData();
  const periods = useMemo(() => uniquePeriods(readings), [readings]);
  const [visiblePlants, setVisiblePlants] = useState<Set<string>>(new Set());
  const [showTotal, setShowTotal] = useState(true);

  const allActive = visiblePlants.size === 0; // empty = all

  const togglePlant = (id: string) => {
    setVisiblePlants((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <AppShell>
      <PageContainer>
        <PageHeader
          title="History by energy"
          subtitle="Monthly trend with actuals and forecast lines."
          right={
            <Button variant="outline" size="sm" onClick={() => exportCsv(readings, plants)}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          }
        />

        <div className="bg-card border border-border rounded-2xl p-4 mb-6 flex flex-wrap gap-4 items-center">
          <span className="text-sm font-medium">Plants:</span>
          {plants.map((p) => {
            const checked = allActive || visiblePlants.has(p.id);
            return (
              <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={checked} onCheckedChange={() => togglePlant(p.id)} />
                {p.name}
              </label>
            );
          })}
          <div className="h-5 w-px bg-border mx-1" />
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={showTotal} onCheckedChange={(v) => setShowTotal(!!v)} />
            Show total
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {ENERGIES.map((energy) => (
            <EnergyChart
              key={energy}
              energy={energy}
              plants={plants}
              readings={readings}
              periods={periods}
              visiblePlants={visiblePlants}
              showTotal={showTotal}
            />
          ))}
        </div>
      </PageContainer>
    </AppShell>
  );
}

function EnergyChart({
  energy,
  plants,
  readings,
  periods,
  visiblePlants,
  showTotal,
}: {
  energy: Energy;
  plants: Plant[];
  readings: Reading[];
  periods: string[];
  visiblePlants: Set<string>;
  showTotal: boolean;
}) {
  const meta = ENERGY_META[energy];
  const allActive = visiblePlants.size === 0;
  const palette = [
    "var(--color-water)",
    "var(--color-gas)",
    "var(--color-electricity)",
    "oklch(0.6 0.15 340)",
  ];

  const data = periods.map((p) => {
    const row: Record<string, string | number | null> = { period: formatPeriod(p) };
    let total = 0;
    let predTotal = 0;
    let hasPred = false;
    for (const plant of plants) {
      const r = readings.find((x) => x.period === p && x.plant_id === plant.id);
      const v = (r?.[energy] as number | null) ?? null;
      row[plant.name] = v;
      if (v != null) total += v;
      const pred = (r?.[meta.predKey] as number | null) ?? null;
      if (pred != null) {
        predTotal += pred;
        hasPred = true;
      }
    }
    row.__total = total;
    row.__pred = hasPred ? predTotal : null;
    return row;
  });

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2">
          <span className="h-3 w-3 rounded" style={{ background: meta.color }} />
          {meta.label}
        </h2>
        <span className="text-xs text-muted-foreground">{meta.unit}</span>
      </div>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="period" stroke="var(--color-muted-foreground)" fontSize={11} />
            <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickFormatter={(v) => formatNumber(Number(v))} />
            <Tooltip
              contentStyle={{
                background: "var(--color-popover)",
                border: "1px solid var(--color-border)",
                borderRadius: 12,
                fontSize: 12,
              }}
              formatter={(v) => formatNumber(Number(v))}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {plants.map((p, i) => {
              if (!allActive && !visiblePlants.has(p.id)) return null;
              return (
                <Line
                  key={p.id}
                  type="monotone"
                  dataKey={p.name}
                  stroke={palette[i % palette.length]}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              );
            })}
            {showTotal && (
              <Line
                type="monotone"
                dataKey="__total"
                name="Total"
                stroke={meta.color}
                strokeWidth={3}
                dot={false}
              />
            )}
            <Line
              type="monotone"
              dataKey="__pred"
              name="Total forecast"
              stroke={meta.color}
              strokeDasharray="6 4"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function exportCsv(readings: Reading[], plants: Plant[]) {
  const byId = new Map(plants.map((p) => [p.id, p.name]));
  const header = [
    "plant",
    "month",
    "water_m3",
    "ng_mwhr",
    "electricity_mwhr",
    "water_pred",
    "gas_pred",
    "electricity_pred",
  ];
  const rows = readings.map((r) =>
    [
      byId.get(r.plant_id) ?? r.plant_id,
      r.period,
      r.water ?? "",
      r.gas ?? "",
      r.electricity ?? "",
      r.water_pred ?? "",
      r.gas_pred ?? "",
      r.electricity_pred ?? "",
    ].join(","),
  );
  const csv = [header.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `energy_history_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
