import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, Trash2, Sparkles, Undo2 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import {
  PageContainer,
  PageHeader,
  useDashboardData,
} from "@/components/dashboard/shared";
import { supabase } from "@/integrations/supabase/client";
import {
  ENERGIES,
  ENERGY_META,
  costForPeriod,
  currencyOf,
  formatCurrency,
  formatNumber,
  formatPeriodLong,
  type Energy,
  type Plant,
  type Reading,
  type UnitCost,
} from "@/lib/dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/datos")({
  head: () => ({
    meta: [
      { title: "Data — EnergyOps" },
      { name: "description", content: "Enter monthly consumption and generate forecasts." },
    ],
  }),
  component: DataPage,
});

function DataPage() {
  const { plants, readings, costs } = useDashboardData();
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["readings"] });

  const recent = useMemo(
    () => [...readings].sort((a, b) => b.period.localeCompare(a.period)).slice(0, 20),
    [readings],
  );

  return (
    <AppShell>
      <PageContainer>
        <PageHeader
          title="Data entry"
          subtitle="Fill in monthly consumption per plant and generate forecasts."
        />

        <Tabs defaultValue="manual">
          <TabsList className="mb-6">
            <TabsTrigger value="manual">Manual entry</TabsTrigger>
            <TabsTrigger value="predict">Forecast</TabsTrigger>
          </TabsList>
          <TabsContent value="manual">
            <ManualForm plants={plants} onSaved={invalidate} />
          </TabsContent>
          <TabsContent value="predict">
            <PredictPanel plants={plants} readings={readings} costs={costs} onSaved={invalidate} />
          </TabsContent>
        </Tabs>


        <div className="bg-card border border-border rounded-2xl p-6 mt-8">
          <h2 className="font-display text-lg font-semibold mb-4">Recent records</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="text-left px-2 py-2 font-medium">Month</th>
                  <th className="text-left px-2 py-2 font-medium">Plant</th>
                  {ENERGIES.map((e) => (
                    <th key={e} className="text-right px-2 py-2 font-medium">{ENERGY_META[e].label}</th>
                  ))}
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => {
                  const plant = plants.find((p) => p.id === r.plant_id);
                  return (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-2 py-2">{formatPeriodLong(r.period)}</td>
                      <td className="px-2 py-2 font-medium">{plant?.name ?? "—"}</td>
                      {ENERGIES.map((e) => (
                        <td key={e} className="px-2 py-2 text-right tabular-nums">
                          {formatNumber(r[e] as number | null)}
                        </td>
                      ))}
                      <td className="px-2 py-2 text-right">
                        <button
                          aria-label="Delete"
                          className="text-muted-foreground hover:text-negative"
                          onClick={async () => {
                            if (!confirm("Delete this record?")) return;
                            const { error } = await supabase.from("energy_readings").delete().eq("id", r.id);
                            if (error) toast.error(error.message);
                            else {
                              toast.success("Record deleted");
                              qc.invalidateQueries({ queryKey: ["readings"] });
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </PageContainer>
    </AppShell>
  );
}

function currentMonthInput(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function ManualForm({ plants, onSaved }: { plants: ReturnType<typeof useDashboardData>["plants"]; onSaved: () => void }) {
  const [plantId, setPlantId] = useState<string>("");
  const [month, setMonth] = useState<string>(currentMonthInput());
  const [values, setValues] = useState({
    water: "",
    gas: "",
    electricity: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plantId) return toast.error("Select a plant");
    setSaving(true);
    const period = `${month}-01`;
    const num = (s: string) => (s.trim() === "" ? null : Number(s));
    const payload = {
      plant_id: plantId,
      period,
      water: num(values.water),
      gas: num(values.gas),
      electricity: num(values.electricity),
    };
    const { error } = await supabase
      .from("energy_readings")
      .upsert(payload, { onConflict: "plant_id,period" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Record saved");
    setValues({ water: "", gas: "", electricity: "" });
    onSaved();
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 grid gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="mb-2 block">Plant</Label>
          <Select value={plantId} onValueChange={setPlantId}>
            <SelectTrigger><SelectValue placeholder="Select plant" /></SelectTrigger>
            <SelectContent>
              {plants.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-2 block">Month</Label>
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} required />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ENERGIES.map((e) => (
          <div key={e}>
            <Label className="mb-2 block">{ENERGY_META[e].label} ({ENERGY_META[e].unit})</Label>
            <Input
              type="number"
              step="any"
              inputMode="decimal"
              placeholder="0"
              value={(values as any)[e]}
              onChange={(ev) => setValues((v) => ({ ...v, [e]: ev.target.value }))}
            />
          </div>
        ))}
      </div>




      <div>
        <Button type="submit" disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save record"}
        </Button>
      </div>
    </form>
  );
}




// ============================================================
// Prediction panel
// ============================================================

function nextMonthISO(period: string): string {
  // period = YYYY-MM-DD (1st of month). Return next-month 1st.
  const [y, m] = period.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  d.setUTCMonth(d.getUTCMonth() + 1);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

/** Linear-trend forecast on the last `window` numeric points. Falls back to mean. */
function forecastNext(values: number[]): number | null {
  const xs: number[] = [];
  const ys: number[] = [];
  values.forEach((v, i) => {
    if (v != null && !isNaN(v)) {
      xs.push(i);
      ys.push(v);
    }
  });
  if (ys.length === 0) return null;
  if (ys.length === 1) return ys[0];
  const n = ys.length;
  const sx = xs.reduce((a, b) => a + b, 0);
  const sy = ys.reduce((a, b) => a + b, 0);
  const sxy = xs.reduce((a, x, i) => a + x * ys[i], 0);
  const sxx = xs.reduce((a, x) => a + x * x, 0);
  const denom = n * sxx - sx * sx;
  const meanY = sy / n;
  if (denom === 0) return meanY;
  const slope = (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;
  const next = intercept + slope * values.length; // forecast index = last index + 1
  return Math.max(0, next);
}

type Forecast = {
  plantId: string;
  plantName: string;
  values: Record<Energy, number | null>;
  costs: Record<Energy, number | null>;
};

function PredictPanel({
  plants,
  readings,
  costs,
  onSaved,
}: {
  plants: Plant[];
  readings: Reading[];
  costs: UnitCost[];
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  const { targetPeriod, forecasts, hasData } = useMemo(() => {
    const periods = [...new Set(readings.map((r) => r.period))].sort();
    const last = periods[periods.length - 1];
    if (!last) return { targetPeriod: null as string | null, forecasts: [] as Forecast[], hasData: false };
    const target = nextMonthISO(last);
    const out: Forecast[] = plants.map((p) => {
      const series = readings
        .filter((r) => r.plant_id === p.id)
        .sort((a, b) => a.period.localeCompare(b.period));
      const values: Record<Energy, number | null> = { water: null, gas: null, electricity: null };
      const costsMap: Record<Energy, number | null> = { water: null, gas: null, electricity: null };
      for (const e of ENERGIES) {
        const arr = series.map((r) => r[e] as number | null).filter((v): v is number => v != null);
        const v = forecastNext(arr);
        values[e] = v;
        const rate = costForPeriod(costs, e, target);
        costsMap[e] = v != null && rate != null ? v * rate : null;
      }
      return { plantId: p.id, plantName: p.name, values, costs: costsMap };
    });
    return { targetPeriod: target, forecasts: out, hasData: true };
  }, [plants, readings, costs]);

  const totalsByEnergy = useMemo(() => {
    const t: Record<Energy, { v: number; c: number }> = {
      water: { v: 0, c: 0 },
      gas: { v: 0, c: 0 },
      electricity: { v: 0, c: 0 },
    };
    for (const f of forecasts) {
      for (const e of ENERGIES) {
        if (f.values[e] != null) t[e].v += f.values[e]!;
        if (f.costs[e] != null) t[e].c += f.costs[e]!;
      }
    }
    return t;
  }, [forecasts]);

  const currency = currencyOf(costs);

  const savePredictions = async () => {
    if (!targetPeriod) return;
    setSaving(true);
    // upsert pred values; preserve real values if row exists by selecting first
    const { data: existing } = await supabase
      .from("energy_readings")
      .select("id, plant_id, water, gas, electricity")
      .eq("period", targetPeriod);
    const map = new Map((existing ?? []).map((r) => [r.plant_id, r]));
    const payload = forecasts.map((f) => {
      const row = map.get(f.plantId);
      return {
        plant_id: f.plantId,
        period: targetPeriod,
        water: row?.water ?? null,
        gas: row?.gas ?? null,
        electricity: row?.electricity ?? null,
        water_pred: f.values.water,
        gas_pred: f.values.gas,
        electricity_pred: f.values.electricity,
      };
    });
    const { error } = await supabase
      .from("energy_readings")
      .upsert(payload, { onConflict: "plant_id,period" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(`Forecasts saved for ${formatPeriodLong(targetPeriod)}`);
    onSaved();
  };

  const deleteLastPredictions = async () => {
    // Find latest period that contains any *_pred values
    const periodsWithPred = [
      ...new Set(
        readings
          .filter((r) => r.water_pred != null || r.gas_pred != null || r.electricity_pred != null)
          .map((r) => r.period),
      ),
    ].sort();
    const last = periodsWithPred[periodsWithPred.length - 1];
    if (!last) return toast.error("No forecasts on record");
    if (!confirm(`Delete forecasts for ${formatPeriodLong(last)}?`)) return;
    setRemoving(true);
    const rows = readings.filter((r) => r.period === last);
    // For rows with no real data, delete entirely; else null out preds
    const toDelete = rows.filter((r) => r.water == null && r.gas == null && r.electricity == null).map((r) => r.id);
    const toNull = rows.filter((r) => !toDelete.includes(r.id)).map((r) => r.id);
    if (toDelete.length) {
      const { error } = await supabase.from("energy_readings").delete().in("id", toDelete);
      if (error) {
        setRemoving(false);
        return toast.error(error.message);
      }
    }
    if (toNull.length) {
      const { error } = await supabase
        .from("energy_readings")
        .update({ water_pred: null, gas_pred: null, electricity_pred: null })
        .in("id", toNull);
      if (error) {
        setRemoving(false);
        return toast.error(error.message);
      }
    }
    setRemoving(false);
    toast.success(`Forecasts for ${formatPeriodLong(last)} deleted`);
    onSaved();
  };

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold">Base forecast (linear trend)</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {hasData && targetPeriod
                ? <>Forecast for <span className="font-medium text-foreground">{formatPeriodLong(targetPeriod)}</span> — monthly horizon (next month only).</>
                : "Not enough historical data to forecast yet."}
            </p>
          </div>
          <div className="flex items-end gap-3">
            <Button onClick={savePredictions} disabled={!hasData || saving}>
              <Sparkles className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Forecast and save"}
            </Button>
            <Button variant="outline" onClick={deleteLastPredictions} disabled={removing}>
              <Undo2 className="h-4 w-4 mr-2" />
              {removing ? "Removing..." : "Remove last"}
            </Button>
          </div>
        </div>
      </div>

      {hasData && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ENERGIES.map((e) => (
              <div key={e} className="bg-card border border-border rounded-2xl p-5">
                <div className="text-xs text-muted-foreground">{ENERGY_META[e].label} forecast</div>
                <div className="font-display text-2xl font-semibold mt-1 tabular-nums">
                  {formatNumber(totalsByEnergy[e].v)} <span className="text-sm text-muted-foreground font-normal">{ENERGY_META[e].unit}</span>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Estimated cost: <span className="text-foreground font-medium">{formatCurrency(totalsByEnergy[e].c, currency)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="font-display text-base font-semibold mb-4">Forecast per plant</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={forecasts.map((f) => ({ name: f.plantName, ...f.values }))}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  {ENERGIES.map((e) => (
                    <Bar key={e} dataKey={e} name={ENERGY_META[e].label} fill={ENERGY_META[e].color} radius={[4, 4, 0, 0]}>
                      {forecasts.map((_, i) => <Cell key={i} />)}
                    </Bar>
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 overflow-x-auto">
            <h3 className="font-display text-base font-semibold mb-4">Forecast detail and cost per plant</h3>
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="text-left px-2 py-2 font-medium">Plant</th>
                  {ENERGIES.map((e) => (
                    <th key={e} className="text-right px-2 py-2 font-medium">{ENERGY_META[e].label} ({ENERGY_META[e].unit})</th>
                  ))}
                  {ENERGIES.map((e) => (
                    <th key={`c-${e}`} className="text-right px-2 py-2 font-medium">{ENERGY_META[e].label} cost</th>
                  ))}
                  <th className="text-right px-2 py-2 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {forecasts.map((f) => {
                  const total = ENERGIES.reduce((s, e) => s + (f.costs[e] ?? 0), 0);
                  return (
                    <tr key={f.plantId} className="border-t border-border">
                      <td className="px-2 py-2 font-medium">{f.plantName}</td>
                      {ENERGIES.map((e) => (
                        <td key={e} className="px-2 py-2 text-right tabular-nums">{formatNumber(f.values[e])}</td>
                      ))}
                      {ENERGIES.map((e) => (
                        <td key={`c-${e}`} className="px-2 py-2 text-right tabular-nums">{formatCurrency(f.costs[e], currency)}</td>
                      ))}
                      <td className="px-2 py-2 text-right tabular-nums font-medium">{formatCurrency(total, currency)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ModelsCatalog plants={plants} readings={readings} />
        </>
      )}
    </div>
  );
}

// ============================================================
// Models catalog — equations + data dictionary
// ============================================================

function fitLinear(values: number[]): { a: number; b: number; n: number } | null {
  const xs: number[] = [];
  const ys: number[] = [];
  values.forEach((v, i) => {
    if (v != null && !isNaN(v)) {
      xs.push(i);
      ys.push(v);
    }
  });
  if (ys.length < 2) return null;
  const n = ys.length;
  const sx = xs.reduce((a, b) => a + b, 0);
  const sy = ys.reduce((a, b) => a + b, 0);
  const sxy = xs.reduce((a, x, i) => a + x * ys[i], 0);
  const sxx = xs.reduce((a, x) => a + x * x, 0);
  const denom = n * sxx - sx * sx;
  if (denom === 0) return { a: sy / n, b: 0, n };
  const b = (n * sxy - sx * sy) / denom;
  const a = (sy - b * sx) / n;
  return { a, b, n };
}

function fmtCoef(x: number): string {
  const abs = Math.abs(x);
  if (abs >= 1000) return x.toFixed(0);
  if (abs >= 1) return x.toFixed(2);
  return x.toFixed(4);
}

function ModelsCatalog({ plants, readings }: { plants: Plant[]; readings: Reading[] }) {
  const models = useMemo(() => {
    const out: { plantId: string; plantName: string; energy: Energy; fit: ReturnType<typeof fitLinear> }[] = [];
    for (const p of plants) {
      const series = readings
        .filter((r) => r.plant_id === p.id)
        .sort((a, b) => a.period.localeCompare(b.period));
      for (const e of ENERGIES) {
        const arr = series.map((r) => r[e] as number | null).filter((v): v is number => v != null);
        out.push({ plantId: p.id, plantName: p.name, energy: e, fit: fitLinear(arr) });
      }
    }
    return out;
  }, [plants, readings]);

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <h3 className="font-display text-base font-semibold">Models catalog</h3>
      <p className="text-sm text-muted-foreground mt-1">
        One simple linear regression per plant × energy. Forecast horizon: <span className="font-medium text-foreground">1 month</span>.
      </p>

      <div className="overflow-x-auto mt-4">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr>
              <th className="text-left px-2 py-2 font-medium">#</th>
              <th className="text-left px-2 py-2 font-medium">Plant</th>
              <th className="text-left px-2 py-2 font-medium">Energy</th>
              <th className="text-left px-2 py-2 font-medium">Type</th>
              <th className="text-left px-2 py-2 font-medium">Equation</th>
              <th className="text-right px-2 py-2 font-medium">Samples (n)</th>
            </tr>
          </thead>
          <tbody>
            {models.map((m, i) => (
              <tr key={`${m.plantId}-${m.energy}`} className="border-t border-border">
                <td className="px-2 py-2 tabular-nums text-muted-foreground">{i + 1}</td>
                <td className="px-2 py-2 font-medium">{m.plantName}</td>
                <td className="px-2 py-2">{ENERGY_META[m.energy].label} ({ENERGY_META[m.energy].unit})</td>
                <td className="px-2 py-2 text-muted-foreground">Linear regression</td>
                <td className="px-2 py-2 font-mono text-xs">
                  {m.fit
                    ? <>ŷ = {fmtCoef(m.fit.a)} {m.fit.b >= 0 ? "+" : "−"} {fmtCoef(Math.abs(m.fit.b))}·t</>
                    : <span className="text-muted-foreground">insufficient data</span>}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">{m.fit?.n ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6">
        <h4 className="font-display text-sm font-semibold mb-2">Data dictionary</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="text-left px-2 py-2 font-medium">Variable</th>
                <th className="text-left px-2 py-2 font-medium">Type</th>
                <th className="text-left px-2 py-2 font-medium">Unit</th>
                <th className="text-left px-2 py-2 font-medium">Meaning</th>
              </tr>
            </thead>
            <tbody>
              {[
                { v: "ŷ", t: "Output", u: "energy unit", m: "Forecasted consumption for the next month." },
                { v: "t", t: "Input", u: "month index (0…n−1)", m: "Ordinal position of each historical month, oldest = 0." },
                { v: "a", t: "Coefficient", u: "energy unit", m: "Intercept — baseline consumption when t = 0." },
                { v: "b", t: "Coefficient", u: "energy unit / month", m: "Slope — monthly change in consumption (trend)." },
                { v: "n", t: "Metadata", u: "count", m: "Number of historical monthly samples used to fit the model." },
                { v: "Electricity", t: "Series", u: "MWHr", m: "Monthly electrical energy consumption per plant." },
                { v: "NG", t: "Series", u: "MWHr", m: "Monthly natural gas energy consumption per plant." },
                { v: "Water", t: "Series", u: "M3", m: "Monthly water volume consumption per plant." },
              ].map((row) => (
                <tr key={row.v} className="border-t border-border">
                  <td className="px-2 py-2 font-mono text-xs">{row.v}</td>
                  <td className="px-2 py-2 text-muted-foreground">{row.t}</td>
                  <td className="px-2 py-2 text-muted-foreground">{row.u}</td>
                  <td className="px-2 py-2">{row.m}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
