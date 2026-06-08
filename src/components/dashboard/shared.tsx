import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchPlants, fetchReadings, fetchUnitCosts, type Plant, type Reading, type UnitCost } from "@/lib/dashboard";

export function useDashboardData() {
  const plants = useQuery<Plant[]>({ queryKey: ["plants"], queryFn: fetchPlants });
  const readings = useQuery<Reading[]>({ queryKey: ["readings"], queryFn: fetchReadings });
  const costs = useQuery<UnitCost[]>({ queryKey: ["unit_costs"], queryFn: fetchUnitCosts });
  return {
    plants: plants.data ?? [],
    readings: readings.data ?? [],
    costs: costs.data ?? [],
    isLoading: plants.isLoading || readings.isLoading || costs.isLoading,
    error: plants.error || readings.error || costs.error,
  };
}

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
      <div>
        <h1 className="font-display text-3xl font-semibold">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function PageContainer({ children }: { children: React.ReactNode }) {
  return <div className="px-4 md:px-8 py-6 md:py-10 max-w-[1400px] mx-auto">{children}</div>;
}
