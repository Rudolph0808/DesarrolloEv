import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
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
  formatPeriodLong,
  uniquePeriods,
  type Energy,
} from "@/lib/dashboard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/plantas")({
  head: () => ({
    meta: [
      { title: "Plants — EnergyOps" },
      { name: "description", content: "Consumption comparison across complex plants." },
    ],
  }),
  component: PlantsPage,
});

function PlantsPage() {
  const { plants, readings } = useDashboardData();
  const periods = useMemo(() => uniquePeriods(readings), [readings]);
  const [period, setPeriod] = useState<string | null>(null);
  const current = period ?? periods[periods.length - 1] ?? null;
  const [mode, setMode] = useState<"abs" | "pct">("abs");
  const [energy, setEnergy] = useState<Energy>("electricity");
  const meta = ENERGY_META[energy];

  const data = useMemo(() => {
    if (!current) return [];
    return plants.map((p) => {
      const r = readings.find((x) => x.period === current && x.plant_id === p.id);
      const row: Record<string, string | number> = { name: p.name };
      for (const e of ENERGIES) {
        row[e] = (r?.[e] as number | null) ?? 0;
      }
      return row;
    });
  }, [plants, readings, current]);

  const pieData = useMemo(() => {
    if (!current) return [];
    const total = data.reduce((acc, r) => acc + Number(r[energy] ?? 0), 0);
    return data.map((r) => ({
      name: r.name as string,
      value: Number(r[energy] ?? 0),
      pct: total > 0 ? (Number(r[energy] ?? 0) / total) * 100 : 0,
    }));
  }, [data, energy, current]);

  const palette = [
    "var(--color-water)",
    "var(--color-gas)",
    "var(--color-electricity)",
    "oklch(0.6 0.15 340)",
  ];

  return (
    <AppShell>
      <PageContainer>
        <PageHeader
          title="Plants comparison"
          subtitle={current ? formatPeriodLong(current) : ""}
          right={
            current && (
              <Select value={current} onValueChange={setPeriod}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[...periods].reverse().map((p) => (
                    <SelectItem key={p} value={p}>
                      {formatPeriodLong(p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )
          }
        />

        <div className="flex flex-wrap gap-3 mb-6">
          <Tabs value={mode} onValueChange={(v) => setMode(v as "abs" | "pct")}>
            <TabsList>
              <TabsTrigger value="abs">Absolute</TabsTrigger>
              <TabsTrigger value="pct">Percent</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6">
            <h2 className="font-display text-lg font-semibold mb-4">
              Plants × Energy
            </h2>
            <div className="h-[380px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mode === "pct" ? toPct(data) : data}>
                  <CartesianGrid stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={12} />
                  <YAxis
                    stroke="var(--color-muted-foreground)"
                    fontSize={12}
                    tickFormatter={(v) =>
                      mode === "pct" ? `${v}%` : formatNumber(Number(v))
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    formatter={(v) =>
                      mode === "pct"
                        ? `${Number(v).toFixed(1)}%`
                        : formatNumber(Number(v))
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {ENERGIES.map((e) => (
                    <Bar
                      key={e}
                      dataKey={e}
                      name={ENERGY_META[e].label}
                      fill={ENERGY_META[e].color}
                      radius={[4, 4, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold">% per plant</h2>
              <Select value={energy} onValueChange={(v) => setEnergy(v as Energy)}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENERGIES.map((e) => (
                    <SelectItem key={e} value={e}>
                      {ENERGY_META[e].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={palette[i % palette.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    formatter={(v) => `${formatNumber(Number(v))} ${meta.unit}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-3 space-y-1 text-sm">
              {pieData.map((d, i) => (
                <li key={d.name} className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: palette[i % palette.length] }} />
                    {d.name}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {d.pct.toFixed(1)}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </PageContainer>
    </AppShell>
  );
}

function toPct(rows: Record<string, string | number>[]) {
  const totals: Record<string, number> = {};
  for (const e of ENERGIES) totals[e] = rows.reduce((a, r) => a + Number(r[e] ?? 0), 0);
  return rows.map((r) => {
    const out: Record<string, string | number> = { name: r.name };
    for (const e of ENERGIES) {
      out[e] = totals[e] > 0 ? Number(((Number(r[e] ?? 0) / totals[e]) * 100).toFixed(1)) : 0;
    }
    return out;
  });
}
