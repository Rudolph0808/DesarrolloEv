import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { ArrowDown, ArrowUp, Minus, ExternalLink, AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  PageContainer,
  PageHeader,
  useDashboardData,
} from "@/components/dashboard/shared";
import { InflationCard } from "@/components/dashboard/InflationCard";
import {
  ENERGIES,
  ENERGY_META,
  costForPeriod,
  formatCurrency,
  formatNumber,
  formatPeriod,
  formatPeriodLong,
  pctChange,
  sumByPeriod,
  uniquePeriods,
  type Energy,
  type UnitCost,
} from "@/lib/dashboard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview — EnergyOps" },
      { name: "description", content: "Monthly overview of the complex energy consumption." },
    ],
  }),
  component: IndexPage,
});

function IndexPage() {
  const { plants, readings, costs, isLoading } = useDashboardData();
  const periods = useMemo(() => uniquePeriods(readings), [readings]);
  const [period, setPeriod] = useState<string | null>(null);
  const currentPeriod = period ?? periods[periods.length - 1] ?? null;
  const prevPeriod = currentPeriod
    ? periods[periods.indexOf(currentPeriod) - 1] ?? null
    : null;

  return (
    <AppShell>
      <PageContainer>
        <PageHeader
          title="Complex overview"
          subtitle={
            currentPeriod
              ? `Selected month: ${formatPeriodLong(currentPeriod)}`
              : "No data yet"
          }
          right={
            periods.length > 0 && (
              <Select value={currentPeriod ?? undefined} onValueChange={setPeriod}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select month" />
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

        <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-700" />
          <p className="text-sm font-medium">
            Demo mode — all figures shown are synthetic dummy data for demonstration purposes only.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ENERGIES.map((e) => (
              <div key={e} className="h-44 bg-card border border-border rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : !currentPeriod ? (
          <EmptyState />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {ENERGIES.map((energy) => (
                <KpiCard
                  key={energy}
                  energy={energy}
                  readings={readings}
                  currentPeriod={currentPeriod}
                  prevPeriod={prevPeriod}
                  periods={periods}
                />
              ))}
            </div>

            <CostSummary readings={readings} costs={costs} currentPeriod={currentPeriod} prevPeriod={prevPeriod} plants={plants} />

            <InflationCard />



            <div className="bg-card border border-border rounded-2xl p-6 md:p-8 mb-4">
              <div className="flex flex-wrap items-baseline justify-between gap-4 mb-6">
                <div>
                  <h2 className="font-display text-2xl font-semibold">Plant contribution</h2>
                  <p className="text-sm text-muted-foreground mt-1">How each plant splits the complex consumption.</p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatPeriodLong(currentPeriod)}
                </span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3">
                  <PlantStackedChart
                    plants={plants}
                    readings={readings}
                    period={currentPeriod}
                  />
                </div>
                <div className="lg:col-span-2">
                  <ContributionTable
                    plants={plants}
                    readings={readings}
                    period={currentPeriod}
                  />
                </div>
              </div>
            </div>

          </>
        )}
      </PageContainer>
    </AppShell>
  );
}

function EmptyState() {
  return (
    <div className="bg-card border border-border rounded-2xl p-10 text-center">
      <h2 className="font-display text-xl mb-2">No data loaded yet</h2>
      <p className="text-muted-foreground mb-4">
        Upload monthly consumption from the Data section to populate the dashboard.
      </p>
      <Link
        to="/datos"
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
      >
        Go to Data <ExternalLink className="h-4 w-4" />
      </Link>
    </div>
  );
}

function KpiCard({
  energy,
  readings,
  currentPeriod,
  prevPeriod,
  periods,
}: {
  energy: Energy;
  readings: ReturnType<typeof useDashboardData>["readings"];
  currentPeriod: string;
  prevPeriod: string | null;
  periods: string[];
}) {
  const meta = ENERGY_META[energy];
  const totals = sumByPeriod(readings, energy);
  const current = totals.get(currentPeriod) ?? 0;
  const previous = prevPeriod ? totals.get(prevPeriod) ?? null : null;

  // Predicción del mes actual = suma de _pred
  const predTotal = readings
    .filter((r) => r.period === currentPeriod)
    .reduce((acc, r) => acc + ((r[meta.predKey] as number | null) ?? 0), 0);
  const hasPred = readings
    .filter((r) => r.period === currentPeriod)
    .some((r) => (r[meta.predKey] as number | null) != null);

  const monthChange = pctChange(current, previous);
  const predDiff = hasPred ? pctChange(current, predTotal) : null;

  // sparkline últimos 12 meses
  const last12 = periods.slice(-12).map((p) => ({
    period: p,
    value: totals.get(p) ?? 0,
  }));

  return (
    <div className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden">
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ background: meta.color }}
      />
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-muted-foreground">
          {meta.label}
        </span>
        <span className="text-xs text-muted-foreground">{meta.unit}</span>
      </div>
      <div className="font-display text-3xl font-semibold mb-1 tabular-nums">
        {formatNumber(current)}
      </div>
      <div className="flex items-center gap-2 text-xs">
        <ChangePill value={monthChange} label="vs previous month" />
      </div>
      <div className="h-12 mt-3 -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={last12}>
            <Line
              type="monotone"
              dataKey="value"
              stroke={meta.color}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {hasPred && (
        <div className="border-t border-border mt-3 pt-3 flex items-baseline justify-between">
          <span className="text-xs text-muted-foreground">Forecast</span>
          <span className="font-display text-lg font-semibold tabular-nums" style={{ color: meta.color }}>
            {formatNumber(predTotal)}
          </span>
        </div>
      )}
    </div>
  );
}



function ChangePill({
  value,
  label,
  invert = false,
}: {
  value: number | null;
  label: string;
  invert?: boolean;
}) {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  const positive = value > 0;
  const isGood = invert ? !positive : positive;
  const Icon = positive ? ArrowUp : value < 0 ? ArrowDown : Minus;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full",
        isGood ? "bg-positive/10 text-positive" : "bg-negative/10 text-negative",
      )}
      title={label}
    >
      <Icon className="h-3 w-3" />
      {value > 0 ? "+" : ""}
      {value.toFixed(1)}%
    </span>
  );
}

function PlantStackedChart({
  plants,
  readings,
  period,
}: {
  plants: ReturnType<typeof useDashboardData>["plants"];
  readings: ReturnType<typeof useDashboardData>["readings"];
  period: string;
}) {
  const data = ENERGIES.map((e) => {
    const row: Record<string, string | number> = { energy: ENERGY_META[e].label };
    for (const p of plants) {
      const r = readings.find((x) => x.period === period && x.plant_id === p.id);
      row[p.name] = (r?.[e] as number | null) ?? 0;
    }
    return row;
  });

  const palette = [
    "var(--color-water)",
    "var(--color-gas)",
    "var(--color-electricity)",
    "oklch(0.6 0.15 340)",
  ];

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="energy" stroke="var(--color-muted-foreground)" fontSize={12} />
          <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickFormatter={(v) => formatNumber(v)} />
          <Tooltip
            contentStyle={{
              background: "var(--color-popover)",
              border: "1px solid var(--color-border)",
              borderRadius: 12,
              fontSize: 12,
            }}
            formatter={(v) => formatNumber(Number(v))}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {plants.map((p, i) => (
            <Bar key={p.id} dataKey={p.name} stackId="a" fill={palette[i % palette.length]} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ContributionTable({
  plants,
  readings,
  period,
}: {
  plants: ReturnType<typeof useDashboardData>["plants"];
  readings: ReturnType<typeof useDashboardData>["readings"];
  period: string;
}) {
  return (
    <div className="overflow-x-auto -mx-2">
      <table className="w-full text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr>
            <th className="text-left font-medium px-2 py-2">Plant</th>
            {ENERGIES.map((e) => (
              <th key={e} className="text-right font-medium px-2 py-2">
                {ENERGY_META[e].label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {plants.map((p) => {
            const r = readings.find((x) => x.period === period && x.plant_id === p.id);
            return (
              <tr key={p.id} className="border-t border-border">
                <td className="px-2 py-2 font-medium">
                  <Link
                    to="/planta/$plantId"
                    params={{ plantId: p.id }}
                    className="hover:underline"
                  >
                    {p.name}
                  </Link>
                </td>
                {ENERGIES.map((e) => {
                  const total = readings
                    .filter((x) => x.period === period)
                    .reduce((acc, x) => acc + ((x[e] as number | null) ?? 0), 0);
                  const v = (r?.[e] as number | null) ?? 0;
                  const pct = total > 0 ? (v / total) * 100 : 0;
                  return (
                    <td key={e} className="px-2 py-2 text-right tabular-nums">
                      <div>{formatNumber(v)}</div>
                      <div className="text-xs text-muted-foreground">{pct.toFixed(1)}%</div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CostSummary({
  readings,
  costs,
  currentPeriod,
  prevPeriod,
  plants,
}: {
  readings: ReturnType<typeof useDashboardData>["readings"];
  costs: UnitCost[];
  currentPeriod: string;
  prevPeriod: string | null;
  plants: ReturnType<typeof useDashboardData>["plants"];
}) {
  const currency = costs[0]?.currency ?? "MXN";

  const energyTotals = ENERGIES.map((e) => {
    const total = sumByPeriod(readings, e).get(currentPeriod) ?? 0;
    const prev = prevPeriod ? sumByPeriod(readings, e).get(prevPeriod) ?? null : null;
    const rate = costForPeriod(costs, e, currentPeriod);
    const rateP = prevPeriod ? costForPeriod(costs, e, prevPeriod) : null;
    const cost = rate != null ? total * rate : null;
    const prevCost = prev != null && rateP != null ? prev * rateP : null;
    const predTotal = readings
      .filter((r) => r.period === currentPeriod)
      .reduce((acc, r) => acc + ((r[ENERGY_META[e].predKey] as number | null) ?? 0), 0);
    const hasPred = readings.filter((r) => r.period === currentPeriod).some((r) => r[ENERGY_META[e].predKey] != null);
    const predCost = rate != null && hasPred ? predTotal * rate : null;
    return { energy: e, cost, prevCost, predCost, rate };
  });

  const totalReal = energyTotals.reduce((a, x) => a + (x.cost ?? 0), 0);
  const totalPrev = energyTotals.reduce((a, x) => a + (x.prevCost ?? 0), 0);
  const totalPred = energyTotals.reduce((a, x) => a + (x.predCost ?? 0), 0);
  const monthChange = pctChange(totalReal, totalPrev || null);

  // costo por planta
  const plantRows = plants.map((p) => {
    const r = readings.find((x) => x.period === currentPeriod && x.plant_id === p.id);
    let real = 0, pred = 0, hasPred = false;
    for (const e of ENERGIES) {
      const rate = costForPeriod(costs, e, currentPeriod) ?? 0;
      real += ((r?.[e] as number | null) ?? 0) * rate;
      const pv = r?.[ENERGY_META[e].predKey] as number | null;
      if (pv != null) { pred += pv * rate; hasPred = true; }
    }
    return { plant: p, real, pred, hasPred };
  });

  return (
    <div className="mb-8">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="font-display text-lg font-semibold">Cost of the month</h2>
        <Link to="/costos" className="text-xs text-muted-foreground hover:text-foreground">
          Edit rates →
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-card border border-border rounded-2xl p-5 md:col-span-1">
          <div className="text-sm text-muted-foreground mb-1">Complex total</div>
          <div className="font-display text-3xl font-semibold tabular-nums">{formatCurrency(totalReal, currency)}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {monthChange != null ? (
              <span className={cn(monthChange > 0 ? "text-negative" : "text-positive")}>
                {monthChange > 0 ? "+" : ""}{monthChange.toFixed(1)}% vs previous month
              </span>
            ) : "—"}
          </div>
          {totalPred > 0 && (
            <div className="text-xs text-muted-foreground mt-1">
              Forecast: <span className="text-foreground">{formatCurrency(totalPred, currency)}</span>
            </div>
          )}
        </div>
        {energyTotals.map(({ energy, cost, predCost, rate }) => {
          const meta = ENERGY_META[energy];
          return (
            <div key={energy} className="bg-card border border-border rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1" style={{ background: meta.color }} />
              <div className="text-sm text-muted-foreground mb-1">{meta.label}</div>
              <div className="font-display text-2xl font-semibold tabular-nums">{formatCurrency(cost, currency)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {rate != null ? `${formatCurrency(rate, currency)} / ${meta.unit}` : "no rate"}
              </div>
              {predCost != null && (
                <div className="text-xs text-muted-foreground mt-1">
                  Forecast: <span className="text-foreground">{formatCurrency(predCost, currency)}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="font-display text-base font-semibold mb-3">Spend contribution per plant</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="text-left px-2 py-2 font-medium">Plant</th>
                <th className="text-right px-2 py-2 font-medium">Actual cost</th>
                <th className="text-right px-2 py-2 font-medium">% of total</th>
                <th className="text-right px-2 py-2 font-medium">Forecast cost</th>
              </tr>
            </thead>
            <tbody>
              {plantRows.map(({ plant, real, pred, hasPred }) => (
                <tr key={plant.id} className="border-t border-border">
                  <td className="px-2 py-2 font-medium">
                    <Link to="/planta/$plantId" params={{ plantId: plant.id }} className="hover:underline">{plant.name}</Link>
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">{formatCurrency(real, currency)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {totalReal > 0 ? ((real / totalReal) * 100).toFixed(1) + "%" : "—"}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">{hasPred ? formatCurrency(pred, currency) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
