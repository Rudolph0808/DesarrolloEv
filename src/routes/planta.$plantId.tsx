import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo } from "react";
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
import { ArrowLeft } from "lucide-react";
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
  formatPeriodLong,
  pctChange,
  uniquePeriods,
} from "@/lib/dashboard";

export const Route = createFileRoute("/planta/$plantId")({
  head: () => ({
    meta: [{ title: "Plant detail — EnergyOps" }],
  }),
  component: PlantDetail,
});

function PlantDetail() {
  const { plantId } = Route.useParams();
  const { plants, readings, isLoading } = useDashboardData();
  const plant = plants.find((p) => p.id === plantId);
  const plantReadings = useMemo(
    () => readings.filter((r) => r.plant_id === plantId).sort((a, b) => a.period.localeCompare(b.period)),
    [readings, plantId],
  );
  const periods = uniquePeriods(plantReadings);
  const last = plantReadings[plantReadings.length - 1];
  const prev = plantReadings[plantReadings.length - 2];

  if (!isLoading && !plant) {
    return (
      <AppShell>
        <PageContainer>
          <p className="text-sm text-muted-foreground">Plant not found.</p>
          <Link to="/plantas" className="text-sm underline">Back to plants</Link>
        </PageContainer>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageContainer>
        <Link
          to="/plantas"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="h-4 w-4" /> Plants
        </Link>
        <PageHeader
          title={plant?.name ?? "—"}
          subtitle={plant?.location ? `Location: ${plant.location}` : undefined}
        />

        {last && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {ENERGIES.map((e) => {
              const meta = ENERGY_META[e];
              const v = (last[e] as number | null) ?? null;
              const pv = prev ? ((prev[e] as number | null) ?? null) : null;
              const change = pctChange(v, pv);
              return (
                <div key={e} className="bg-card border border-border rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-1 text-sm text-muted-foreground">
                    <span>{meta.label}</span>
                    <span className="text-xs">{formatPeriodLong(last.period)}</span>
                  </div>
                  <div className="font-display text-2xl font-semibold tabular-nums">
                    {formatNumber(v)} <span className="text-sm text-muted-foreground">{meta.unit}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {change != null ? `${change > 0 ? "+" : ""}${change.toFixed(1)}% vs prev. month` : "—"}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 mb-6">
          {ENERGIES.map((e) => (
            <PlantLine key={e} energy={e} readings={plantReadings} periods={periods} />
          ))}
        </div>

        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="font-display text-lg font-semibold mb-4">Last 12 months</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="text-left px-2 py-2 font-medium">Month</th>
                  {ENERGIES.map((e) => (
                    <th key={e} className="text-right px-2 py-2 font-medium">{ENERGY_META[e].label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {plantReadings.slice(-12).reverse().map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-2 py-2 font-medium">{formatPeriodLong(r.period)}</td>
                    {ENERGIES.map((e) => (
                      <td key={e} className="px-2 py-2 text-right tabular-nums">
                        {formatNumber(r[e] as number | null)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </PageContainer>
    </AppShell>
  );
}

function PlantLine({
  energy,
  readings,
  periods,
}: {
  energy: typeof ENERGIES[number];
  readings: ReturnType<typeof useDashboardData>["readings"];
  periods: string[];
}) {
  const meta = ENERGY_META[energy];
  const data = periods.map((p) => {
    const r = readings.find((x) => x.period === p);
    return {
      period: formatPeriod(p),
      real: (r?.[energy] as number | null) ?? null,
      pred: (r?.[meta.predKey] as number | null) ?? null,
    };
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
      <div className="h-[260px]">
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
            <Line type="monotone" dataKey="real" name="Actual" stroke={meta.color} strokeWidth={2.5} dot={false} connectNulls />
            <Line type="monotone" dataKey="pred" name="Forecast" stroke={meta.color} strokeDasharray="6 4" strokeWidth={2} dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
