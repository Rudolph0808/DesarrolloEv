import { supabase } from "@/integrations/supabase/client";

export type Plant = {
  id: string;
  name: string;
  location: string | null;
  sort_order: number;
};

export type Reading = {
  id: string;
  plant_id: string;
  period: string; // YYYY-MM-DD (1st of month)
  water: number | null;
  gas: number | null;
  electricity: number | null;
  water_pred: number | null;
  gas_pred: number | null;
  electricity_pred: number | null;
};

export const ENERGIES = ["water", "gas", "electricity"] as const;
export type Energy = (typeof ENERGIES)[number];

export const ENERGY_META: Record<
  Energy,
  { label: string; unit: string; color: string; soft: string; predKey: keyof Reading }
> = {
  water: { label: "Water", unit: "M3", color: "var(--color-water)", soft: "var(--color-water-soft)", predKey: "water_pred" },
  gas: { label: "NG", unit: "MWHr", color: "var(--color-gas)", soft: "var(--color-gas-soft)", predKey: "gas_pred" },
  electricity: { label: "Electricity", unit: "MWHr", color: "var(--color-electricity)", soft: "var(--color-electricity-soft)", predKey: "electricity_pred" },
};

export type UnitCost = {
  id: string;
  energy: Energy;
  cost_per_unit: number;
  currency: string;
  effective_from: string;
  notes: string | null;
};

export async function fetchUnitCosts(): Promise<UnitCost[]> {
  const { data, error } = await supabase
    .from("unit_costs")
    .select("*")
    .order("effective_from", { ascending: true });
  if (error) throw error;
  return (data ?? []) as UnitCost[];
}

/** Cost per unit applicable for an energy at a given period (latest effective_from <= period). */
export function costForPeriod(costs: UnitCost[], energy: Energy, period: string): number | null {
  const applicable = costs
    .filter((c) => c.energy === energy && c.effective_from <= period)
    .sort((a, b) => b.effective_from.localeCompare(a.effective_from));
  return applicable[0]?.cost_per_unit ?? null;
}

export function currencyOf(costs: UnitCost[]): string {
  return costs[0]?.currency ?? "MXN";
}

export function formatCurrency(n: number | null | undefined, currency = "MXN"): string {
  if (n == null || isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}

export async function fetchPlants(): Promise<Plant[]> {
  const { data, error } = await supabase.from("plants").select("*").order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function fetchReadings(): Promise<Reading[]> {
  const { data, error } = await supabase
    .from("energy_readings")
    .select("*")
    .order("period", { ascending: true })
    .limit(5000);
  if (error) throw error;
  return (data ?? []) as Reading[];
}

export function periodKey(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function formatPeriod(d: string): string {
  const date = new Date(d);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

export function formatPeriodLong(d: string): string {
  const date = new Date(d);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

export function formatNumber(n: number | null | undefined, digits = 0): string {
  if (n == null || isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n);
}

export function pctChange(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export function uniquePeriods(readings: Reading[]): string[] {
  const set = new Set(readings.map((r) => r.period));
  return [...set].sort();
}

export function sumByPeriod(readings: Reading[], energy: Energy): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of readings) {
    const v = r[energy] as number | null;
    if (v == null) continue;
    map.set(r.period, (map.get(r.period) ?? 0) + v);
  }
  return map;
}
