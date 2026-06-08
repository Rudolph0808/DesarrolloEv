import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, FileText, Printer, Download } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageContainer, PageHeader, useDashboardData } from "@/components/dashboard/shared";
import { supabase } from "@/integrations/supabase/client";
import {
  ENERGIES,
  ENERGY_META,
  costForPeriod,
  formatCurrency,
  formatNumber,
  formatPeriodLong,
  pctChange,
  sumByPeriod,
  uniquePeriods,
  type Energy,
  type Plant,
  type Reading,
  type UnitCost,
} from "@/lib/dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";


export const Route = createFileRoute("/costos")({
  head: () => ({
    meta: [
      { title: "Costs — EnergyOps" },
      { name: "description", content: "Unit rates and monthly cost for the complex." },
    ],
  }),
  component: CostosPage,
});

function CostosPage() {
  const { plants, readings, costs } = useDashboardData();
  const qc = useQueryClient();
  const periods = useMemo(() => uniquePeriods(readings), [readings]);
  const lastPeriod = periods[periods.length - 1] ?? null;
  const currency = costs[0]?.currency ?? "MXN";

  return (
    <AppShell>
      <PageContainer>
        <PageHeader
          title="Costs and rates"
          subtitle="Define cost per unit for each energy. The most recent rate applies from its effective month."
          right={
            lastPeriod ? (
              <ReportDialog
                plants={plants}
                readings={readings}
                costs={costs}
                periods={periods}
              />
            ) : null
          }
        />


        {lastPeriod && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {ENERGIES.map((e) => {
              const total = sumByPeriod(readings, e).get(lastPeriod) ?? 0;
              const rate = costForPeriod(costs, e, lastPeriod);
              const cost = rate != null ? total * rate : null;
              const predTotal = readings
                .filter((r) => r.period === lastPeriod)
                .reduce((acc, r) => acc + ((r[ENERGY_META[e].predKey] as number | null) ?? 0), 0);
              const predCost = rate != null ? predTotal * rate : null;
              return (
                <div key={e} className="bg-card border border-border rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">{ENERGY_META[e].label}</span>
                    <span className="text-xs text-muted-foreground">
                      {rate != null ? `${formatCurrency(rate, currency)} / ${ENERGY_META[e].unit}` : "no rate"}
                    </span>
                  </div>
                  <div className="font-display text-2xl font-semibold tabular-nums">
                    {formatCurrency(cost, currency)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Usage {formatNumber(total)} {ENERGY_META[e].unit} · Forecast {formatCurrency(predCost, currency)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6">


          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="font-display text-lg font-semibold mb-4">Active rates</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left px-2 py-2 font-medium">Energy</th>
                    <th className="text-right px-2 py-2 font-medium">Cost</th>
                    <th className="text-left px-2 py-2 font-medium">Effective from</th>
                    <th className="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {[...costs].sort((a,b) => b.effective_from.localeCompare(a.effective_from)).map((c) => (
                    <tr key={c.id} className="border-t border-border">
                      <td className="px-2 py-2">{ENERGY_META[c.energy as Energy].label}</td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {formatCurrency(c.cost_per_unit, c.currency)} / {ENERGY_META[c.energy as Energy].unit}
                      </td>
                      <td className="px-2 py-2">{formatPeriodLong(c.effective_from)}</td>
                      <td className="px-2 py-2 text-right">
                        <button
                          aria-label="Delete"
                          className="text-muted-foreground hover:text-negative"
                          onClick={async () => {
                            if (!confirm("Delete this rate?")) return;
                            const { error } = await supabase.from("unit_costs").delete().eq("id", c.id);
                            if (error) toast.error(error.message);
                            else { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["unit_costs"] }); }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {costs.length === 0 && (
                    <tr><td colSpan={4} className="text-center text-muted-foreground py-6">No rates yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {plants.length > 0 && lastPeriod && (
          <div className="bg-card border border-border rounded-2xl p-6 mt-6">
            <h2 className="font-display text-lg font-semibold mb-1">Cost per plant · {formatPeriodLong(lastPeriod)}</h2>
            <p className="text-xs text-muted-foreground mb-4">Share of total complex spend (actual and forecast).</p>
            <PlantCostTable />
          </div>
        )}
      </PageContainer>
    </AppShell>
  );
}

function PlantCostTable() {
  const { plants, readings, costs } = useDashboardData();
  const periods = uniquePeriods(readings);
  const lastPeriod = periods[periods.length - 1];
  const currency = costs[0]?.currency ?? "MXN";

  const rows = plants.map((p) => {
    const r = readings.find((x) => x.period === lastPeriod && x.plant_id === p.id);
    let real = 0, pred = 0, hasPred = false;
    for (const e of ENERGIES) {
      const rate = costForPeriod(costs, e, lastPeriod) ?? 0;
      real += ((r?.[e] as number | null) ?? 0) * rate;
      const pv = r?.[ENERGY_META[e].predKey] as number | null;
      if (pv != null) { pred += pv * rate; hasPred = true; }
    }
    return { plant: p, real, pred, hasPred };
  });
  const totalReal = rows.reduce((a, r) => a + r.real, 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr>
            <th className="text-left px-2 py-2 font-medium">Plant</th>
            <th className="text-right px-2 py-2 font-medium">Actual cost</th>
            <th className="text-right px-2 py-2 font-medium">Share %</th>
            <th className="text-right px-2 py-2 font-medium">Forecast cost</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ plant, real, pred, hasPred }) => (
            <tr key={plant.id} className="border-t border-border">
              <td className="px-2 py-2 font-medium">{plant.name}</td>
              <td className="px-2 py-2 text-right tabular-nums">{formatCurrency(real, currency)}</td>
              <td className="px-2 py-2 text-right tabular-nums">
                {totalReal > 0 ? ((real / totalReal) * 100).toFixed(1) + "%" : "—"}
              </td>
              <td className="px-2 py-2 text-right tabular-nums">{hasPred ? formatCurrency(pred, currency) : "—"}</td>
            </tr>
          ))}
          <tr className="border-t-2 border-border font-semibold">
            <td className="px-2 py-2">Complex total</td>
            <td className="px-2 py-2 text-right tabular-nums">{formatCurrency(totalReal, currency)}</td>
            <td className="px-2 py-2 text-right tabular-nums">100%</td>
            <td className="px-2 py-2 text-right tabular-nums">
              {formatCurrency(rows.reduce((a, r) => a + r.pred, 0), currency)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}



// ============================================================
// Finance report — minimal, printable, exportable
// ============================================================

function ReportDialog({
  plants,
  readings,
  costs,
  periods,
}: {
  plants: Plant[];
  readings: Reading[];
  costs: UnitCost[];
  periods: string[];
}) {
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState(periods[periods.length - 1] ?? "");
  const currency = costs[0]?.currency ?? "MXN";

  const report = useMemo(() => {
    const rows = plants.map((p) => {
      const r = readings.find((x) => x.period === period && x.plant_id === p.id);
      const energies = ENERGIES.map((e) => {
        const usage = (r?.[e] as number | null) ?? 0;
        const pred = (r?.[ENERGY_META[e].predKey] as number | null) ?? null;
        const rate = costForPeriod(costs, e, period) ?? 0;
        return { energy: e, usage, pred, rate, cost: usage * rate, predCost: pred != null ? pred * rate : null };
      });
      const totalCost = energies.reduce((a, x) => a + x.cost, 0);
      const totalPred = energies.reduce((a, x) => a + (x.predCost ?? 0), 0);
      return { plant: p, energies, totalCost, totalPred };
    });
    const totalCost = rows.reduce((a, r) => a + r.totalCost, 0);
    const totalPred = rows.reduce((a, r) => a + r.totalPred, 0);

    const prevIdx = periods.indexOf(period) - 1;
    const prevPeriod = prevIdx >= 0 ? periods[prevIdx] : null;
    let prevTotal = 0;
    if (prevPeriod) {
      for (const p of plants) {
        const r = readings.find((x) => x.period === prevPeriod && x.plant_id === p.id);
        for (const e of ENERGIES) {
          const rate = costForPeriod(costs, e, prevPeriod) ?? 0;
          prevTotal += ((r?.[e] as number | null) ?? 0) * rate;
        }
      }
    }
    const change = pctChange(totalCost, prevTotal || null);
    return { rows, totalCost, totalPred, change, prevPeriod };
  }, [plants, readings, costs, period, periods]);

  const downloadCsv = () => {
    const lines: string[] = [];
    lines.push(`Finance report,${formatPeriodLong(period)}`);
    lines.push("");
    lines.push("Plant,Energy,Usage,Unit,Rate,Cost,Forecast cost");
    for (const row of report.rows) {
      for (const e of row.energies) {
        lines.push([
          row.plant.name,
          ENERGY_META[e.energy].label,
          e.usage,
          ENERGY_META[e.energy].unit,
          e.rate,
          e.cost.toFixed(2),
          e.predCost != null ? e.predCost.toFixed(2) : "",
        ].join(","));
      }
      lines.push([row.plant.name, "TOTAL", "", "", "", row.totalCost.toFixed(2), row.totalPred.toFixed(2)].join(","));
    }
    lines.push("");
    lines.push(`Complex total,,,,,${report.totalCost.toFixed(2)},${report.totalPred.toFixed(2)}`);
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finance-report-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileText className="h-4 w-4 mr-2" /> Generate report
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Finance report</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between gap-4 print:hidden">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[...periods].reverse().map((p) => (
                <SelectItem key={p} value={p}>{formatPeriodLong(p)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={downloadCsv}>
              <Download className="h-4 w-4 mr-2" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" /> Print
            </Button>
          </div>
        </div>

        <div id="report-body" className="space-y-6 mt-2">
          <div className="border-b border-border pb-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Reporting period</div>
            <div className="font-display text-2xl font-semibold">{formatPeriodLong(period)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Generated {new Date().toLocaleDateString("en-US", { dateStyle: "long" })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-border rounded-xl p-4">
              <div className="text-xs text-muted-foreground">Actual spend</div>
              <div className="font-display text-2xl font-semibold tabular-nums mt-1">
                {formatCurrency(report.totalCost, currency)}
              </div>
              {report.change != null && (
                <div className={`text-xs mt-1 ${report.change > 0 ? "text-negative" : "text-positive"}`}>
                  {report.change > 0 ? "+" : ""}{report.change.toFixed(1)}% vs previous month
                </div>
              )}
            </div>
            <div className="border border-border rounded-xl p-4">
              <div className="text-xs text-muted-foreground">Forecast spend</div>
              <div className="font-display text-2xl font-semibold tabular-nums mt-1">
                {report.totalPred > 0 ? formatCurrency(report.totalPred, currency) : "—"}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Sum of plant forecasts</div>
            </div>
            <div className="border border-border rounded-xl p-4">
              <div className="text-xs text-muted-foreground">Variance</div>
              <div className="font-display text-2xl font-semibold tabular-nums mt-1">
                {report.totalPred > 0 ? formatCurrency(report.totalCost - report.totalPred, currency) : "—"}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Actual − forecast</div>
            </div>
          </div>

          <div>
            <h3 className="font-display text-base font-semibold mb-3">Breakdown per plant</h3>
            <div className="space-y-5">
              {report.rows.map(({ plant, energies, totalCost, totalPred }) => (
                <div key={plant.id} className="border border-border rounded-xl overflow-hidden">
                  <div className="flex items-baseline justify-between px-4 py-3 bg-muted/40">
                    <div className="font-medium">{plant.name}</div>
                    <div className="text-sm tabular-nums">{formatCurrency(totalCost, currency)}</div>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="text-xs text-muted-foreground">
                      <tr>
                        <th className="text-left px-4 py-2 font-medium">Energy</th>
                        <th className="text-right px-4 py-2 font-medium">Usage</th>
                        <th className="text-right px-4 py-2 font-medium">Rate</th>
                        <th className="text-right px-4 py-2 font-medium">Cost</th>
                        <th className="text-right px-4 py-2 font-medium">Forecast</th>
                      </tr>
                    </thead>
                    <tbody>
                      {energies.map((e) => (
                        <tr key={e.energy} className="border-t border-border">
                          <td className="px-4 py-2">{ENERGY_META[e.energy].label}</td>
                          <td className="px-4 py-2 text-right tabular-nums">
                            {formatNumber(e.usage)} {ENERGY_META[e.energy].unit}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                            {formatCurrency(e.rate, currency)}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(e.cost, currency)}</td>
                          <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                            {e.predCost != null ? formatCurrency(e.predCost, currency) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t-2 border-border pt-4 flex items-baseline justify-between">
            <div className="font-display text-base font-semibold">Complex total</div>
            <div className="text-right">
              <div className="font-display text-xl font-semibold tabular-nums">
                {formatCurrency(report.totalCost, currency)}
              </div>
              {report.totalPred > 0 && (
                <div className="text-xs text-muted-foreground">
                  Forecast {formatCurrency(report.totalPred, currency)}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

